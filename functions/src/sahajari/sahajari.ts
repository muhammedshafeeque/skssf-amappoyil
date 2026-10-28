import { AggregateField, FieldValue } from 'firebase-admin/firestore';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import {
  COL,
  PUBLIC_PATIENT_STATUSES,
  STAFF_ROLES,
  issueEquipmentSchema,
  returnEquipmentSchema,
} from '../shared';
import type { Assignment, Donation, Equipment, Patient } from '../shared';
import { db } from '../lib/firebase';
import { parse, requireRole } from '../lib/guards';
import { updated } from '../lib/stamp';

/** Keeps patientsPublic/{id} — the only patient data members can read — in step with patients. */
export const onPatientWritten = onDocumentWritten(`${COL.patients}/{patientId}`, async (event) => {
  const ref = db.collection(COL.patientsPublic).doc(event.params.patientId);
  const after = event.data?.after.exists ? (event.data.after.data() as Patient) : null;
  if (!after || !PUBLIC_PATIENT_STATUSES.includes(after.status)) {
    await ref.delete();
    return;
  }
  await ref.set({
    name: after.name,
    need: after.need,
    category: after.category,
    status: after.status,
    updatedAt: FieldValue.serverTimestamp(),
  });
});

async function recomputeTotals(patientId: string) {
  const patientRef = db.collection(COL.patients).doc(patientId);
  if (!(await patientRef.get()).exists) return;
  const sum = async (direction: 'in' | 'out') => {
    const agg = await db
      .collection(COL.donations)
      .where('patientId', '==', patientId)
      .where('direction', '==', direction)
      .aggregate({ total: AggregateField.sum('amount') })
      .get();
    return agg.data().total ?? 0;
  };
  const [received, given] = await Promise.all([sum('in'), sum('out')]);
  await patientRef.update({ totals: { received, given } });
}

/** Recomputes received/given totals on linked patients whenever a donation changes. */
export const onDonationWritten = onDocumentWritten(`${COL.donations}/{donationId}`, async (event) => {
  const before = event.data?.before.data() as Donation | undefined;
  const after = event.data?.after.data() as Donation | undefined;
  const ids = new Set([before?.patientId, after?.patientId].filter((x): x is string => Boolean(x)));
  await Promise.all([...ids].map(recomputeTotals));
});

/** Issues an available item to a patient: creates the assignment and marks the item assigned. */
export const issueEquipment = onCall(async (request) => {
  const caller = requireRole(request, STAFF_ROLES);
  const input = parse(issueEquipmentSchema, request.data);
  const itemRef = db.collection(COL.equipment).doc(input.equipmentId);
  const patientRef = db.collection(COL.patients).doc(input.patientId);

  return db.runTransaction(async (tx) => {
    const [item, patient] = await Promise.all([tx.get(itemRef), tx.get(patientRef)]);
    if (!item.exists) throw new HttpsError('not-found', 'Equipment not found.');
    if (!patient.exists) throw new HttpsError('not-found', 'Patient not found.');
    const eq = item.data() as Equipment;
    if (eq.status !== 'available') throw new HttpsError('failed-precondition', `${eq.code} is ${eq.status}, not available.`);

    const assignmentRef = itemRef.collection(COL.assignments).doc();
    const patientName = patient.get('name') as string;
    const assignment: Assignment = {
      patientId: input.patientId,
      patientName,
      issuedTo: input.issuedTo,
      phone: input.phone,
      issuedAt: input.issuedAt,
      expectedReturn: input.expectedReturn,
      deposit: input.deposit,
      notes: input.notes,
      issuedBy: caller.uid,
      returnedAt: null,
      returnCondition: null,
      returnNotes: null,
      returnedBy: null,
    };
    tx.set(assignmentRef, { ...assignment, createdAt: FieldValue.serverTimestamp() });
    tx.update(itemRef, {
      status: 'assigned',
      currentAssignment: {
        assignmentId: assignmentRef.id,
        patientId: input.patientId,
        patientName,
        issuedAt: input.issuedAt,
        expectedReturn: input.expectedReturn,
      },
      ...updated(caller.uid),
    });
    return { equipmentId: input.equipmentId, assignmentId: assignmentRef.id, status: 'assigned' };
  });
});

/** Closes the open assignment; the item becomes available, or maintenance if it needs repair. */
export const returnEquipment = onCall(async (request) => {
  const caller = requireRole(request, STAFF_ROLES);
  const input = parse(returnEquipmentSchema, request.data);
  const itemRef = db.collection(COL.equipment).doc(input.equipmentId);

  return db.runTransaction(async (tx) => {
    const item = await tx.get(itemRef);
    if (!item.exists) throw new HttpsError('not-found', 'Equipment not found.');
    const eq = item.data() as Equipment;
    if (eq.status !== 'assigned' || !eq.currentAssignment) {
      throw new HttpsError('failed-precondition', `${eq.code} is not issued to anyone.`);
    }
    const status = input.condition === 'needs_repair' ? 'maintenance' : 'available';
    tx.update(itemRef.collection(COL.assignments).doc(eq.currentAssignment.assignmentId), {
      returnedAt: input.returnedAt,
      returnCondition: input.condition,
      returnNotes: input.notes,
      returnedBy: caller.uid,
    });
    tx.update(itemRef, { status, condition: input.condition, currentAssignment: null, ...updated(caller.uid) });
    return { equipmentId: input.equipmentId, assignmentId: eq.currentAssignment.assignmentId, status };
  });
});

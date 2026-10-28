import { FieldValue } from 'firebase-admin/firestore';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { COL, DEFAULT_LOCATION, isLocalPlace, myDonorDetailsSchema } from '../shared';
import type { BloodDonor, Location, Member } from '../shared';
import { db } from '../lib/firebase';
import { parse, requireRole } from '../lib/guards';
import { updated } from '../lib/stamp';

async function defaultLocation(): Promise<Location> {
  const settings = await db.collection(COL.settings).doc('app').get();
  return (settings.get('defaultLocation') as Location | undefined) ?? { ...DEFAULT_LOCATION };
}

/**
 * One-way sync members/{id} → bloodDonors/{id} (same ID).
 * - Copies name, dob, blood group and phone; `active` follows the member status, so inactive or
 *   blocked members disappear from the members' donor list but keep their record.
 * - Donor-owned fields (location, lastDonated, available, hideNumber) are set once on creation
 *   and never overwritten.
 * - Deleting the member deletes the donor record.
 */
export const onMemberWritten = onDocumentWritten(`${COL.members}/{memberId}`, async (event) => {
  const memberId = event.params.memberId;
  const donorRef = db.collection(COL.bloodDonors).doc(memberId);
  const after = event.data?.after.exists ? (event.data.after.data() as Member) : null;

  if (!after) {
    await donorRef.delete();
    return;
  }

  const synced = {
    source: 'member' as const,
    memberId,
    name: after.name,
    nameLower: after.name.toLowerCase(),
    dob: after.dob,
    bloodGroup: after.bloodGroup,
    phone: after.phone,
    active: after.status === 'active',
  };

  const existing = await donorRef.get();
  if (!existing.exists) {
    const location = await defaultLocation();
    await donorRef.set({
      ...synced,
      location,
      isLocal: isLocalPlace(location.place),
      lastDonated: null,
      available: true,
      hideNumber: false,
      consent: { given: true, at: FieldValue.serverTimestamp(), recordedBy: 'system' },
      createdAt: FieldValue.serverTimestamp(),
      createdBy: 'system',
      ...updated('system'),
    });
    return;
  }

  const current = existing.data() as BloodDonor;
  const changed = (Object.keys(synced) as (keyof typeof synced)[]).some((k) => current[k] !== synced[k]);
  if (changed) await donorRef.update({ ...synced, ...updated('system') });
});

/** A member updates their own donor details (location, last donated, availability, hide number). */
export const updateMyDonorDetails = onCall(async (request) => {
  const caller = requireRole(request, ['member']);
  if (!caller.memberId) throw new HttpsError('failed-precondition', 'No member linked to this login.');
  const input = parse(myDonorDetailsSchema, request.data);
  const ref = db.collection(COL.bloodDonors).doc(caller.memberId);
  if (!(await ref.get()).exists) throw new HttpsError('not-found', 'Donor record not found.');
  await ref.update({ ...input, isLocal: isLocalPlace(input.location.place), ...updated(caller.uid) });
  return { memberId: caller.memberId };
});

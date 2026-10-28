import { FieldValue } from 'firebase-admin/firestore';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions/v2';
import { COL } from '../shared';
import { db } from '../lib/firebase';

const IGNORED = new Set(['updatedAt', 'updatedBy', 'createdAt', 'createdBy', 'notifiedAt', 'notifiedCount']);

function changedFields(before: Record<string, unknown> | null, after: Record<string, unknown> | null): string[] {
  const keys = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);
  return [...keys].filter((k) => !IGNORED.has(k) && JSON.stringify(before?.[k]) !== JSON.stringify(after?.[k])).sort();
}

/** One audit trigger per tracked collection; actor is the `updatedBy` the writer stamped. */
function auditTrail(collection: string) {
  return onDocumentWritten(`${collection}/{docId}`, async (event) => {
    const before = event.data?.before.exists ? (event.data.before.data() as Record<string, unknown>) : null;
    const after = event.data?.after.exists ? (event.data.after.data() as Record<string, unknown>) : null;
    // deleteMember writes its own entry with the real actor.
    if (!after && collection === COL.members) return;
    const changed = changedFields(before, after);
    if (before && after && changed.length === 0) return;
    await db.collection(COL.auditLogs).add({
      collection,
      docId: event.params.docId,
      action: !before ? 'create' : !after ? 'delete' : 'update',
      actor: (after?.updatedBy as string | undefined) ?? (before?.updatedBy as string | undefined) ?? 'system',
      changed,
      before,
      after,
      at: FieldValue.serverTimestamp(),
    });
  });
}

export const auditMembers = auditTrail(COL.members);
export const auditBloodDonors = auditTrail(COL.bloodDonors);
export const auditPatients = auditTrail(COL.patients);
export const auditDonations = auditTrail(COL.donations);
export const auditEquipment = auditTrail(COL.equipment);
export const auditCommittee = auditTrail(COL.committee);
export const auditPosts = auditTrail(COL.posts);
export const auditRequests = auditTrail(COL.requests);
export const auditSettings = auditTrail(COL.settings);

/**
 * Daily Firestore export at 02:00 IST to gs://BACKUP_BUCKET/backups/YYYY-MM-DD.
 * Create the bucket once with a 30-day delete lifecycle rule (see README).
 */
export const dailyBackup = onSchedule({ schedule: '0 2 * * *', timeZone: 'Asia/Kolkata' }, async () => {
  const project = process.env.GCLOUD_PROJECT!;
  const bucket = process.env.BACKUP_BUCKET ?? `${project}-backups`;
  // CommonJS package: load lazily so it only costs cold-start time in this function.
  const { v1 } = (await import('@google-cloud/firestore')).default;
  const client = new v1.FirestoreAdminClient();
  const date = new Date().toISOString().slice(0, 10);
  const [op] = await client.exportDocuments({
    name: client.databasePath(project, '(default)'),
    outputUriPrefix: `gs://${bucket}/backups/${date}`,
    collectionIds: [],
  });
  logger.info('Firestore export started', { operation: op.name, bucket, date });
});

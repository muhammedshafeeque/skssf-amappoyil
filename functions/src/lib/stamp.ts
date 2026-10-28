import { FieldValue } from 'firebase-admin/firestore';

export const created = (uid: string) => ({
  createdAt: FieldValue.serverTimestamp(),
  updatedAt: FieldValue.serverTimestamp(),
  createdBy: uid,
  updatedBy: uid,
});

export const updated = (uid: string) => ({
  updatedAt: FieldValue.serverTimestamp(),
  updatedBy: uid,
});

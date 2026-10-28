#!/usr/bin/env node
// Creates (or promotes) the first super admin.
//
//   Emulator:  FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
//              node scripts/bootstrap-super-admin.mjs --project demo-skamp --email you@example.com --password secret123
//   Real:      GOOGLE_APPLICATION_CREDENTIALS=service-account.json \
//              node scripts/bootstrap-super-admin.mjs --project skssf-158ed --email you@example.com
//
// Without --password the account has no password; the script prints a reset link to set one.
import { parseArgs } from 'node:util';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

const { values } = parseArgs({
  options: {
    project: { type: 'string' },
    email: { type: 'string' },
    password: { type: 'string' },
    name: { type: 'string', default: 'Super Admin' },
  },
});
if (!values.project || !values.email) {
  console.error('Usage: bootstrap-super-admin.mjs --project <id> --email <email> [--password <pw>] [--name <name>]');
  process.exit(1);
}

initializeApp({ projectId: values.project });
const auth = getAuth();
const email = values.email.trim().toLowerCase();

let user = await auth.getUserByEmail(email).catch(() => null);
if (!user) {
  user = await auth.createUser({ email, displayName: values.name, ...(values.password ? { password: values.password } : {}) });
  console.log(`Created ${email} (${user.uid})`);
} else if (values.password) {
  await auth.updateUser(user.uid, { password: values.password });
}
await auth.setCustomUserClaims(user.uid, { ...(user.customClaims ?? {}), role: 'super_admin' });
await getFirestore().collection('staff').doc(user.uid).set(
  { email, displayName: values.name, role: 'super_admin', updatedBy: 'bootstrap', updatedAt: FieldValue.serverTimestamp() },
  { merge: true },
);
console.log(`✔ ${email} is now super_admin (uid ${user.uid})`);
if (!values.password) console.log(`Set a password: ${await auth.generatePasswordResetLink(email)}`);
process.exit(0);

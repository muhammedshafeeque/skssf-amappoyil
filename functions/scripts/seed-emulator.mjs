#!/usr/bin/env node
// Seeds the local emulators with demo data for trying the admin panel and member app.
// Start emulators first (npm run emulators), then: npm run seed
//
// Logins created:
//   super admin   admin@skamp.test / Passw0rd!
//   coordinator   sahajari@skamp.test / Passw0rd!
//   members       phone +91 90000 00001 … (any OTP is shown in the emulator log)
process.env.FIREBASE_AUTH_EMULATOR_HOST ??= '127.0.0.1:9099';
process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080';
const PROJECT = 'demo-skamp';
const { initializeApp } = await import('firebase-admin/app');
const { getAuth } = await import('firebase-admin/auth');
const { getFirestore, FieldValue } = await import('firebase-admin/firestore');
initializeApp({ projectId: PROJECT });
const auth = getAuth();
const db = getFirestore();
const AUTH = `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}`;

async function call(name, data, idToken) {
  const res = await fetch(`http://127.0.0.1:5001/${PROJECT}/asia-south1/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ data }),
  });
  const body = await res.json();
  if (body.error) throw new Error(`${name}: ${body.error.message}`);
  return body.result;
}
async function identity(path, body) {
  const res = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/${path}?key=demo-key`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return res.json();
}
async function staff(email, name, role) {
  const user = await auth.getUserByEmail(email).catch(() => auth.createUser({ email, password: 'Passw0rd!', displayName: name }));
  await auth.setCustomUserClaims(user.uid, { role });
  await db.doc(`staff/${user.uid}`).set({ email, displayName: name, role, updatedBy: 'seed', updatedAt: FieldValue.serverTimestamp() });
  const s = await identity('accounts:signInWithPassword', { email, password: 'Passw0rd!', returnSecureToken: true });
  return { uid: user.uid, token: s.idToken };
}
const stamp = (uid) => ({ createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(), createdBy: uid, updatedBy: uid });

const admin = await staff('admin@skamp.test', 'Unit Secretary', 'super_admin');
await staff('sahajari@skamp.test', 'Sahajari Convener', 'sahajari_coordinator');
await db.doc('settings/app').set({ eligibilityGapDays: 90, defaultLocation: { place: 'Amappoyil', state: 'Kerala', country: 'India' }, unitName: 'Amappoyil', ...stamp(admin.uid) });

const people = [
  ['Muhammed Shafi', 'O+', 'Kunhimuhammed', 'Puthanpurayil', 'SK-MPM-1101'],
  ['Abdul Basith', 'B+', 'Moideen', 'Kizhakkethil', null],
  ['Ashraf Ali', 'A+', 'Hamza', 'Vadakkepurath', 'SK-MPM-1102'],
  ['Fasil Rahman', 'AB+', 'Abdurahman', 'Thottathil', null],
  ['Shamsudheen K', 'O-', 'Kunhalavi', 'Kalathingal', null],
  ['Jabir P', 'B-', 'Usman', 'Parakkal', null],
  ['Nisar Ahammed', 'A-', 'Ahammed Kutty', 'Chalil', null],
  ['Rashid V', 'O+', 'Musthafa', 'Valiyaparambil', null],
];
const ids = [];
for (const [i, [name, bloodGroup, fatherName, houseName, skssfId]] of people.entries()) {
  const phone = `+919000000${String(i + 1).padStart(3, '0')}`;
  const existing = await db.doc(`phoneIndex/${phone}`).get();
  if (existing.exists) { ids.push(existing.get('memberId')); continue; }
  const r = await call('createMember', { name, phone, bloodGroup, fatherName, houseName, address: `${houseName} House, Amappoyil, Malappuram, Kerala`, dob: `199${i}-0${(i % 9) + 1}-1${i}`, skssfId }, admin.token);
  ids.push(r.memberId);
}
await call('setMemberStatus', { memberId: ids[7], status: 'inactive', reason: 'Working abroad, not active in unit' }, admin.token);
await new Promise((r) => setTimeout(r, 3000));
await db.doc(`bloodDonors/${ids[0]}`).update({ lastDonated: new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10) });
await db.doc(`bloodDonors/${ids[2]}`).update({ location: { place: 'Dubai', state: 'Dubai', country: 'UAE' }, isLocal: false });

const donors = [['Haris K', 'A+', '+919811100001'], ['Sudheer M', 'O+', '+919811100002']];
for (const [name, bloodGroup, phone] of donors) {
  await db.collection('bloodDonors').add({ source: 'non_member', memberId: null, name, nameLower: name.toLowerCase(), dob: '1988-03-03', bloodGroup, phone, location: { place: 'Amappoyil', state: 'Kerala', country: 'India' }, isLocal: true, lastDonated: null, available: true, active: true, hideNumber: name.startsWith('S'), consent: { given: true, at: FieldValue.serverTimestamp(), recordedBy: admin.uid }, ...stamp(admin.uid) });
}

const committee = [['Muhammed Shafi', 'President', ids[0]], ['Ashraf Ali', 'General Secretary', ids[2]], ['Fasil Rahman', 'Treasurer', ids[3]], ['Abdul Basith', 'Sahajari Convener', ids[1]]];
for (const [i, [name, designation, memberId]] of committee.entries()) {
  await db.collection('committee').add({ name, designation, memberId, phone: `+919000000${String(ids.indexOf(memberId) + 1).padStart(3, '0')}`, email: null, photoUrl: null, order: (i + 1) * 10, term: '2025-27', isCurrent: true, ...stamp(admin.uid) });
}
await db.collection('committee').add({ name: 'Ismail Faizy', designation: 'President', memberId: null, phone: '+919822200001', email: null, photoUrl: null, order: 10, term: '2023-25', isCurrent: false, ...stamp(admin.uid) });

const p1 = await db.collection('patients').add({ name: 'Kunhalavi Haji', age: 68, gender: 'male', phone: '+919833300001', address: 'Thazhe Amappoyil', condition: 'Chronic kidney disease, on dialysis', need: 'Dialysis twice a week', category: 'dialysis', supportTypes: ['medical', 'financial'], status: 'active', notes: null, source: 'admin', requestId: null, totals: { received: 0, given: 0 }, ...stamp(admin.uid) });
const p2 = await db.collection('patients').add({ name: 'Ayisha Beevi', age: 72, gender: 'female', phone: '+919833300002', address: 'Mele Amappoyil', condition: 'Hip fracture after fall', need: 'Wheelchair and home care', category: 'other', supportTypes: ['equipment'], status: 'approved', notes: null, source: 'admin', requestId: null, totals: { received: 0, given: 0 }, ...stamp(admin.uid) });

const eq = [['WC-01', 'wheelchair', 'Wheelchair (foldable)'], ['WC-02', 'wheelchair', 'Wheelchair (heavy duty)'], ['ST-01', 'stretcher', 'Folding stretcher'], ['OX-01', 'oxygen_cylinder', 'Oxygen cylinder 10L'], ['AB-01', 'air_bed', 'Air bed'], ['AM-01', 'ambulance', 'Unit ambulance KL-10-AB-1234']];
const eqIds = [];
for (const [code, type, name] of eq) eqIds.push((await db.collection('equipment').add({ code, type, name, condition: 'good', status: 'available', notes: null, currentAssignment: null, ...stamp(admin.uid) })).id);
await call('issueEquipment', { equipmentId: eqIds[0], patientId: p2.id, issuedTo: 'Ayisha Beevi (son Salim)', phone: '+919833300002', issuedAt: '2026-10-10', expectedReturn: '2026-10-25', deposit: 500 }, admin.token);

const d = (direction, amount, date, mode, purpose, extra = {}) => db.collection('donations').add({ direction, donorName: null, anonymous: false, amount, item: null, mode, date, purpose, patientId: null, patientName: null, receiptNo: null, ...extra, ...stamp(admin.uid) });
await d('in', 10000, '2026-09-05', 'bank', 'Ramadan collection balance', { donorName: 'Amappoyil Mahallu Committee', receiptNo: 'R-101' });
await d('in', 2500, '2026-10-02', 'upi', 'Dialysis support', { donorName: 'Gulf KMCC well-wisher', patientId: p1.id, patientName: 'Kunhalavi Haji', receiptNo: 'R-102' });
await d('in', 1000, '2026-10-12', 'cash', 'General fund', { anonymous: true, receiptNo: 'R-103' });
await d('out', 3000, '2026-10-15', 'bank', 'Dialysis bills October', { patientId: p1.id, patientName: 'Kunhalavi Haji' });

await db.collection('posts').add({ title: 'Blood donation camp on Sunday', body: 'SKSSF Amappoyil unit with Malappuram blood bank is holding a donation camp at the madrasa hall, 9 am – 1 pm. Bring your ID.', images: [], status: 'published', pinned: true, notify: false, publishedAt: FieldValue.serverTimestamp(), notifiedAt: null, authorId: admin.uid, ...stamp(admin.uid) });
await db.collection('posts').add({ title: 'Sahajari: wheelchairs available', body: 'Two wheelchairs and an air bed are available for patients in our area. Contact the Sahajari convener.', images: [], status: 'published', pinned: false, notify: false, publishedAt: FieldValue.serverTimestamp(), notifiedAt: null, authorId: admin.uid, ...stamp(admin.uid) });

// A pending request from member 2, made through the real login flow.
const sent = await identity('accounts:sendVerificationCode', { phoneNumber: '+919000000002', recaptchaToken: 'x' });
const codes = await fetch(`${AUTH}/emulator/v1/projects/${PROJECT}/verificationCodes`).then((r) => r.json());
const code = codes.verificationCodes.findLast((c) => c.sessionInfo === sent.sessionInfo).code;
const m = await identity('accounts:signInWithPhoneNumber', { sessionInfo: sent.sessionInfo, code });
await call('completeMemberLogin', {}, m.idToken);
const refreshed = await fetch(`${AUTH}/securetoken.googleapis.com/v1/token?key=demo-key`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: `grant_type=refresh_token&refresh_token=${m.refreshToken}` }).then((r) => r.json());
await call('submitRequest', { type: 'patient_add', payload: { name: 'Safiya', age: 45, gender: 'female', phone: '+919844400001', address: 'Kizhakkethil, Amappoyil', condition: 'Breast cancer, under chemotherapy at MCH Kozhikode', need: 'Travel and medicine support', category: 'cancer', supportTypes: ['medical', 'financial'], relation: 'Neighbour' } }, refreshed.id_token);

console.log(`Seeded ${ids.length} members (${ids.join(', ')}), donors, committee, 2 patients, ${eq.length} equipment, donations, posts and 1 pending request.`);
console.log('Admin: admin@skamp.test / Passw0rd!   Coordinator: sahajari@skamp.test / Passw0rd!');
process.exit(0);

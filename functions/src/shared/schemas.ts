import { z } from 'zod';
import {
  BLOOD_GROUPS,
  DONATION_DIRECTIONS,
  DONATION_MODES,
  EQUIPMENT_CONDITIONS,
  EQUIPMENT_STATUSES,
  EQUIPMENT_TYPES,
  GENDERS,
  MEMBER_STATUSES,
  PATIENT_CATEGORIES,
  PATIENT_STATUSES,
  POST_STATUSES,
  STAFF_ROLES,
  SUPPORT_TYPES,
} from './constants';
import { isMemberId } from './helpers';

const text = (max = 200) => z.string().trim().min(1, 'Required').max(max);
const optText = (max = 2000) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => (v ? v : null));

export const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')
  .refine((s) => !Number.isNaN(Date.parse(`${s}T00:00:00Z`)), 'Invalid date');
export const phone = z.string().regex(/^\+[1-9]\d{7,14}$/, 'Use international format, e.g. +919876543210');
export const memberId = z.string().refine(isMemberId, 'Member ID looks like SKAMP001');
export const location = z.object({
  place: text(120),
  state: text(120),
  country: text(120),
});

// ---- Staff -------------------------------------------------------------------
export const setStaffRoleSchema = z
  .object({
    uid: z.string().min(1).optional(),
    email: z.string().trim().toLowerCase().email().optional(),
    displayName: z.string().trim().max(120).optional(),
    role: z.enum(STAFF_ROLES).nullable(),
  })
  .refine((v) => Boolean(v.uid) !== Boolean(v.email), { message: 'Pass either uid or email' });
export type SetStaffRoleInput = z.infer<typeof setStaffRoleSchema>;

// ---- Members -----------------------------------------------------------------
export const memberFields = z.object({
  skssfId: optText(40),
  name: text(120),
  phone,
  bloodGroup: z.enum(BLOOD_GROUPS),
  fatherName: text(120),
  houseName: text(120),
  address: text(500),
  dob: dateString,
});
export type MemberFields = z.infer<typeof memberFields>;

export const createMemberSchema = memberFields;
export const updateMemberSchema = z.object({
  memberId,
  changes: memberFields.partial().extend({ photoUrl: z.string().url().nullable().optional() }),
});
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
export const setMemberStatusSchema = z.object({
  memberId,
  status: z.enum(MEMBER_STATUSES),
  reason: optText(500),
});
export type SetMemberStatusInput = z.infer<typeof setMemberStatusSchema>;

// ---- Login -------------------------------------------------------------------
export const lookupMemberSchema = z.object({
  id: z.string().trim().min(1).max(40),
  phone: z.string().trim().max(20).optional(),
});

// ---- Blood donors -------------------------------------------------------------
export const donorSchema = z.object({
  name: text(120),
  dob: dateString,
  bloodGroup: z.enum(BLOOD_GROUPS),
  phone,
  location,
  lastDonated: dateString.nullish().transform((v) => v ?? null),
  available: z.boolean().default(true),
  hideNumber: z.boolean().default(false),
  consent: z.literal(true, { errorMap: () => ({ message: 'Donor consent is required' }) }),
});
export type DonorInput = z.infer<typeof donorSchema>;

export const myDonorDetailsSchema = z.object({
  location,
  lastDonated: dateString.nullish().transform((v) => v ?? null),
  available: z.boolean(),
  hideNumber: z.boolean(),
});
export type MyDonorDetails = z.infer<typeof myDonorDetailsSchema>;

export const settingsSchema = z.object({
  eligibilityGapDays: z.number().int().min(30).max(365),
  defaultLocation: location,
  unitName: text(120),
});
export type AppSettings = z.infer<typeof settingsSchema>;

// ---- Committee ---------------------------------------------------------------
export const committeeSchema = z.object({
  name: text(120),
  designation: text(80),
  phone,
  email: z.string().trim().email().nullish().or(z.literal('')).transform((v) => (v ? v : null)),
  memberId: z.string().nullish().or(z.literal('')).transform((v) => (v ? v : null)),
  order: z.number().int().min(0),
  term: z.string().trim().regex(/^\d{4}(-\d{2,4})?$/, 'Like 2025-27'),
  isCurrent: z.boolean(),
});
export type CommitteeInput = z.infer<typeof committeeSchema>;

// ---- Sahajari: patients --------------------------------------------------------
export const patientFields = z.object({
  name: text(120),
  age: z.coerce.number().int().min(0).max(120),
  gender: z.enum(GENDERS),
  phone,
  address: text(500),
  condition: text(1000),
  need: text(500),
  category: z.enum(PATIENT_CATEGORIES),
  supportTypes: z.array(z.enum(SUPPORT_TYPES)).min(1, 'Pick at least one support type'),
});
export const patientSchema = patientFields.extend({
  status: z.enum(PATIENT_STATUSES),
  notes: optText(2000),
});
export type PatientInput = z.infer<typeof patientSchema>;

// ---- Sahajari: donations -------------------------------------------------------
export const donationSchema = z
  .object({
    direction: z.enum(DONATION_DIRECTIONS),
    donorName: optText(120),
    anonymous: z.boolean().default(false),
    amount: z.coerce.number().int().positive().nullish().transform((v) => v ?? null),
    item: optText(200),
    mode: z.enum(DONATION_MODES),
    date: dateString,
    purpose: text(300),
    patientId: z.string().nullish().or(z.literal('')).transform((v) => (v ? v : null)),
    receiptNo: optText(40),
  })
  .refine((d) => d.amount !== null || d.item !== null, { message: 'Enter an amount or an item', path: ['amount'] })
  .refine((d) => d.direction === 'out' || d.anonymous || d.donorName !== null, {
    message: 'Enter the donor name or mark as anonymous',
    path: ['donorName'],
  })
  .refine((d) => d.direction === 'in' || d.patientId !== null, {
    message: 'Pick the patient who received the support',
    path: ['patientId'],
  });
export type DonationInput = z.infer<typeof donationSchema>;

// ---- Sahajari: equipment -------------------------------------------------------
export const equipmentSchema = z.object({
  code: text(30),
  type: z.enum(EQUIPMENT_TYPES),
  name: text(120),
  condition: z.enum(EQUIPMENT_CONDITIONS),
  notes: optText(1000),
});
export type EquipmentInput = z.infer<typeof equipmentSchema>;
export const equipmentManualStatus = z.enum(EQUIPMENT_STATUSES).exclude(['assigned']);

export const issueEquipmentSchema = z.object({
  equipmentId: z.string().min(1),
  patientId: z.string().min(1),
  issuedTo: text(120),
  phone,
  issuedAt: dateString,
  expectedReturn: dateString.nullish().transform((v) => v ?? null),
  deposit: z.coerce.number().int().min(0).nullish().transform((v) => v ?? null),
  notes: optText(1000),
});
export type IssueEquipmentInput = z.infer<typeof issueEquipmentSchema>;

export const returnEquipmentSchema = z.object({
  equipmentId: z.string().min(1),
  returnedAt: dateString,
  condition: z.enum(EQUIPMENT_CONDITIONS),
  notes: optText(1000),
});
export type ReturnEquipmentInput = z.infer<typeof returnEquipmentSchema>;

// ---- News --------------------------------------------------------------------
export const postSchema = z.object({
  title: text(160),
  body: z.string().trim().min(1, 'Required').max(10000),
  images: z.array(z.string().url()).max(10),
  status: z.enum(POST_STATUSES),
  pinned: z.boolean(),
  notify: z.boolean(),
});
export type PostInput = z.infer<typeof postSchema>;

// ---- Requests ------------------------------------------------------------------
export const patientAddPayload = patientFields.extend({
  relation: optText(120),
  note: optText(1000),
});
export type PatientAddPayload = z.infer<typeof patientAddPayload>;

/** One entry per request type: add new types here and a handler in functions. */
export const requestPayloadSchemas = {
  patient_add: patientAddPayload,
} as const;

export const submitRequestSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('patient_add'), payload: patientAddPayload }),
]);
export type SubmitRequestInput = z.infer<typeof submitRequestSchema>;

export const reviewRequestSchema = z.object({
  requestId: z.string().min(1),
  decision: z.enum(['approve', 'reject']),
  note: optText(1000),
});
export type ReviewRequestInput = z.infer<typeof reviewRequestSchema>;

export const registerPushTokenSchema = z.object({
  token: z.string().min(10).max(4096),
  platform: z.enum(['android', 'ios', 'web']),
  remove: z.boolean().optional(),
});

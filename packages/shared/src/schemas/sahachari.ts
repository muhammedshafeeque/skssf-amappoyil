import { z } from 'zod';
import {
  AID_CATEGORIES,
  DONATION_MODES,
  EQUIPMENT_CONDITIONS,
  EQUIPMENT_STATUSES,
  EQUIPMENT_TYPES,
  PATIENT_STATUSES,
  SUPPORT_TYPES,
} from '../enums.js';
import { dateStringSchema, optionalText, phoneSchema, trimmed } from './common.js';
import type { Stamped, TimestampLike } from './common.js';

// ---- Patients ----------------------------------------------------------------

export const patientInputSchema = z.object({
  name: trimmed(120),
  age: z.number().int().min(0).max(120),
  phone: phoneSchema,
  address: trimmed(500),
  need: trimmed(1000),
  category: z.enum(AID_CATEGORIES),
  supportTypes: z.array(z.enum(SUPPORT_TYPES)).min(1, 'Pick at least one support type'),
  status: z.enum(PATIENT_STATUSES).default('pending'),
  notes: optionalText(2000),
});
export type PatientInput = z.infer<typeof patientInputSchema>;

export interface PatientDocument {
  path: string;
  name: string;
  contentType: string;
  uploadedBy: string;
  uploadedAt: TimestampLike;
}

export interface Patient extends Omit<PatientInput, 'notes'>, Stamped {
  id: string;
  notes?: string;
  documents: PatientDocument[];
  requestedBy?: string;
  approvedBy?: string;
  referral?: { status: 'notReferred' | 'referred' | 'approved' | 'declined'; updatedAt?: TimestampLike; note?: string };
  totals?: { received: number; disbursed: number };
}

/** patientsPublic/{patientId} — trimmed view members may read. Written only by functions. */
export interface PatientPublic {
  name: string;
  need: string;
  category: (typeof AID_CATEGORIES)[number];
  supportTypes: (typeof SUPPORT_TYPES)[number][];
  status: (typeof PATIENT_STATUSES)[number];
  updatedAt: TimestampLike;
}

/** patients/{id}/timeline/{auto} */
export const patientNoteSchema = z.object({
  kind: z.enum(['note', 'visit']),
  text: trimmed(2000),
  date: dateStringSchema,
});
export type PatientNote = z.infer<typeof patientNoteSchema>;

// ---- Donations ---------------------------------------------------------------

export const donationInputSchema = z
  .object({
    donorName: z.string().trim().max(120).optional(),
    isAnonymous: z.boolean().default(false),
    direction: z.enum(['received', 'disbursed']).default('received'),
    amount: z.number().positive().optional(),
    item: z.string().trim().max(200).optional(),
    mode: z.enum(DONATION_MODES),
    date: dateStringSchema,
    patientId: z.string().optional(),
    purpose: trimmed(300),
  })
  .refine((d) => d.amount !== undefined || (d.item && d.item.length > 0), {
    message: 'Enter an amount or an item',
    path: ['amount'],
  })
  .refine((d) => d.isAnonymous || (d.donorName && d.donorName.length > 0) || d.direction === 'disbursed', {
    message: 'Enter the donor name or mark as anonymous',
    path: ['donorName'],
  });
export type DonationInput = z.infer<typeof donationInputSchema>;

export interface Donation extends Stamped {
  id: string;
  donorName?: string;
  isAnonymous: boolean;
  direction: 'received' | 'disbursed';
  amount?: number;
  item?: string;
  mode: (typeof DONATION_MODES)[number];
  date: string;
  patientId?: string;
  purpose: string;
  receiptNo?: string;
  recordedBy: string;
}

// ---- Equipment ---------------------------------------------------------------

export const equipmentInputSchema = z.object({
  code: trimmed(30),
  type: z.enum(EQUIPMENT_TYPES),
  name: trimmed(120),
  condition: z.enum(EQUIPMENT_CONDITIONS),
  status: z.enum(EQUIPMENT_STATUSES).default('available'),
  notes: optionalText(1000),
});
export type EquipmentInput = z.infer<typeof equipmentInputSchema>;

export interface Equipment extends Omit<EquipmentInput, 'notes'>, Stamped {
  id: string;
  notes?: string;
  currentIssueId?: string;
  currentHolder?: { name: string; patientId?: string; expectedReturn?: string };
}

export const equipmentIssueInputSchema = z.object({
  patientId: z.string().optional(),
  issuedTo: trimmed(120),
  phone: phoneSchema,
  issueDate: dateStringSchema,
  expectedReturn: dateStringSchema.optional(),
  deposit: z.number().min(0).optional(),
  notes: optionalText(1000),
  /** Ambulance trips are logged as short issues. */
  trip: z
    .object({ from: trimmed(120), to: trimmed(120), km: z.number().min(0).optional() })
    .optional(),
});
export type EquipmentIssueInput = z.infer<typeof equipmentIssueInputSchema>;

export const equipmentReturnSchema = z.object({
  returnedOn: dateStringSchema,
  condition: z.enum(EQUIPMENT_CONDITIONS),
  depositRefunded: z.number().min(0).optional(),
  notes: optionalText(1000),
});
export type EquipmentReturn = z.infer<typeof equipmentReturnSchema>;

/** equipment/{id}/issues/{auto} */
export interface EquipmentIssue extends Omit<EquipmentIssueInput, 'notes'>, Stamped {
  id: string;
  equipmentId: string;
  notes?: string;
  returnedOn?: string;
  returnCondition?: (typeof EQUIPMENT_CONDITIONS)[number];
  depositRefunded?: number;
  issuedBy: string;
}

// ---- Member request payloads -----------------------------------------------

export const patientRequestPayloadSchema = patientInputSchema.omit({ status: true, notes: true }).extend({
  relation: z.string().trim().max(120).optional(),
});
export type PatientRequestPayload = z.infer<typeof patientRequestPayloadSchema>;

export const equipmentRequestPayloadSchema = z.object({
  type: z.enum(EQUIPMENT_TYPES),
  forName: trimmed(120),
  phone: phoneSchema,
  place: trimmed(200),
  neededFrom: dateStringSchema,
  reason: trimmed(1000),
  patientId: z.string().optional(),
});
export type EquipmentRequestPayload = z.infer<typeof equipmentRequestPayloadSchema>;

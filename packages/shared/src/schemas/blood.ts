import { z } from 'zod';
import { BLOOD_GROUPS, DONOR_SOURCES } from '../enums.js';
import { dateStringSchema, locationSchema, phoneSchema, trimmed } from './common.js';
import type { Stamped, TimestampLike } from './common.js';

/** Non-member donor added by an admin (bloodDonors/{auto}, source = nonMember). */
export const donorInputSchema = z.object({
  name: trimmed(120),
  dob: dateStringSchema,
  bloodGroup: z.enum(BLOOD_GROUPS),
  phone: phoneSchema,
  location: locationSchema,
  lastDonated: dateStringSchema.optional(),
  isAvailable: z.boolean().default(true),
  hideNumber: z.boolean().default(false),
  consent: z.literal(true, { errorMap: () => ({ message: 'Donor consent is required' }) }),
});
export type DonorInput = z.infer<typeof donorInputSchema>;

/** What a member donor may change about themselves. */
export const myDonorDetailsSchema = z.object({
  lastDonated: dateStringSchema.optional(),
  location: locationSchema,
  hideNumber: z.boolean(),
});
export type MyDonorDetails = z.infer<typeof myDonorDetailsSchema>;

export interface BloodDonor extends Stamped {
  id: string;
  name: string;
  dob: string;
  bloodGroup: (typeof BLOOD_GROUPS)[number];
  phone: string;
  location: z.infer<typeof locationSchema>;
  lastDonated?: string;
  source: (typeof DONOR_SOURCES)[number];
  memberId?: string;
  isAvailable: boolean;
  consent: boolean;
  hideNumber: boolean;
}

/** requests payload for an urgent blood request. */
export const bloodRequestPayloadSchema = z.object({
  patientName: trimmed(120),
  bloodGroup: z.enum(BLOOD_GROUPS),
  units: z.number().int().min(1).max(20),
  hospital: trimmed(200),
  place: trimmed(120),
  contactPhone: phoneSchema,
  neededBy: dateStringSchema,
  notes: z.string().trim().max(1000).optional(),
});
export type BloodRequestPayload = z.infer<typeof bloodRequestPayloadSchema>;

/** requests/{id}/responses/{donorId} — "I can donate". */
export interface DonorResponse {
  donorId: string;
  memberId?: string;
  name: string;
  phone: string;
  respondedAt: TimestampLike;
  status: 'canDonate' | 'donated' | 'withdrawn';
}

import { z } from 'zod';
import { BLOOD_GROUPS, MEMBER_STATUSES, WINGS } from '../enums.js';
import { dateStringSchema, memberIdSchema, optionalText, phoneSchema, trimmed } from './common.js';
import type { Stamped } from './common.js';

/** Fields an admin enters when adding or editing a member (members/{SKAMPnnn}). */
export const memberInputSchema = z.object({
  skssfId: optionalText(40),
  name: trimmed(120),
  phone: phoneSchema,
  dob: dateStringSchema,
  bloodGroup: z.enum(BLOOD_GROUPS),
  fatherName: trimmed(120),
  houseName: trimmed(120),
  address: trimmed(500),
  wingTags: z.array(z.enum(WINGS)).default([]),
});
export type MemberInput = z.infer<typeof memberInputSchema>;

/** Admin edit: phone changes go through updateMemberPhone, so it is not editable here. */
export const memberUpdateSchema = memberInputSchema.omit({ phone: true }).partial();
export type MemberUpdate = z.infer<typeof memberUpdateSchema>;

export const memberStatusChangeSchema = z.object({
  memberId: memberIdSchema,
  status: z.enum(MEMBER_STATUSES),
  reason: trimmed(500),
});
export type MemberStatusChange = z.infer<typeof memberStatusChangeSchema>;

export interface Member extends Omit<MemberInput, 'skssfId'>, Stamped {
  id: string;
  skssfId?: string;
  photoUrl?: string;
  status: (typeof MEMBER_STATUSES)[number];
  statusReason?: string;
  authUid?: string;
}

/** phoneIndex/{phone} — makes "is this phone already a member?" a single read. */
export interface PhoneIndexEntry {
  memberId: string;
}

/** counters/members */
export interface MemberCounter {
  lastNumber: number;
}

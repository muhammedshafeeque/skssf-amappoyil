import { z } from 'zod';
import { WINGS } from '../enums.js';
import { dateStringSchema, phoneSchema, trimmed } from './common.js';
import type { Stamped } from './common.js';

export const committeeInputSchema = z.object({
  memberId: z.string().optional(),
  name: trimmed(120),
  designation: trimmed(80),
  /** Absent for the main unit committee. */
  wing: z.enum(WINGS).optional(),
  phone: phoneSchema,
  order: z.number().int().min(0),
  termFrom: dateStringSchema,
  termTo: dateStringSchema.optional(),
});
export type CommitteeInput = z.infer<typeof committeeInputSchema>;

export interface CommitteeMember extends CommitteeInput, Stamped {
  id: string;
  photoUrl?: string;
  isCurrent: boolean;
}

import { z } from 'zod';
import { MEMBER_ID_PREFIX } from '../constants.js';

/**
 * Firestore Timestamp as seen by any SDK (web, React Native, Admin). Shared code only
 * relies on these two methods so it never imports a specific SDK.
 */
export interface TimestampLike {
  toDate(): Date;
  toMillis(): number;
}

export const timestampSchema = z.custom<TimestampLike>(
  (v) => typeof (v as TimestampLike | null)?.toMillis === 'function',
  { message: 'Expected a Firestore Timestamp' },
);

/** Calendar date without time zone, e.g. date of birth: `YYYY-MM-DD`. */
export const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')
  .refine((s) => !Number.isNaN(Date.parse(`${s}T00:00:00Z`)), 'Invalid date');

/** Phone number in E.164 form, e.g. +919876543210. */
export const phoneSchema = z.string().regex(/^\+[1-9]\d{7,14}$/, 'Use international format, e.g. +919876543210');

export const memberIdSchema = z
  .string()
  .regex(new RegExp(`^${MEMBER_ID_PREFIX}\\d{3,}$`), `Member ID looks like ${MEMBER_ID_PREFIX}001`);

/** Organet hierarchy codes stamped on every record (multi-unit ready). */
export const hierarchySchema = z.object({
  unitCode: z.string().min(1),
  clusterCode: z.string(),
  mekhalaCode: z.string(),
  districtCode: z.string(),
});
export type Hierarchy = z.infer<typeof hierarchySchema>;

export const locationSchema = z.object({
  place: z.string().trim().min(1),
  state: z.string().trim().min(1),
  country: z.string().trim().min(1),
});
export type Location = z.infer<typeof locationSchema>;

export const DEFAULT_LOCATION: Location = { place: 'Amappoyil', state: 'Kerala', country: 'India' };

/** Fields the server adds to every stored document. */
export interface Stamped extends Hierarchy {
  createdAt: TimestampLike;
  updatedAt: TimestampLike;
}

export const trimmed = (max = 200) => z.string().trim().min(1).max(max);
export const optionalText = (max = 2000) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

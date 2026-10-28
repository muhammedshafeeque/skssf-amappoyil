import { z } from 'zod';
import { REQUEST_STATUSES } from '../enums.js';
import type { RequestType } from '../enums.js';
import { bloodRequestPayloadSchema } from './blood.js';
import { optionalText } from './common.js';
import type { Stamped, TimestampLike } from './common.js';
import { postRequestPayloadSchema } from './posts.js';
import { equipmentRequestPayloadSchema, patientRequestPayloadSchema } from './sahachari.js';
import { myDonorDetailsSchema } from './blood.js';
import { memberInputSchema } from './members.js';

/** Profile correction: only the fields the member wants changed. */
export const profileRequestPayloadSchema = z.object({
  changes: memberInputSchema
    .pick({ name: true, dob: true, bloodGroup: true, fatherName: true, houseName: true, address: true })
    .partial()
    .merge(myDonorDetailsSchema.partial())
    .refine((c) => Object.keys(c).length > 0, 'Change at least one field'),
  note: optionalText(500),
});
export type ProfileRequestPayload = z.infer<typeof profileRequestPayloadSchema>;

/** A request as a member submits it — the payload shape depends on the type. */
export const requestInputSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('patient'), payload: patientRequestPayloadSchema }),
  z.object({ type: z.literal('equipment'), payload: equipmentRequestPayloadSchema }),
  z.object({ type: z.literal('blood'), payload: bloodRequestPayloadSchema, urgent: z.literal(true).default(true) }),
  z.object({ type: z.literal('profile'), payload: profileRequestPayloadSchema }),
  z.object({ type: z.literal('post'), payload: postRequestPayloadSchema }),
]);
export type RequestInput = z.infer<typeof requestInputSchema>;

export type MemberRequest = RequestInput &
  Stamped & {
    id: string;
    requestedBy: string;
    requestedByName: string;
    status: (typeof REQUEST_STATUSES)[number];
    urgent?: boolean;
    reviewedBy?: string;
    reviewNote?: string;
    reviewedAt?: TimestampLike;
    /** Id of the record created on approval (patient, issue, post…). */
    resultRef?: string;
  };

export const reviewRequestSchema = z.object({
  requestId: z.string().min(1),
  decision: z.enum(['approve', 'reject']),
  note: optionalText(1000),
  /** Extra data some approvals need, e.g. which equipment item to issue. */
  options: z.record(z.unknown()).optional(),
});
export type ReviewRequest = z.infer<typeof reviewRequestSchema>;

export type { RequestType };

import { z } from 'zod';
import { ROLES } from '../enums.js';
import type { TimestampLike } from './common.js';
import { hierarchySchema } from './common.js';

/** Custom claims on the Firebase Auth token. */
export interface SkampClaims {
  role?: (typeof ROLES)[number];
  /** Set for members (phone login) once their authUid is linked. */
  memberId?: string;
}

export const setRoleSchema = z.object({
  uid: z.string().min(1),
  role: z.enum(ROLES).nullable(),
});
export type SetRole = z.infer<typeof setRoleSchema>;

/** settings/unit — hierarchy codes and unit-wide switches. */
export const unitSettingsSchema = hierarchySchema.extend({
  unitName: z.string().trim().min(1),
  /** When true, members' own donor-detail edits go through a profile request. */
  donorEditsNeedApproval: z.boolean().default(false),
});
export type UnitSettings = z.infer<typeof unitSettingsSchema>;

export const DEFAULT_UNIT_SETTINGS: UnitSettings = {
  unitName: 'Amappoyil',
  unitCode: 'AMP',
  clusterCode: '',
  mekhalaCode: '',
  districtCode: '',
  donorEditsNeedApproval: false,
};

/** auditLogs/{auto} — written only by functions. */
export interface AuditLog {
  actor: string;
  actorRole?: string;
  action: 'create' | 'update' | 'delete';
  collection: string;
  target: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  changedFields: string[];
  at: TimestampLike;
}

import { HttpsError } from 'firebase-functions/v2/https';
import type { CallableRequest } from 'firebase-functions/v2/https';
import type { z } from 'zod';
import type { Role, SkampClaims } from '../shared';

export interface Caller {
  uid: string;
  role: Role;
  memberId?: string;
}

/** Throws unless the caller is signed in with one of the given roles. */
export function requireRole(request: CallableRequest, roles: readonly Role[]): Caller {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in first.');
  const claims = request.auth.token as SkampClaims;
  if (!claims.role || !roles.includes(claims.role)) {
    throw new HttpsError('permission-denied', 'Your role does not allow this action.');
  }
  return { uid: request.auth.uid, role: claims.role, memberId: claims.memberId };
}

/** Validates input with a Zod schema; failures become invalid-argument with the first message. */
export function parse<S extends z.ZodTypeAny>(schema: S, data: unknown): z.output<S> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const first = result.error.issues[0];
    const where = first?.path.length ? `${first.path.join('.')}: ` : '';
    throw new HttpsError('invalid-argument', `${where}${first?.message ?? 'Invalid input'}`, {
      issues: result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }
  return result.data;
}

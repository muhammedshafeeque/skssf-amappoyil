import { z } from 'zod';
import { normalizePhone, phone } from '../shared';

/** Accepts what people type ("98765 43210") and stores E.164. */
export const phoneInput = z.string().trim().min(1, 'Required').transform((v) => normalizePhone(v)).pipe(phone);

/** +919876543210 → +91 98765 43210 for display. */
export function prettyPhone(p: string | null | undefined): string {
  if (!p) return '';
  return p.startsWith('+91') && p.length === 13 ? `+91 ${p.slice(3, 8)} ${p.slice(8)}` : p;
}

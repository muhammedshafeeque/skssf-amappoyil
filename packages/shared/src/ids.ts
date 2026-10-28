import { MEMBER_ID_PREFIX } from './constants.js';

/** SKAMP + number padded to 3 digits: 1 → SKAMP001, 1000 → SKAMP1000. */
export function formatMemberId(n: number): string {
  if (!Number.isInteger(n) || n < 1) throw new Error(`Invalid member number: ${n}`);
  return `${MEMBER_ID_PREFIX}${String(n).padStart(3, '0')}`;
}

/** Inverse of formatMemberId; returns null for anything that isn't a Unit Member ID. */
export function parseMemberNumber(id: string): number | null {
  const m = new RegExp(`^${MEMBER_ID_PREFIX}(\\d{3,})$`).exec(id.trim().toUpperCase());
  return m ? Number(m[1]) : null;
}

/**
 * Normalise a phone number typed in India to E.164. Accepts "98765 43210", "09876543210",
 * "919876543210" and "+91 98765-43210". Numbers already starting with "+" keep their country code.
 */
export function normalizePhone(input: string, defaultCountryCode = '91'): string {
  const raw = input.trim();
  const digits = raw.replace(/\D/g, '');
  if (raw.startsWith('+')) return `+${digits}`;
  if (digits.length === 10) return `+${defaultCountryCode}${digits}`;
  if (digits.length === 11 && digits.startsWith('0')) return `+${defaultCountryCode}${digits.slice(1)}`;
  if (digits.length === 12 && digits.startsWith(defaultCountryCode)) return `+${digits}`;
  return `+${digits}`;
}

/** +919876543210 → +91 ••••••3210 (for showing which number an OTP went to). */
export function maskPhone(phone: string): string {
  const cc = phone.startsWith('+91') ? '+91' : phone.slice(0, phone.length - 10);
  return `${cc} ••••••${phone.slice(-4)}`;
}

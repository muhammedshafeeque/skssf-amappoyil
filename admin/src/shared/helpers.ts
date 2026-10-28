// GENERATED from functions/src/shared by scripts/sync-shared.mjs — edit there, not here.
import { BLOOD_GROUPS, DEFAULT_ELIGIBILITY_GAP_DAYS, DEFAULT_LOCATION, MEMBER_ID_PREFIX } from './constants';
import type { BloodGroup } from './constants';

/** 1 → SKAMP001, 1000 → SKAMP1000. */
export function formatMemberId(n: number): string {
  if (!Number.isInteger(n) || n < 1) throw new Error(`Invalid member number: ${n}`);
  return `${MEMBER_ID_PREFIX}${String(n).padStart(3, '0')}`;
}

export function isMemberId(id: string): boolean {
  return new RegExp(`^${MEMBER_ID_PREFIX}\\d{3,}$`).test(id);
}

/** Normalise an Indian phone typed in any common form to E.164; keeps explicit +country codes. */
export function normalizePhone(input: string, countryCode = '91'): string {
  const raw = input.trim();
  const digits = raw.replace(/\D/g, '');
  if (raw.startsWith('+')) return `+${digits}`;
  if (raw.startsWith('00')) return `+${digits.slice(2)}`;
  if (digits.length === 10) return `+${countryCode}${digits}`;
  if (digits.length === 11 && digits.startsWith('0')) return `+${countryCode}${digits.slice(1)}`;
  if (digits.length === 12 && digits.startsWith(countryCode)) return `+${digits}`;
  return `+${digits}`;
}

/** +919876543210 → ******3210 */
export function maskPhone(phone: string): string {
  return `******${phone.slice(-4)}`;
}

/** Days since a YYYY-MM-DD date (null if no date). */
export function daysSince(date: string | null | undefined, today = new Date()): number | null {
  if (!date) return null;
  const then = Date.parse(`${date}T00:00:00Z`);
  const now = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.floor((now - then) / 86_400_000);
}

export interface Eligibility {
  eligible: boolean;
  /** Days until eligible again (0 when eligible). */
  daysLeft: number;
  /** Date the donor becomes eligible (YYYY-MM-DD), null if never donated. */
  eligibleFrom: string | null;
}

export function donorEligibility(
  lastDonated: string | null | undefined,
  gapDays = DEFAULT_ELIGIBILITY_GAP_DAYS,
  today = new Date(),
): Eligibility {
  const since = daysSince(lastDonated, today);
  if (since === null) return { eligible: true, daysLeft: 0, eligibleFrom: null };
  const from = new Date(Date.parse(`${lastDonated}T00:00:00Z`) + gapDays * 86_400_000).toISOString().slice(0, 10);
  const daysLeft = Math.max(0, gapDays - since);
  return { eligible: daysLeft === 0, daysLeft, eligibleFrom: from };
}

/** Blood groups a patient with `recipient` can receive from. */
export function compatibleDonorGroups(recipient: BloodGroup): BloodGroup[] {
  const abo = recipient.replace(/[+-]/, '');
  const rhPositive = recipient.endsWith('+');
  return BLOOD_GROUPS.filter((g) => {
    const dAbo = g.replace(/[+-]/, '');
    const aboOk = dAbo === 'O' || dAbo === abo || abo === 'AB';
    const rhOk = rhPositive || g.endsWith('-');
    return aboOk && rhOk;
  });
}

export function isLocalPlace(place: string | undefined): boolean {
  return (place ?? '').trim().toLowerCase() === DEFAULT_LOCATION.place.toLowerCase();
}

/** Age in whole years from a YYYY-MM-DD date of birth. */
export function ageFrom(dob: string, today = new Date()): number {
  const [y, m, d] = dob.split('-').map(Number) as [number, number, number];
  let age = today.getFullYear() - y;
  if (today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d)) age -= 1;
  return age;
}

/** Turns rows into CSV text (RFC 4180 quoting). */
export function toCsv(rows: Record<string, unknown>[], columns?: string[]): string {
  const cols = columns ?? Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  const cell = (v: unknown) => {
    const s = v === null || v === undefined ? '' : Array.isArray(v) ? v.join('; ') : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(','), ...rows.map((r) => cols.map((c) => cell(r[c])).join(','))].join('\r\n');
}

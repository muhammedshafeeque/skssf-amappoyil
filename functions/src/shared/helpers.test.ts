import { describe, expect, it } from 'vitest';
import {
  compatibleDonorGroups,
  donationSchema,
  donorEligibility,
  donorSchema,
  formatMemberId,
  maskPhone,
  memberFields,
  normalizePhone,
  toCsv,
} from './index';

describe('helpers', () => {
  it('formats member IDs', () => {
    expect([1, 42, 999, 1000].map(formatMemberId)).toEqual(['SKAMP001', 'SKAMP042', 'SKAMP999', 'SKAMP1000']);
  });
  it('normalises and masks phones', () => {
    expect(normalizePhone('98765 43210')).toBe('+919876543210');
    expect(normalizePhone('09876543210')).toBe('+919876543210');
    expect(normalizePhone('+971 50 123 4567')).toBe('+971501234567');
    expect(maskPhone('+919876543210')).toBe('******3210');
  });
  it('computes eligibility with a configurable gap', () => {
    const today = new Date(2026, 9, 28);
    expect(donorEligibility(null, 90, today)).toEqual({ eligible: true, daysLeft: 0, eligibleFrom: null });
    expect(donorEligibility('2026-09-28', 90, today)).toMatchObject({ eligible: false, daysLeft: 60, eligibleFrom: '2026-12-27' });
    expect(donorEligibility('2026-06-01', 90, today).eligible).toBe(true);
    expect(donorEligibility('2026-09-28', 30, today).eligible).toBe(true);
  });
  it('knows compatible donor groups', () => {
    expect(compatibleDonorGroups('O-')).toEqual(['O-']);
    expect(compatibleDonorGroups('AB+')).toHaveLength(8);
    expect(compatibleDonorGroups('A-')).toEqual(['A-', 'O-']);
  });
  it('writes CSV with quoting', () => {
    expect(toCsv([{ a: 'x,y', b: 'say "hi"' }])).toBe('a,b\r\n"x,y","say ""hi"""');
  });
});

describe('schemas', () => {
  it('validates members', () => {
    expect(memberFields.safeParse({ name: 'A', phone: '987', bloodGroup: 'O', fatherName: 'F', houseName: 'H', address: 'X', dob: '1/1/90' }).success).toBe(false);
  });
  it('needs consent for non-member donors', () => {
    const d = { name: 'R', dob: '1990-01-01', bloodGroup: 'B+', phone: '+919800000000', location: { place: 'Amappoyil', state: 'Kerala', country: 'India' } };
    expect(donorSchema.safeParse({ ...d, consent: false }).success).toBe(false);
    expect(donorSchema.safeParse({ ...d, consent: true }).success).toBe(true);
  });
  it('validates donations', () => {
    const base = { mode: 'cash', date: '2026-11-01', purpose: 'General' };
    expect(donationSchema.safeParse({ ...base, direction: 'in', donorName: 'A' }).success).toBe(false);
    expect(donationSchema.safeParse({ ...base, direction: 'in', amount: 500, anonymous: true }).success).toBe(true);
    expect(donationSchema.safeParse({ ...base, direction: 'out', amount: 500 }).success).toBe(false);
    expect(donationSchema.safeParse({ ...base, direction: 'out', amount: 500, patientId: 'p1' }).success).toBe(true);
  });
});

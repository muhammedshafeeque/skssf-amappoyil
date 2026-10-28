import { describe, expect, it } from 'vitest';
import {
  COL,
  donationInputSchema,
  donorInputSchema,
  formatMemberId,
  maskPhone,
  memberInputSchema,
  normalizePhone,
  parseMemberNumber,
  patientInputSchema,
  requestInputSchema,
  REGION,
} from './index.js';

const member = {
  name: 'Muhammed Ali',
  phone: '+919876543210',
  dob: '1998-04-12',
  bloodGroup: 'O+',
  fatherName: 'Abdul Rahman',
  houseName: 'Puthiyapura',
  address: 'Amappoyil, Malappuram',
};

describe('constants', () => {
  it('uses asia-south1 and the agreed collection names', () => {
    expect(REGION).toBe('asia-south1');
    expect(COL.patientsPublic).toBe('patientsPublic');
  });
});

describe('member IDs and phones', () => {
  it('formats and parses SKAMP IDs', () => {
    expect(formatMemberId(1)).toBe('SKAMP001');
    expect(formatMemberId(42)).toBe('SKAMP042');
    expect(formatMemberId(1000)).toBe('SKAMP1000');
    expect(parseMemberNumber('skamp007')).toBe(7);
    expect(parseMemberNumber('SKAMP1')).toBeNull();
    expect(() => formatMemberId(0)).toThrow();
  });

  it('normalises Indian phone numbers to E.164 and masks them', () => {
    expect(normalizePhone('98765 43210')).toBe('+919876543210');
    expect(normalizePhone('09876543210')).toBe('+919876543210');
    expect(normalizePhone('919876543210')).toBe('+919876543210');
    expect(normalizePhone('+971 50 123 4567')).toBe('+971501234567');
    expect(maskPhone('+919876543210')).toBe('+91 ••••••3210');
  });
});

describe('memberInputSchema', () => {
  it('accepts a valid member and defaults wing tags', () => {
    const parsed = memberInputSchema.parse(member);
    expect(parsed.wingTags).toEqual([]);
    expect(parsed.skssfId).toBeUndefined();
  });

  it('rejects bad phone, date and blood group', () => {
    const r = memberInputSchema.safeParse({ ...member, phone: '9876543210', dob: '12/04/1998', bloodGroup: 'O' });
    expect(r.success).toBe(false);
    const fields = r.error!.issues.map((i) => i.path[0]);
    expect(fields).toEqual(expect.arrayContaining(['phone', 'dob', 'bloodGroup']));
  });
});

describe('donorInputSchema', () => {
  it('requires consent for non-member donors', () => {
    const donor = {
      name: 'Rashid',
      dob: '1990-01-01',
      bloodGroup: 'B+',
      phone: '+919800000000',
      location: { place: 'Amappoyil', state: 'Kerala', country: 'India' },
    };
    expect(donorInputSchema.safeParse({ ...donor, consent: false }).success).toBe(false);
    expect(donorInputSchema.parse({ ...donor, consent: true }).isAvailable).toBe(true);
  });
});

describe('patientInputSchema', () => {
  it('needs at least one support type and a known category', () => {
    const p = { name: 'X', age: 60, phone: '+919800000001', address: 'Y', need: 'Dialysis twice a week', category: 'dialysis' };
    expect(patientInputSchema.safeParse({ ...p, supportTypes: [] }).success).toBe(false);
    expect(patientInputSchema.parse({ ...p, supportTypes: ['medical'] }).status).toBe('pending');
  });
});

describe('donationInputSchema', () => {
  it('needs an amount or an item, and a donor unless anonymous', () => {
    const base = { mode: 'cash', date: '2026-11-01', purpose: 'General fund' };
    expect(donationInputSchema.safeParse({ ...base, donorName: 'A' }).success).toBe(false);
    expect(donationInputSchema.safeParse({ ...base, amount: 500 }).success).toBe(false);
    expect(donationInputSchema.safeParse({ ...base, amount: 500, isAnonymous: true }).success).toBe(true);
    expect(donationInputSchema.safeParse({ ...base, item: 'Rice 10kg', donorName: 'B', mode: 'inKind' }).success).toBe(true);
  });
});

describe('requestInputSchema', () => {
  it('validates payload by request type', () => {
    const blood = {
      type: 'blood',
      payload: {
        patientName: 'Fathima',
        bloodGroup: 'AB-',
        units: 2,
        hospital: 'MIMS Kozhikode',
        place: 'Kozhikode',
        contactPhone: '+919800000002',
        neededBy: '2026-11-02',
      },
    };
    expect(requestInputSchema.parse(blood)).toMatchObject({ type: 'blood', urgent: true });
    expect(requestInputSchema.safeParse({ type: 'profile', payload: { changes: {} } }).success).toBe(false);
    expect(requestInputSchema.safeParse({ type: 'unknown', payload: {} }).success).toBe(false);
  });
});

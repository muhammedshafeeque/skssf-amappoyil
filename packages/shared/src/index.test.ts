import { describe, expect, it } from 'vitest';
import { MEMBER_ID_PREFIX, REGION } from './index.js';

describe('shared constants', () => {
  it('exposes the functions region and member ID prefix', () => {
    expect(REGION).toBe('asia-south1');
    expect(MEMBER_ID_PREFIX).toBe('SKAMP');
  });
});

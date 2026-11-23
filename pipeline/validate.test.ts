import { check } from './validate';

describe('check', () => {
  const range = { min: 0, max: 0.2 };
  it('accepts a plausible value', () => expect(check(0.06, range, 0.055)).toEqual({ ok: true }));
  it('rejects NaN', () => expect(check(NaN, range).ok).toBe(false));
  it('rejects out-of-range values', () => expect(check(0.5, range).ok).toBe(false));
  it('rejects jumps above 30% from the previous value', () => expect(check(0.08, range, 0.055).ok).toBe(false));
  it('accepts any in-range value when there is no previous one', () => expect(check(0.08, range).ok).toBe(true));
});

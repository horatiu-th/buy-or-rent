import { annuityPayment } from './mortgage';

describe('annuityPayment', () => {
  it('matches the standard 30-year amortization value', () => {
    // 100,000 at 6% over 360 months is a textbook 599.55/month.
    expect(annuityPayment(300_000, 0.06, 360)).toBeCloseTo(1798.65, 2);
  });

  it('splits principal evenly at a zero rate', () => {
    expect(annuityPayment(120_000, 0, 120)).toBe(1000);
  });

  it('returns 0 for no principal or no months', () => {
    expect(annuityPayment(0, 0.05, 360)).toBe(0);
    expect(annuityPayment(100_000, 0.05, 0)).toBe(0);
  });
});

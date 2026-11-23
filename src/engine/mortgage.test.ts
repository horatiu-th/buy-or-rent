import { amortize, annuityPayment } from './mortgage';

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

describe('amortize', () => {
  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

  it('repays exactly the principal and ends at zero', () => {
    const s = amortize({ principal: 300_000, termMonths: 360, fixedRate: 0.06, fixedMonths: 360, variableRate: 0.08 });
    expect(s).toHaveLength(360);
    expect(sum(s.map((m) => m.principal))).toBeCloseTo(300_000, 6);
    expect(s[359].balance).toBe(0);
  });

  it('keeps a constant payment while fixed', () => {
    const s = amortize({ principal: 300_000, termMonths: 360, fixedRate: 0.06, fixedMonths: 360, variableRate: 0.08 });
    expect(s[0].payment).toBeCloseTo(1798.65, 2);
    expect(s[200].payment).toBeCloseTo(1798.65, 2);
  });

  it('recalculates the payment on the remaining balance after the fixed period', () => {
    const s = amortize({ principal: 300_000, termMonths: 360, fixedRate: 0.05, fixedMonths: 60, variableRate: 0.07 });
    const expected = annuityPayment(s[59].balance, 0.07, 300);
    expect(s[60].payment).toBeCloseTo(expected, 6);
    expect(s[60].interest).toBeCloseTo(s[59].balance * 0.07 / 12, 6);
  });

  it('uses the variable rate from the start when fixedMonths is 0', () => {
    const s = amortize({ principal: 100_000, termMonths: 120, fixedRate: 0.03, fixedMonths: 0, variableRate: 0.07 });
    expect(s[0].payment).toBeCloseTo(annuityPayment(100_000, 0.07, 120), 6);
  });

  it('returns all-zero months for a zero loan', () => {
    const s = amortize({ principal: 0, termMonths: 12, fixedRate: 0.05, fixedMonths: 12, variableRate: 0.05 });
    expect(s.every((m) => m.payment === 0 && m.balance === 0)).toBe(true);
  });
});

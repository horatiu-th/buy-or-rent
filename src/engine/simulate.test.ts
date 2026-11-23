import { simulate } from './simulate';
import { acquisitionCosts } from './costs';
import { baseInputs, flatWorld } from './fixtures';

const last = <T,>(xs: T[]) => xs[xs.length - 1];

describe('simulate', () => {
  it('produces one row per month plus month 0', () => {
    expect(simulate(baseInputs).rows).toHaveLength(30 * 12 + 1);
  });

  it('starts the renter ahead by exactly the sunk acquisition costs', () => {
    const i = { ...baseInputs, includeSaleCosts: false };
    const r0 = simulate(i).rows[0];
    expect(r0.renterNetWorth - r0.buyerNetWorth).toBeCloseTo(acquisitionCosts(i), 6);
  });

  it('spends the same total cash on both sides', () => {
    const { buyer, renter } = simulate(baseInputs);
    expect(buyer.cashOut).toBeCloseTo(renter.cashOut, 4);
  });

  it('in a flat world with a cash purchase and free rent, the gap is only the fees', () => {
    const i = { ...flatWorld, downPaymentPct: 1, rent: 0, notaryPct: 0.01 };
    const end = last(simulate(i).rows);
    expect(end.buyerNetWorth).toBeCloseTo(i.price, 6);
    expect(end.renterNetWorth - end.buyerNetWorth).toBeCloseTo(i.price * 0.01, 6);
  });

  it('pays off the loan by the end of the term', () => {
    const { rows } = simulate(baseInputs);
    expect(rows[360].loanBalance).toBe(0);
  });

  it('favours renting when rent is tiny and buying when rent is huge', () => {
    const cheap = last(simulate({ ...baseInputs, rent: 100 }).rows);
    const pricey = last(simulate({ ...baseInputs, rent: 10_000 }).rows);
    expect(cheap.renterNetWorth).toBeGreaterThan(cheap.buyerNetWorth);
    expect(pricey.buyerNetWorth).toBeGreaterThan(pricey.renterNetWorth);
  });

  it('raises rent once per year', () => {
    const { rows } = simulate({ ...flatWorld, rentGrowth: 0.1 });
    expect(rows[12].renterMonthlyCost).toBeCloseTo(2_500, 6);
    expect(rows[13].renterMonthlyCost).toBeCloseTo(2_750, 6);
  });

  it('exposes a deflator that grows with inflation', () => {
    const { rows } = simulate({ ...baseInputs, inflation: 0.05 });
    expect(rows[12].deflator).toBeCloseTo(1.05, 6);
  });

  it('reports a break-even month only when the buyer stays ahead', () => {
    const r = simulate({ ...baseInputs, rent: 10_000 });
    expect(r.breakEvenMonth).not.toBeNull();
    const after = r.rows.filter((row) => row.month >= r.breakEvenMonth!);
    expect(after.every((row) => row.buyerNetWorth >= row.renterNetWorth)).toBe(true);
    expect(simulate({ ...baseInputs, rent: 100 }).breakEvenMonth).toBeNull();
  });
});

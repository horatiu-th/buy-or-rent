import { equivalentRent, finalGap, sensitivity } from './solve';
import { simulate } from './simulate';
import { baseInputs, flatWorld } from './fixtures';
import type { Inputs } from './types';

const finalBuyerAhead = (i: Inputs) => {
  const rows = simulate(i).rows;
  const end = rows[rows.length - 1];
  return end.buyerNetWorth >= end.renterNetWorth;
};

describe('equivalentRent', () => {
  it('finds the rent at which both sides end equal', () => {
    const r = equivalentRent(baseInputs);
    expect(r.kind).toBe('value');
    if (r.kind !== 'value') return;
    expect(Math.abs(finalGap({ ...baseInputs, rent: r.rent }))).toBeLessThan(1);
  });

  it('reports alwaysBuy when buying wins even at zero rent', () => {
    expect(equivalentRent({ ...baseInputs, propertyGrowth: 0.2 }).kind).toBe('alwaysBuy');
  });

  it('finds a rent far above 2% of the price when owning is ruinously expensive', () => {
    const i = { ...baseInputs, propertyGrowth: -0.1, investReturn: 0.15, fixedRate: 0.4, ircc: 0.4, irccLongRun: 0.4 };
    const r = equivalentRent(i);
    expect(r.kind).toBe('value');
    if (r.kind !== 'value') return;
    expect(r.rent).toBeGreaterThan(i.price * 0.02);
    expect(Math.abs(finalGap({ ...i, rent: r.rent }))).toBeLessThan(1);
  });

  it('reports alwaysRent when no rent lets the buyer catch up', () => {
    // A ten-year rent deposit sitting idle outweighs the few months of savings that survive a
    // collapsing market, so a higher rent only widens the renter's lead.
    const i = { ...baseInputs, propertyGrowth: -0.99, investReturn: -0.99, rentGrowth: 0, depositMonths: 120 };
    expect(equivalentRent(i).kind).toBe('alwaysRent');
  });

  it.each([0, 1, 1_000])('agrees with the simulation for a nearly free home (price %d)', (price) => {
    const i = { ...baseInputs, price };
    const r = equivalentRent(i);
    expect(r.kind).not.toBe('alwaysRent');
    expect(finalBuyerAhead({ ...i, rent: 500 })).toBe(true);
    if (r.kind === 'value') expect(Math.abs(finalGap({ ...i, rent: r.rent }))).toBeLessThan(1);
  });

  it('does not depend on the rent entered', () => {
    expect(equivalentRent({ ...baseInputs, rent: 100 })).toEqual(equivalentRent({ ...baseInputs, rent: 9_000 }));
  });

  it('reports invalid when the simulation overflows', () => {
    expect(equivalentRent({ ...baseInputs, price: Number.MAX_VALUE })).toEqual({ kind: 'invalid' });
    expect(equivalentRent({ ...baseInputs, price: 1e306, propertyGrowth: 0.3 })).toEqual({ kind: 'invalid' });
  });

  it.each([NaN, Infinity, -Infinity])('treats a price of %d like any other sanitized input', (price) => {
    const r = equivalentRent({ ...baseInputs, price });
    expect(r).toEqual(equivalentRent({ ...baseInputs, price: 0 }));
  });
});

describe('finalGap', () => {
  // The bisection relies on the buyer's final lead growing with rent.
  it.each([
    ['base case', baseInputs],
    ['cash purchase', { ...baseInputs, downPaymentPct: 1 }],
    ['short horizon', { ...baseInputs, horizonYears: 3 }],
    ['flat world', flatWorld],
    ['falling prices, high returns', { ...baseInputs, propertyGrowth: -0.05, investReturn: 0.12 }],
    ['large deposit, no rent growth', { ...baseInputs, depositMonths: 12, rentGrowth: 0 }],
  ])('does not decrease as rent rises (%s)', (_, i: Inputs) => {
    const rents = [0, 250, 1_000, 2_500, 5_000, 10_000, 50_000];
    const gaps = rents.map((rent) => finalGap({ ...i, rent }));
    for (let k = 1; k < gaps.length; k++) expect(gaps[k]).toBeGreaterThanOrEqual(gaps[k - 1]);
  });
});

describe('sensitivity', () => {
  it('returns a 3×3 grid whose centre is the base case', () => {
    const g = sensitivity(baseInputs);
    expect(g).toHaveLength(3);
    expect(g[1][1]).toBeCloseTo(finalGap(baseInputs), 6);
    // Higher property growth helps the buyer.
    expect(g[2][1]).toBeGreaterThan(g[0][1]);
  });
});

import { equivalentRent, finalGap, sensitivity } from './solve';
import { baseInputs } from './fixtures';

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

  it('reports alwaysRent when renting wins at any plausible rent', () => {
    // Collapsing prices alone aren't enough: at the search's top rent the buyer's lower monthly cost
    // is invested, and a high return rewards that. Ruinous loan rates make owning cost more every month.
    const i = { ...baseInputs, propertyGrowth: -0.1, investReturn: 0.15, fixedRate: 0.4, ircc: 0.4 };
    expect(equivalentRent(i).kind).toBe('alwaysRent');
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

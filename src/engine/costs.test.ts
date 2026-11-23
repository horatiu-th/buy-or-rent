import { acquisitionCosts, saleCosts } from './costs';
import { baseInputs } from './fixtures';

describe('acquisitionCosts', () => {
  it('adds percentage fees on price plus fixed bank fees', () => {
    // 500,000 × (1% + 0.15%) + 1,500
    expect(acquisitionCosts(baseInputs)).toBeCloseTo(7_250, 6);
  });
});

describe('saleCosts', () => {
  it('uses the short-hold tax rate up to and including the last month of the threshold', () => {
    expect(saleCosts(600_000, 36, baseInputs)).toBeCloseTo(600_000 * (0.02 + 0.03), 6);
  });

  it('uses the long-hold tax rate from the first month after the threshold', () => {
    expect(saleCosts(600_000, 37, baseInputs)).toBeCloseTo(600_000 * (0.02 + 0.01), 6);
  });

  it('is zero when sale costs are excluded', () => {
    expect(saleCosts(600_000, 120, { ...baseInputs, includeSaleCosts: false })).toBe(0);
  });
});

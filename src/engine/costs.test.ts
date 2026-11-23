import { acquisitionCosts, mortgageSetupCosts, saleCosts } from './costs';
import { baseInputs } from './fixtures';

describe('acquisitionCosts', () => {
  it('adds percentage fees on price, fixed bank fees and the loan-based mortgage fees', () => {
    // 500,000 × (1% notary + 0.15% registry + 2% buyer agency) + 1,500, plus the fees on a 425,000 loan
    expect(acquisitionCosts(baseInputs)).toBeCloseTo(17_250 + mortgageSetupCosts(425_000), 6);
  });

  it('has no mortgage fees for a cash purchase', () => {
    expect(acquisitionCosts({ ...baseInputs, downPaymentPct: 1 })).toBeCloseTo(17_250, 6);
  });
});

describe('mortgageSetupCosts', () => {
  it('charges 0.1% of the loan plus the lower notary fee with VAT up to the step', () => {
    expect(mortgageSetupCosts(500_000)).toBeCloseTo(500 + 750 * 1.21, 6);
  });

  it('charges the higher notary fee above the step', () => {
    expect(mortgageSetupCosts(500_001)).toBeCloseTo(500.001 + 1_500 * 1.21, 6);
  });

  it('is zero without a loan', () => expect(mortgageSetupCosts(0)).toBe(0));
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

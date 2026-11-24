import { acquisitionCosts, mortgageNotaryFee, mortgageSetupCosts, saleCostBreakdown, saleCosts } from './costs';
import { baseInputs } from './fixtures';

describe('acquisitionCosts', () => {
  it('adds percentage fees on price, fixed bank fees and the loan-based mortgage fees', () => {
    // 500,000 × (1% notary + 0.15% registry + 2% buyer agency) + 1,500, plus the fees on a 425,000 loan
    expect(acquisitionCosts(baseInputs)).toBeCloseTo(17_250 + mortgageSetupCosts(425_000), 6);
  });

  it('charges neither bank fees nor mortgage fees for a cash purchase', () => {
    expect(acquisitionCosts({ ...baseInputs, downPaymentPct: 1 })).toBeCloseTo(15_750, 6);
  });
});

describe('mortgageNotaryFee', () => {
  // Order 177/C/2024, annex 2, point V: guarantee contracts, on the amount secured, before VAT.
  it.each([
    [10_000, 150], // 0.85% would be 85, below the 150 lei minimum
    [50_000, 425],
    [75_000, 425 + 25_000 * 0.005],
    [150_000, 750 + 50_000 * 0.0046],
    [425_000, 1_209 + 225_000 * 0.0019],
    [600_000, 1_778 + 100_000 * 0.001],
  ])('charges the scale fee on a %d lei loan', (loan, fee) => {
    expect(mortgageNotaryFee(loan)).toBeCloseTo(fee, 6);
  });

  it('is zero without a loan', () => expect(mortgageNotaryFee(0)).toBe(0));
});

describe('mortgageSetupCosts', () => {
  it('charges 0.1% of the loan plus the notary fee with VAT', () => {
    expect(mortgageSetupCosts(425_000)).toBeCloseTo(425 + mortgageNotaryFee(425_000) * 1.21, 6);
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

it.each([
  [36, true, 18_000, 12_000],
  [37, true, 6_000, 12_000],
  [37, false, 0, 0],
] as const)('separates sale tax and commission at month %i with sale costs %s', (month, includeSaleCosts, tax, agencyFee) => {
  expect(saleCostBreakdown(600_000, month, { ...baseInputs, includeSaleCosts })).toEqual({ tax, agencyFee });
});

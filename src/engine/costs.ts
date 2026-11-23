import type { Inputs } from './types';

// Fees that scale with the loan rather than the price: land-registry registration of the mortgage
// (a share of the loan) and the notary's minimum fee for the mortgage contract, which steps up for
// larger loans. Both are set by tariff, so they are fixed here rather than offered as inputs.
export const MORTGAGE_REGISTRY_PCT = 0.001;
export const MORTGAGE_NOTARY_STEP = 500_000;
export const MORTGAGE_NOTARY_FEES = { upToStep: 750, aboveStep: 1_500 };
export const VAT = 0.21;

export function mortgageSetupCosts(loan: number): number {
  if (loan <= 0) return 0;
  const notary = loan <= MORTGAGE_NOTARY_STEP ? MORTGAGE_NOTARY_FEES.upToStep : MORTGAGE_NOTARY_FEES.aboveStep;
  return loan * MORTGAGE_REGISTRY_PCT + notary * (1 + VAT);
}

export function acquisitionCosts(i: Inputs): number {
  const loan = i.price * (1 - i.downPaymentPct);
  return i.price * (i.notaryPct + i.registryPct + i.buyerAgencyPct) + i.bankFees + mortgageSetupCosts(loan);
}

export function saleCosts(value: number, monthsHeld: number, i: Inputs): number {
  if (!i.includeSaleCosts) return 0;
  const taxPct = monthsHeld <= i.saleTaxShortHoldYears * 12 ? i.saleTaxShortPct : i.saleTaxLongPct;
  return value * (i.saleAgencyPct + taxPct);
}

import type { Inputs } from './types';

// Fees that scale with the loan rather than the price: land-registry registration of the mortgage
// (a share of the loan) and the notary's fee for the mortgage contract. Both are set by tariff, so
// they are fixed here rather than offered as inputs.
export const MORTGAGE_REGISTRY_PCT = 0.001;
export const VAT = 0.21;

/**
 * Minimum notary fee for the contract that sets up the mortgage, before VAT: the progressive scale for
 * guarantee contracts in Order 177/C/2024 (annex 2, point V), charged on the amount the mortgage secures.
 * Each bracket is a fixed amount plus a share of the part above the bracket's start, as the order prints
 * them. The flat 750 / 1,500 lei amounts in the same order cover state-programme loans (Prima Casă and
 * other social programmes) and later contracts securing the same debt, not an ordinary first mortgage.
 */
const MORTGAGE_NOTARY_BRACKETS = [
  { from: 0, base: 0, pct: 0.0085 },
  { from: 50_000, base: 425, pct: 0.005 },
  { from: 100_000, base: 750, pct: 0.0046 },
  { from: 200_000, base: 1_209, pct: 0.0019 },
  { from: 500_000, base: 1_778, pct: 0.001 },
] as const;
export const MORTGAGE_NOTARY_MIN = 150;

export function mortgageNotaryFee(loan: number): number {
  if (loan <= 0) return 0;
  const b = [...MORTGAGE_NOTARY_BRACKETS].reverse().find((x) => loan > x.from)!;
  return Math.max(MORTGAGE_NOTARY_MIN, b.base + (loan - b.from) * b.pct);
}

export function mortgageSetupCosts(loan: number): number {
  if (loan <= 0) return 0;
  return loan * MORTGAGE_REGISTRY_PCT + mortgageNotaryFee(loan) * (1 + VAT);
}

/** One-off costs of buying, other than the down payment and any fit-out. Bank fees exist only with a loan. */
export function acquisitionCosts(i: Inputs): number {
  const loan = i.price * (1 - i.downPaymentPct);
  const bank = loan > 0 ? i.bankFees : 0;
  return i.price * (i.notaryPct + i.registryPct + i.buyerAgencyPct) + bank + mortgageSetupCosts(loan);
}

export function saleCostBreakdown(value: number, monthsHeld: number, i: Inputs) {
  if (!i.includeSaleCosts) return { agencyFee: 0, tax: 0 };
  const taxPct = monthsHeld <= i.saleTaxShortHoldYears * 12 ? i.saleTaxShortPct : i.saleTaxLongPct;
  return { agencyFee: value * i.saleAgencyPct, tax: value * taxPct };
}

export function saleCosts(value: number, monthsHeld: number, i: Inputs): number {
  const { agencyFee, tax } = saleCostBreakdown(value, monthsHeld, i);
  return agencyFee + tax;
}

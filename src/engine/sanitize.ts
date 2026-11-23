import type { Inputs } from './types';

// A rate of -100% or below makes (1 + r)^(1/12) zero or NaN, so growth rates stop just short of it.
const MIN_RATE = -0.99;

const NON_NEGATIVE = [
  'price', 'rent', 'notaryPct', 'registryPct', 'bankFees', 'propertyTaxPct', 'homeInsuranceAnnual',
  'lifeInsurancePct', 'maintenancePct', 'renterInsuranceAnnual', 'depositMonths', 'investTaxRate',
  'saleAgencyPct', 'saleTaxShortPct', 'saleTaxLongPct', 'saleTaxShortHoldYears',
] as const satisfies readonly (keyof Inputs)[];

const GROWTH_RATES = ['propertyGrowth', 'rentGrowth', 'investReturn', 'inflation'] as const satisfies readonly (keyof Inputs)[];

/** Clamps inputs into the range the simulation is defined for, so UI edge cases can't produce NaN or a free loan. */
export function sanitizeInputs(i: Inputs): Inputs {
  const s: Inputs = { ...i };
  for (const k of NON_NEGATIVE) s[k] = Math.max(0, s[k]);
  for (const k of GROWTH_RATES) s[k] = Math.max(MIN_RATE, s[k]);
  s.downPaymentPct = Math.min(1, Math.max(0, s.downPaymentPct));
  s.fixedYears = Math.max(0, s.fixedYears);
  s.horizonYears = Math.max(1, s.horizonYears);
  // A zero-month schedule would leave the loan unpaid and interest-free.
  const hasLoan = s.price * (1 - s.downPaymentPct) > 0;
  if (hasLoan) s.loanTermYears = Math.max(1, s.loanTermYears);
  return s;
}

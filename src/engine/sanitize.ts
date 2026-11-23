import type { Inputs } from './types';

export const MIN_HORIZON_YEARS = 1;
export const MAX_HORIZON_YEARS = 50;
export const MIN_LOAN_TERM_YEARS = 1;
export const MAX_LOAN_TERM_YEARS = 35;

// A rate of -100% or below makes (1 + r)^(1/12) zero or NaN, so growth rates stop just short of it.
const MIN_RATE = -0.99;

const NON_NEGATIVE = [
  'price', 'rent', 'notaryPct', 'registryPct', 'bankFees', 'propertyTaxPct', 'homeInsuranceAnnual',
  'lifeInsurancePct', 'maintenancePct', 'renterInsuranceAnnual', 'depositMonths', 'saleAgencyPct',
  'saleTaxShortHoldYears', 'fixedYears', 'fixedRate', 'ircc', 'variableMargin',
] as const satisfies readonly (keyof Inputs)[];

const TAX_RATES = ['investTaxRate', 'savingsTaxRate', 'saleTaxShortPct', 'saleTaxLongPct'] as const satisfies readonly (keyof Inputs)[];

const GROWTH_RATES = ['propertyGrowth', 'rentGrowth', 'investReturn', 'savingsRate', 'inflation'] as const satisfies readonly (keyof Inputs)[];

// The simulation steps in whole months and the schedule in whole years of fixed and total term.
const WHOLE_NUMBERS = ['horizonYears', 'loanTermYears', 'fixedYears', 'depositMonths'] as const satisfies readonly (keyof Inputs)[];

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

/**
 * Brings inputs into the range the simulation is defined for, so a bad field or shared link can't
 * produce NaN, a loan the bank pays for, a tax above 100% or a run of unbounded length.
 */
export function sanitizeInputs(i: Inputs): Inputs {
  const s: Inputs = { ...i };
  // Math.max/min pass NaN through, so non-finite values are replaced before any clamping.
  for (const k of Object.keys(s) as (keyof Inputs)[]) {
    const v = s[k];
    if (typeof v === 'number' && !Number.isFinite(v)) (s as Record<keyof Inputs, unknown>)[k] = 0;
  }
  if (!Number.isFinite(i.horizonYears)) s.horizonYears = MIN_HORIZON_YEARS;
  if (!Number.isFinite(i.loanTermYears)) s.loanTermYears = MIN_LOAN_TERM_YEARS;

  for (const k of WHOLE_NUMBERS) s[k] = Math.round(s[k]);
  for (const k of NON_NEGATIVE) s[k] = Math.max(0, s[k]);
  for (const k of TAX_RATES) s[k] = clamp(s[k], 0, 1);
  for (const k of GROWTH_RATES) s[k] = Math.max(MIN_RATE, s[k]);
  s.downPaymentPct = clamp(s.downPaymentPct, 0, 1);
  s.horizonYears = clamp(s.horizonYears, MIN_HORIZON_YEARS, MAX_HORIZON_YEARS);
  // A zero-month schedule would leave the loan unpaid and interest-free; without a loan the term is unused.
  const hasLoan = s.price * (1 - s.downPaymentPct) > 0;
  s.loanTermYears = clamp(s.loanTermYears, hasLoan ? MIN_LOAN_TERM_YEARS : 0, MAX_LOAN_TERM_YEARS);
  return s;
}

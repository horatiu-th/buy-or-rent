import {
  MAX_HORIZON_YEARS, MAX_LOAN_TERM_YEARS, MIN_HORIZON_YEARS, MIN_LOAN_TERM_YEARS, type Inputs,
} from '../engine';

export type Unit = 'money' | 'pct' | 'years' | 'months' | 'bool';

/** Where a field sits in the panel. Buying has enough fields that it splits into smaller topics. */
export type Topic =
  | 'home' | 'loan' | 'purchaseCosts' | 'ownershipCosts' | 'sale'
  | 'renting' | 'general';

export interface FieldDef {
  key: keyof Inputs;
  unit: Unit;
  topic: Topic;
  min?: number;
  max?: number;
  step?: number;
}

// The simulation accepts any finite number, so amounts get generous ceilings here: far above any real
// home in Romania, low enough that the sums can't overflow.
export const FIELDS: FieldDef[] = [
  { key: 'price', unit: 'money', topic: 'home', min: 0, max: 100_000_000, step: 1000 },
  { key: 'downPaymentPct', unit: 'pct', topic: 'home', min: 0, max: 1, step: 0.01 },
  { key: 'propertyGrowth', unit: 'pct', topic: 'home', min: -0.2, max: 0.3, step: 0.005 },

  { key: 'fixedRate', unit: 'pct', topic: 'loan', min: 0, max: 0.3, step: 0.001 },
  { key: 'fixedYears', unit: 'years', topic: 'loan', min: 0, max: 30, step: 1 },
  { key: 'ircc', unit: 'pct', topic: 'loan', min: 0, max: 0.3, step: 0.001 },
  { key: 'irccLongRun', unit: 'pct', topic: 'loan', min: 0, max: 0.3, step: 0.001 },
  { key: 'variableMargin', unit: 'pct', topic: 'loan', min: 0, max: 0.1, step: 0.001 },
  { key: 'loanTermYears', unit: 'years', topic: 'loan', min: MIN_LOAN_TERM_YEARS, max: MAX_LOAN_TERM_YEARS, step: 1 },

  { key: 'notaryPct', unit: 'pct', topic: 'purchaseCosts', min: 0, max: 0.1, step: 0.001 },
  { key: 'registryPct', unit: 'pct', topic: 'purchaseCosts', min: 0, max: 0.05, step: 0.0005 },
  { key: 'bankFees', unit: 'money', topic: 'purchaseCosts', min: 0, max: 1_000_000, step: 100 },
  { key: 'buyerAgencyPct', unit: 'pct', topic: 'purchaseCosts', min: 0, max: 0.1, step: 0.001 },

  { key: 'propertyTaxAnnual', unit: 'money', topic: 'ownershipCosts', min: 0, max: 100_000, step: 10 },
  { key: 'homeInsuranceAnnual', unit: 'money', topic: 'ownershipCosts', min: 0, max: 100_000, step: 10 },
  { key: 'homeInsurancePct', unit: 'pct', topic: 'ownershipCosts', min: 0, max: 0.02, step: 0.0005 },
  { key: 'lifeInsurancePct', unit: 'pct', topic: 'ownershipCosts', min: 0, max: 0.05, step: 0.0005 },
  { key: 'maintenancePct', unit: 'pct', topic: 'ownershipCosts', min: 0, max: 0.1, step: 0.001 },

  { key: 'includeSaleCosts', unit: 'bool', topic: 'sale' },
  { key: 'saleAgencyPct', unit: 'pct', topic: 'sale', min: 0, max: 0.1, step: 0.005 },
  { key: 'saleTaxShortPct', unit: 'pct', topic: 'sale', min: 0, max: 0.2, step: 0.005 },
  { key: 'saleTaxLongPct', unit: 'pct', topic: 'sale', min: 0, max: 0.2, step: 0.005 },
  { key: 'saleTaxShortHoldYears', unit: 'years', topic: 'sale', min: 0, max: 20, step: 1 },

  { key: 'rent', unit: 'money', topic: 'renting', min: 0, max: 1_000_000, step: 50 },
  { key: 'rentGrowth', unit: 'pct', topic: 'renting', min: -0.2, max: 0.3, step: 0.005 },
  { key: 'depositMonths', unit: 'months', topic: 'renting', min: 0, max: 12, step: 1 },
  { key: 'rentAgencyPct', unit: 'pct', topic: 'renting', min: 0, max: 3, step: 0.05 },
  { key: 'renterInsuranceAnnual', unit: 'money', topic: 'renting', min: 0, max: 100_000, step: 50 },

  { key: 'investReturn', unit: 'pct', topic: 'renting', min: -0.2, max: 0.3, step: 0.005 },
  { key: 'investTaxRate', unit: 'pct', topic: 'renting', min: 0, max: 0.5, step: 0.01 },

  { key: 'horizonYears', unit: 'years', topic: 'general', min: MIN_HORIZON_YEARS, max: MAX_HORIZON_YEARS, step: 1 },
  { key: 'inflation', unit: 'pct', topic: 'general', min: -0.1, max: 0.5, step: 0.005 },
];

/** Periods measured in years or months are counts; the inputs step by one and the labels read as whole numbers. */
export const isWholeField = (def: FieldDef) => def.unit === 'years' || def.unit === 'months';

/**
 * The one place a number becomes a valid field value, used both for typed input and for values
 * read from a link, so the field, the URL and the simulation always agree.
 */
export function normalizeField(def: FieldDef, n: number): number {
  let v = n;
  if (def.min !== undefined) v = Math.max(def.min, v);
  if (def.max !== undefined) v = Math.min(def.max, v);
  return isWholeField(def) ? Math.round(v) : v;
}

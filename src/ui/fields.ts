import {
  clamp, MAX_HORIZON_YEARS, MAX_LOAN_TERM_YEARS, MIN_HORIZON_YEARS, MIN_LOAN_TERM_YEARS, type Inputs,
} from '../engine';

export type NumberUnit = 'money' | 'pct' | 'years' | 'months';
export type Unit = NumberUnit | 'bool';

type KeysOfType<T> = { [K in keyof Inputs]: Inputs[K] extends T ? K : never }[keyof Inputs];
export type BoolKey = KeysOfType<boolean>;
export type NumberKey = KeysOfType<number>;

/** Where a field sits in the panel. Buying has enough fields that it splits into smaller topics. */
export type Topic =
  | 'home' | 'loan' | 'purchaseCosts' | 'ownershipCosts' | 'sale'
  | 'renting' | 'general';

export interface BoolFieldDef {
  key: BoolKey;
  unit: 'bool';
  topic: Topic;
}

export interface NumberFieldDef {
  key: NumberKey;
  unit: NumberUnit;
  topic: Topic;
  min?: number;
  max?: number;
  step?: number;
}

/** A field's unit decides its value type, so a switch can never be bound to a number input or vice versa. */
export type FieldDef = BoolFieldDef | NumberFieldDef;

// The simulation accepts any finite number, so amounts get generous ceilings here: far above any real
// home in Romania, low enough that the sums can't overflow.
export const FIELDS: readonly FieldDef[] = [
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
  { key: 'fitOutCost', unit: 'money', topic: 'purchaseCosts', min: 0, max: 1_000_000, step: 1000 },

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
  { key: 'moveEveryYears', unit: 'years', topic: 'renting', min: 0, max: 30, step: 1 },
  { key: 'moveCost', unit: 'money', topic: 'renting', min: 0, max: 100_000, step: 100 },
  { key: 'renterInsuranceAnnual', unit: 'money', topic: 'renting', min: 0, max: 100_000, step: 50 },

  { key: 'investReturn', unit: 'pct', topic: 'renting', min: -0.2, max: 0.3, step: 0.005 },
  { key: 'investTaxRate', unit: 'pct', topic: 'renting', min: 0, max: 0.5, step: 0.01 },

  { key: 'horizonYears', unit: 'years', topic: 'general', min: MIN_HORIZON_YEARS, max: MAX_HORIZON_YEARS, step: 1 },
  { key: 'inflation', unit: 'pct', topic: 'general', min: -0.1, max: 0.5, step: 0.005 },
];

const FIELD_BY_KEY = new Map<string, FieldDef>(FIELDS.map((f) => [f.key, f]));

/** The field for an input key. Every input has one; a string from a link may match none. */
export function fieldDef(key: BoolKey): BoolFieldDef;
export function fieldDef(key: NumberKey): NumberFieldDef;
export function fieldDef(key: string): FieldDef | undefined;
export function fieldDef(key: string): FieldDef | undefined {
  return FIELD_BY_KEY.get(key);
}

export const isNumberField = (def: FieldDef): def is NumberFieldDef => def.unit !== 'bool';

/** Periods measured in years or months are counts; the inputs step by one and the labels read as whole numbers. */
export const isWholeField = (def: FieldDef) => def.unit === 'years' || def.unit === 'months';

/**
 * The one place a number becomes a valid field value, used both for typed input and for values
 * read from a link, so the field, the URL and the simulation always agree.
 */
export function normalizeField(def: NumberFieldDef, n: number): number {
  const v = clamp(n, def.min ?? -Infinity, def.max ?? Infinity);
  return isWholeField(def) ? Math.round(v) : v;
}

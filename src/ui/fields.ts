import type { Inputs } from '../engine';

export type Unit = 'money' | 'pct' | 'years' | 'months' | 'bool';

/** Where a field sits in the panel. Buying has enough fields that it splits into smaller topics. */
export type Topic =
  | 'home' | 'loan' | 'purchaseCosts' | 'ownershipCosts' | 'sale'
  | 'renting' | 'investing' | 'general';

export interface FieldDef {
  key: keyof Inputs;
  unit: Unit;
  topic: Topic;
  min?: number;
  max?: number;
  step?: number;
}

export const FIELDS: FieldDef[] = [
  { key: 'price', unit: 'money', topic: 'home', min: 0, step: 1000 },
  { key: 'downPaymentPct', unit: 'pct', topic: 'home', min: 0, max: 1, step: 0.01 },
  { key: 'propertyGrowth', unit: 'pct', topic: 'home', min: -0.2, max: 0.3, step: 0.005 },

  { key: 'fixedRate', unit: 'pct', topic: 'loan', min: 0, max: 0.3, step: 0.001 },
  { key: 'fixedYears', unit: 'years', topic: 'loan', min: 0, max: 30, step: 1 },
  { key: 'ircc', unit: 'pct', topic: 'loan', min: 0, max: 0.3, step: 0.001 },
  { key: 'variableMargin', unit: 'pct', topic: 'loan', min: 0, max: 0.1, step: 0.001 },
  { key: 'loanTermYears', unit: 'years', topic: 'loan', min: 1, max: 35, step: 1 },

  { key: 'notaryPct', unit: 'pct', topic: 'purchaseCosts', min: 0, max: 0.1, step: 0.001 },
  { key: 'registryPct', unit: 'pct', topic: 'purchaseCosts', min: 0, max: 0.05, step: 0.0005 },
  { key: 'bankFees', unit: 'money', topic: 'purchaseCosts', min: 0, step: 100 },

  { key: 'propertyTaxPct', unit: 'pct', topic: 'ownershipCosts', min: 0, max: 0.05, step: 0.0005 },
  { key: 'homeInsuranceAnnual', unit: 'money', topic: 'ownershipCosts', min: 0, step: 50 },
  { key: 'lifeInsurancePct', unit: 'pct', topic: 'ownershipCosts', min: 0, max: 0.05, step: 0.0005 },
  { key: 'maintenancePct', unit: 'pct', topic: 'ownershipCosts', min: 0, max: 0.1, step: 0.001 },

  { key: 'includeSaleCosts', unit: 'bool', topic: 'sale' },
  { key: 'saleAgencyPct', unit: 'pct', topic: 'sale', min: 0, max: 0.1, step: 0.005 },
  { key: 'saleTaxShortPct', unit: 'pct', topic: 'sale', min: 0, max: 0.2, step: 0.005 },
  { key: 'saleTaxLongPct', unit: 'pct', topic: 'sale', min: 0, max: 0.2, step: 0.005 },
  { key: 'saleTaxShortHoldYears', unit: 'years', topic: 'sale', min: 0, max: 20, step: 1 },

  { key: 'rent', unit: 'money', topic: 'renting', min: 0, step: 50 },
  { key: 'rentGrowth', unit: 'pct', topic: 'renting', min: -0.2, max: 0.3, step: 0.005 },
  { key: 'depositMonths', unit: 'months', topic: 'renting', min: 0, max: 12, step: 1 },
  { key: 'renterInsuranceAnnual', unit: 'money', topic: 'renting', min: 0, step: 50 },

  { key: 'investReturn', unit: 'pct', topic: 'investing', min: -0.2, max: 0.3, step: 0.005 },
  { key: 'investTaxRate', unit: 'pct', topic: 'investing', min: 0, max: 0.5, step: 0.01 },
  { key: 'savingsRate', unit: 'pct', topic: 'investing', min: 0, max: 0.2, step: 0.0025 },

  { key: 'horizonYears', unit: 'years', topic: 'general', min: 1, max: 50, step: 1 },
  { key: 'inflation', unit: 'pct', topic: 'general', min: -0.1, max: 0.5, step: 0.005 },
];

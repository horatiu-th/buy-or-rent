import type { Inputs } from '../engine';

export type Unit = 'money' | 'pct' | 'years' | 'months' | 'bool';
export type Group = 'key' | 'acquisition' | 'ownership' | 'growth' | 'investing' | 'sale';

export interface FieldDef {
  key: keyof Inputs;
  unit: Unit;
  group: Group;
  min?: number;
  max?: number;
  step?: number;
}

export const FIELDS: FieldDef[] = [
  { key: 'price', unit: 'money', group: 'key', min: 0, step: 1000 },
  { key: 'rent', unit: 'money', group: 'key', min: 0, step: 50 },
  { key: 'downPaymentPct', unit: 'pct', group: 'key', min: 0, max: 1, step: 0.01 },
  { key: 'fixedRate', unit: 'pct', group: 'key', min: 0, max: 0.3, step: 0.001 },
  { key: 'fixedYears', unit: 'years', group: 'key', min: 0, max: 30, step: 1 },
  { key: 'ircc', unit: 'pct', group: 'key', min: 0, max: 0.3, step: 0.001 },
  { key: 'variableMargin', unit: 'pct', group: 'key', min: 0, max: 0.1, step: 0.001 },
  { key: 'loanTermYears', unit: 'years', group: 'key', min: 1, max: 35, step: 1 },
  { key: 'horizonYears', unit: 'years', group: 'key', min: 1, max: 50, step: 1 },

  { key: 'notaryPct', unit: 'pct', group: 'acquisition', min: 0, max: 0.1, step: 0.001 },
  { key: 'registryPct', unit: 'pct', group: 'acquisition', min: 0, max: 0.05, step: 0.0005 },
  { key: 'bankFees', unit: 'money', group: 'acquisition', min: 0, step: 100 },

  { key: 'propertyTaxPct', unit: 'pct', group: 'ownership', min: 0, max: 0.05, step: 0.0005 },
  { key: 'homeInsuranceAnnual', unit: 'money', group: 'ownership', min: 0, step: 50 },
  { key: 'lifeInsurancePct', unit: 'pct', group: 'ownership', min: 0, max: 0.05, step: 0.0005 },
  { key: 'maintenancePct', unit: 'pct', group: 'ownership', min: 0, max: 0.1, step: 0.001 },

  { key: 'propertyGrowth', unit: 'pct', group: 'growth', min: -0.2, max: 0.3, step: 0.005 },
  { key: 'rentGrowth', unit: 'pct', group: 'growth', min: -0.2, max: 0.3, step: 0.005 },
  { key: 'inflation', unit: 'pct', group: 'growth', min: -0.1, max: 0.5, step: 0.005 },

  { key: 'investReturn', unit: 'pct', group: 'investing', min: -0.2, max: 0.3, step: 0.005 },
  { key: 'investTaxRate', unit: 'pct', group: 'investing', min: 0, max: 0.5, step: 0.01 },
  { key: 'renterInsuranceAnnual', unit: 'money', group: 'investing', min: 0, step: 50 },
  { key: 'depositMonths', unit: 'months', group: 'investing', min: 0, max: 12, step: 1 },

  { key: 'includeSaleCosts', unit: 'bool', group: 'sale' },
  { key: 'saleAgencyPct', unit: 'pct', group: 'sale', min: 0, max: 0.1, step: 0.005 },
  { key: 'saleTaxShortPct', unit: 'pct', group: 'sale', min: 0, max: 0.2, step: 0.005 },
  { key: 'saleTaxLongPct', unit: 'pct', group: 'sale', min: 0, max: 0.2, step: 0.005 },
  { key: 'saleTaxShortHoldYears', unit: 'years', group: 'sale', min: 0, max: 20, step: 1 },
];

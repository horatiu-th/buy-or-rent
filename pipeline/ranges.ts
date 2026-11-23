import type { CityValueKey, ValueKey } from '../src/data/schema';
import type { Range } from './validate';

// Deliberately wide: these catch unit mistakes (5.57 instead of 0.0557, lei instead of €),
// not values that are merely unusual. Rates are decimals.
export const VALUE_RANGES: Record<ValueKey, Range> = {
  eurRon: { min: 4.5, max: 6.5 },
  downPaymentPct: { min: 0, max: 0.6 },
  notaryPct: { min: 0, max: 0.05 },
  registryPct: { min: 0, max: 0.01 },
  bankFees: { min: 0, max: 20000 },
  loanTermYears: { min: 5, max: 40 },
  fixedRate: { min: 0, max: 0.2 },
  fixedYears: { min: 0, max: 30 },
  ircc: { min: 0, max: 0.2 },
  variableMargin: { min: 0, max: 0.1 },
  propertyTaxSqm: { min: 0, max: 100 },
  homeInsuranceAnnual: { min: 0, max: 10000 },
  lifeInsurancePct: { min: 0, max: 0.02 },
  maintenancePct: { min: 0, max: 0.05 },
  propertyGrowth: { min: -0.1, max: 0.2 },
  rentGrowth: { min: -0.1, max: 0.2 },
  renterInsuranceAnnual: { min: 0, max: 5000 },
  depositMonths: { min: 0, max: 6 },
  investReturn: { min: -0.05, max: 0.2 },
  investTaxRate: { min: 0, max: 0.5 },
  savingsRate: { min: 0, max: 0.2 },
  savingsTaxRate: { min: 0, max: 0.5 },
  saleAgencyPct: { min: 0, max: 0.1 },
  saleTaxShortPct: { min: 0, max: 0.2 },
  saleTaxLongPct: { min: 0, max: 0.2 },
  saleTaxShortHoldYears: { min: 0, max: 20 },
  horizonYears: { min: 1, max: 50 },
  inflation: { min: -0.05, max: 0.3 },
  buyerAgencyPct: { min: 0, max: 0.1 },
  buyerAgencyPctNew: { min: 0, max: 0.1 },
  irccLongRun: { min: 0, max: 0.2 },
  homeInsurancePct: { min: 0, max: 0.01 },
  rentAgencyPct: { min: 0, max: 3 },
  negotiationPct: { min: 0, max: 0.2 },
};

export const CITY_RANGES: Record<CityValueKey, Range> = {
  priceSqmEurNew: { min: 300, max: 10000 },
  priceSqmEurExisting: { min: 300, max: 10000 },
  rentSqmEur: { min: 1, max: 50 },
  propertyTaxSqm: { min: 0, max: 100 },
};

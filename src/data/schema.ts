export const STATUSES = ['ok', 'stale', 'manual'] as const;
export type Status = (typeof STATUSES)[number];

export interface SourcedValue {
  value: number;
  unit: string;
  source: string;
  sourceUrl?: string;
  asOf: string; // YYYY-MM-DD
  /** Last day the value is known to apply (YYYY-MM-DD), for values with a scheduled change. */
  validUntil?: string;
  status: Status;
}

export interface CityData {
  name: string;
  priceSqmEurNew: SourcedValue;
  priceSqmEurExisting: SourcedValue;
  rentSqmEur: SourcedValue;
  propertyTaxPct?: SourcedValue;
}

export interface DataFile {
  values: Record<string, SourcedValue>;
  cities: Record<string, CityData>;
}

export interface PartialDataFile {
  values?: Record<string, SourcedValue>;
  cities?: Record<string, Partial<CityData>>;
}

/** Global defaults every merged file must contain. */
export const REQUIRED_VALUE_KEYS = [
  'eurRon', 'downPaymentPct', 'notaryPct', 'registryPct', 'bankFees', 'loanTermYears',
  'fixedRate', 'fixedYears', 'ircc', 'variableMargin', 'propertyTaxPct', 'homeInsuranceAnnual',
  'lifeInsurancePct', 'maintenancePct', 'propertyGrowth', 'rentGrowth', 'renterInsuranceAnnual',
  'depositMonths', 'investReturn', 'investTaxRate', 'savingsRate', 'savingsTaxRate', 'saleAgencyPct', 'saleTaxShortPct',
  'saleTaxLongPct', 'saleTaxShortHoldYears', 'horizonYears', 'inflation',
  'buyerAgencyPct', 'buyerAgencyPctNew', 'irccLongRun', 'homeInsurancePct', 'rentAgencyPct', 'negotiationPct',
] as const;
export type ValueKey = (typeof REQUIRED_VALUE_KEYS)[number];

export const REQUIRED_CITY_KEYS = ['name', 'priceSqmEurNew', 'priceSqmEurExisting', 'rentSqmEur'] as const;

/** The city fields that hold a SourcedValue, required or optional. */
export const CITY_VALUE_KEYS = ['priceSqmEurNew', 'priceSqmEurExisting', 'rentSqmEur', 'propertyTaxPct'] as const;
export type CityValueKey = (typeof CITY_VALUE_KEYS)[number];

/** Where a fetched value is written, e.g. "values.eurRon" or "cities.cluj.rentSqmEur". */
export type DataPath = `values.${ValueKey}` | `cities.${string}.${CityValueKey}`;

/** Used when a city id is unknown, e.g. from an old shared link. The merge fails if it is missing. */
export const DEFAULT_CITY_ID = 'bucuresti';

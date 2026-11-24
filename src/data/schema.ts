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
  priceSqmEur: SourcedValue;
  rentSqmEur: SourcedValue;
  /** Sale €/m² from the same index as the rent, so rent ÷ this is a yield measured on one set of listings. */
  rentPriceSqmEur: SourcedValue;
  propertyTaxSqm?: SourcedValue;
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
  'fixedRate', 'fixedYears', 'ircc', 'variableMargin', 'propertyTaxSqm', 'homeInsuranceAnnual',
  'lifeInsurancePct', 'maintenancePct', 'propertyRealGrowth', 'rentRealGrowth', 'renterInsuranceAnnual',
  'depositMonths', 'investRealReturn', 'investTaxRate', 'saleAgencyPct', 'saleTaxShortPct',
  'saleTaxLongPct', 'saleTaxShortHoldYears', 'horizonYears', 'inflation',
  'buyerAgencyPct', 'irccLongRunSpread', 'homeInsurancePct', 'rentAgencyPct', 'negotiationPct',
  'fitOutCost', 'moveEveryYears', 'moveCost',
] as const;
export type ValueKey = (typeof REQUIRED_VALUE_KEYS)[number];

export const REQUIRED_CITY_KEYS = ['name', 'priceSqmEur', 'rentSqmEur', 'rentPriceSqmEur'] as const;

/** The city fields that hold a SourcedValue, required or optional. */
export const CITY_VALUE_KEYS = [
  'priceSqmEur', 'rentSqmEur', 'rentPriceSqmEur', 'propertyTaxSqm',
] as const;
export type CityValueKey = (typeof CITY_VALUE_KEYS)[number];

/** Where a fetched value is written, e.g. "values.eurRon" or "cities.cluj.rentSqmEur". */
export type DataPath = `values.${ValueKey}` | `cities.${string}.${CityValueKey}`;

/** Used when a city id is unknown, e.g. from an old shared link. The merge fails if it is missing. */
export const DEFAULT_CITY_ID = 'bucuresti';

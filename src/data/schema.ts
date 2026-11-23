export type Status = 'ok' | 'stale' | 'manual';

export interface SourcedValue {
  value: number;
  unit: string;
  source: string;
  sourceUrl?: string;
  asOf: string; // YYYY-MM-DD
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
  'depositMonths', 'investReturn', 'investTaxRate', 'saleAgencyPct', 'saleTaxShortPct',
  'saleTaxLongPct', 'saleTaxShortHoldYears', 'horizonYears', 'inflation',
] as const;

export const REQUIRED_CITY_KEYS = ['name', 'priceSqmEurNew', 'priceSqmEurExisting', 'rentSqmEur'] as const;

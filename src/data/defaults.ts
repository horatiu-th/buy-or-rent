import raw from './defaults.json';
import { DEFAULT_CITY_ID, type DataFile, type SourcedValue } from './schema';
import type { Inputs } from '../engine';

export type PropertyType = 'new' | 'existing';

export function loadDefaults(): DataFile {
  return raw as DataFile;
}

/**
 * The city id the defaults are actually built from: the id itself if known, otherwise the default
 * city. Display the result, not the raw id, so the label always matches the numbers.
 */
export function resolveCityId(cityId: string, data: DataFile = loadDefaults()): string {
  // hasOwn, not `in`: ids come from URLs, and "toString" is "in" every object.
  return Object.hasOwn(data.cities, cityId) ? cityId : DEFAULT_CITY_ID;
}

function cityOf(data: DataFile, cityId: string) {
  return data.cities[resolveCityId(cityId, data)];
}

// Rent per m² falls as flats get larger: room-by-room asking rents in the largest cities grow with
// roughly the 0.7th–0.75th power of floor area. City figures are averages over flats of about this size, so
// the curve passes through them there and bends below them for larger homes.
export const RENT_REFERENCE_SQM = 55;
export const RENT_SIZE_EXPONENT = 0.72;

export function rentForSize(rentSqm: number, sqm: number): number {
  if (sqm <= 0) return 0;
  return rentSqm * RENT_REFERENCE_SQM * Math.pow(sqm / RENT_REFERENCE_SQM, RENT_SIZE_EXPONENT);
}

const agencyKey = (type: PropertyType) => (type === 'new' ? 'buyerAgencyPctNew' : 'buyerAgencyPct');

export function buildInputs(data: DataFile, cityId: string, type: PropertyType, sqm: number): Inputs {
  const v = (k: string) => {
    const x = data.values[k];
    if (!x) throw new Error(`Missing default: ${k}`);
    return x.value;
  };
  const city = cityOf(data, cityId);
  const eur = v('eurRon');
  const priceSqm = type === 'new' ? city.priceSqmEurNew.value : city.priceSqmEurExisting.value;

  return {
    // Index prices are asking prices; buyers usually negotiate a few percent off.
    price: Math.round(priceSqm * sqm * eur * (1 - v('negotiationPct'))),
    rent: Math.round(rentForSize(city.rentSqmEur.value, sqm) * eur),
    propertyTaxAnnual: Math.round((city.propertyTaxSqm?.value ?? v('propertyTaxSqm')) * sqm),
    includeSaleCosts: true,
    downPaymentPct: v('downPaymentPct'),
    notaryPct: v('notaryPct'),
    registryPct: v('registryPct'),
    bankFees: v('bankFees'),
    buyerAgencyPct: v(agencyKey(type)),
    loanTermYears: v('loanTermYears'),
    fixedRate: v('fixedRate'),
    fixedYears: v('fixedYears'),
    ircc: v('ircc'),
    irccLongRun: v('irccLongRun'),
    variableMargin: v('variableMargin'),
    homeInsuranceAnnual: v('homeInsuranceAnnual'),
    homeInsurancePct: v('homeInsurancePct'),
    lifeInsurancePct: v('lifeInsurancePct'),
    maintenancePct: v('maintenancePct'),
    propertyGrowth: v('propertyGrowth'),
    rentGrowth: v('rentGrowth'),
    renterInsuranceAnnual: v('renterInsuranceAnnual'),
    depositMonths: v('depositMonths'),
    rentAgencyPct: v('rentAgencyPct'),
    investReturn: v('investReturn'),
    investTaxRate: v('investTaxRate'),
    savingsRate: v('savingsRate'),
    savingsTaxRate: v('savingsTaxRate'),
    saleAgencyPct: v('saleAgencyPct'),
    saleTaxShortPct: v('saleTaxShortPct'),
    saleTaxLongPct: v('saleTaxLongPct'),
    saleTaxShortHoldYears: v('saleTaxShortHoldYears'),
    horizonYears: v('horizonYears'),
    inflation: v('inflation'),
  };
}

/** Where a field's default came from, for the source tag next to each input. */
export function sourceFor(data: DataFile, cityId: string, type: PropertyType, key: keyof Inputs): SourcedValue | undefined {
  const city = cityOf(data, cityId);
  if (key === 'price') return type === 'new' ? city.priceSqmEurNew : city.priceSqmEurExisting;
  if (key === 'rent') return city.rentSqmEur;
  if (key === 'propertyTaxAnnual') return city.propertyTaxSqm ?? data.values.propertyTaxSqm;
  if (key === 'buyerAgencyPct') return data.values[agencyKey(type)];
  return data.values[key];
}

import raw from './defaults.json';
import { DEFAULT_CITY_ID, isValueKey, type DataFile, type SourcedValue, type ValueKey } from './schema';
import type { Inputs } from '../engine';

/** The bundled data. The merge step guarantees its shape; JSON imports type `status` as a plain string. */
export const DEFAULTS = raw as DataFile;

/**
 * The city id the defaults are actually built from: the id itself if known, otherwise the default
 * city. Display the result, not the raw id, so the label always matches the numbers.
 */
export function resolveCityId(cityId: string, data: DataFile = DEFAULTS): string {
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

/**
 * Rent per m² for the city's price. The rent index and the sale index it is paired with cover the same
 * listings, so their ratio is a yield free of differences in area definitions or stock between sources.
 * Applying that yield to the price from the other source gives a rent for a comparable home.
 */
export function rentSqmFor(data: DataFile, cityId: string): number {
  const city = cityOf(data, cityId);
  return (city.rentSqmEur.value * city.priceSqmEur.value) / city.rentPriceSqmEur.value;
}

const valueOf = (data: DataFile, k: ValueKey) => data.values[k].value;

/** A nominal annual rate from inflation and a real rate, rounded so float noise stays out of fields and links. */
const nominal = (inflation: number, real: number) => +((1 + inflation) * (1 + real) - 1).toFixed(6);

/**
 * Defaults that follow inflation: each is inflation plus a real component from the data. Kept in one place
 * so a changed inflation moves them together, instead of leaving them set for a different price level.
 */
export function inflationLinked(data: DataFile, inflation: number) {
  const v = (k: ValueKey) => valueOf(data, k);
  return {
    propertyGrowth: nominal(inflation, v('propertyRealGrowth')),
    rentGrowth: nominal(inflation, v('rentRealGrowth')),
    investReturn: nominal(inflation, v('investRealReturn')),
    savingsRate: nominal(inflation, v('savingsRealReturn')),
    irccLongRun: Math.max(0, +(inflation + v('irccLongRunSpread')).toFixed(6)),
  };
}

export function buildInputs(
  data: DataFile, cityId: string, sqm: number, inflation = data.values.inflation.value,
): Inputs {
  const v = (k: ValueKey) => valueOf(data, k);
  const city = cityOf(data, cityId);
  const eur = v('eurRon');
  return {
    // Index prices are asking prices; buyers usually negotiate a few percent off.
    price: Math.round(city.priceSqmEur.value * sqm * eur * (1 - v('negotiationPct'))),
    rent: Math.round(rentForSize(rentSqmFor(data, cityId), sqm) * eur),
    propertyTaxAnnual: Math.round((city.propertyTaxSqm?.value ?? v('propertyTaxSqm')) * sqm),
    includeSaleCosts: true,
    downPaymentPct: v('downPaymentPct'),
    notaryPct: v('notaryPct'),
    registryPct: v('registryPct'),
    bankFees: v('bankFees'),
    buyerAgencyPct: v('buyerAgencyPct'),
    fitOutCost: v('fitOutCost'),
    loanTermYears: v('loanTermYears'),
    fixedRate: v('fixedRate'),
    fixedYears: v('fixedYears'),
    ircc: v('ircc'),
    variableMargin: v('variableMargin'),
    homeInsuranceAnnual: v('homeInsuranceAnnual'),
    homeInsurancePct: v('homeInsurancePct'),
    lifeInsurancePct: v('lifeInsurancePct'),
    maintenancePct: v('maintenancePct'),
    renterInsuranceAnnual: v('renterInsuranceAnnual'),
    depositMonths: v('depositMonths'),
    rentAgencyPct: v('rentAgencyPct'),
    moveEveryYears: v('moveEveryYears'),
    moveCost: v('moveCost'),
    investTaxRate: v('investTaxRate'),
    savingsTaxRate: v('savingsTaxRate'),
    saleAgencyPct: v('saleAgencyPct'),
    saleTaxShortPct: v('saleTaxShortPct'),
    saleTaxLongPct: v('saleTaxLongPct'),
    saleTaxShortHoldYears: v('saleTaxShortHoldYears'),
    horizonYears: v('horizonYears'),
    inflation,
    ...inflationLinked(data, inflation),
  };
}

/**
 * The inputs the simulation runs on: the place's defaults with the user's edits on top. An edited
 * inflation also moves the defaults that follow it, unless those were edited too.
 */
export function resolveInputs(
  data: DataFile, cityId: string, sqm: number, overrides: Partial<Inputs>,
): Inputs {
  return { ...buildInputs(data, cityId, sqm, overrides.inflation), ...overrides };
}

const REAL_PART: Partial<Record<keyof Inputs, ValueKey>> = {
  propertyGrowth: 'propertyRealGrowth',
  rentGrowth: 'rentRealGrowth',
  investReturn: 'investRealReturn',
  savingsRate: 'savingsRealReturn',
  irccLongRun: 'irccLongRunSpread',
};

/** Where a field's default came from, for the source tag next to each input. */
export function sourceFor(data: DataFile, cityId: string, key: keyof Inputs): SourcedValue | undefined {
  const city = cityOf(data, cityId);
  if (key === 'price') return city.priceSqmEur;
  if (key === 'rent') return city.rentSqmEur;
  if (key === 'propertyTaxAnnual') return city.propertyTaxSqm ?? data.values.propertyTaxSqm;
  const real = REAL_PART[key];
  if (real) return data.values[real];
  return isValueKey(key) ? data.values[key] : undefined;
}

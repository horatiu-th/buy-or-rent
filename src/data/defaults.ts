import raw from './defaults.json';
import type { DataFile, SourcedValue } from './schema';
import type { Inputs } from '../engine';

export type PropertyType = 'new' | 'existing';

export function loadDefaults(): DataFile {
  return raw as DataFile;
}

function cityOf(data: DataFile, cityId: string) {
  return data.cities[cityId] ?? Object.values(data.cities)[0];
}

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
    price: Math.round(priceSqm * sqm * eur),
    rent: Math.round(city.rentSqmEur.value * sqm * eur),
    propertyTaxPct: city.propertyTaxPct?.value ?? v('propertyTaxPct'),
    includeSaleCosts: true,
    downPaymentPct: v('downPaymentPct'),
    notaryPct: v('notaryPct'),
    registryPct: v('registryPct'),
    bankFees: v('bankFees'),
    loanTermYears: v('loanTermYears'),
    fixedRate: v('fixedRate'),
    fixedYears: v('fixedYears'),
    ircc: v('ircc'),
    variableMargin: v('variableMargin'),
    homeInsuranceAnnual: v('homeInsuranceAnnual'),
    lifeInsurancePct: v('lifeInsurancePct'),
    maintenancePct: v('maintenancePct'),
    propertyGrowth: v('propertyGrowth'),
    rentGrowth: v('rentGrowth'),
    renterInsuranceAnnual: v('renterInsuranceAnnual'),
    depositMonths: v('depositMonths'),
    investReturn: v('investReturn'),
    investTaxRate: v('investTaxRate'),
    savingsRate: v('savingsRate'),
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
  if (key === 'propertyTaxPct') return city.propertyTaxPct ?? data.values.propertyTaxPct;
  return data.values[key];
}

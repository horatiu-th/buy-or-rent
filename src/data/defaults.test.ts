import {
  buildInputs, sourceFor, loadDefaults, resolveCityId, resolveInputs, rentForSize, rentSqmFor, RENT_REFERENCE_SQM,
} from './defaults';
import { DEFAULT_CITY_ID } from './schema';

const data = loadDefaults();

describe('resolveCityId', () => {
  it('keeps a known id', () => expect(resolveCityId('cluj', data)).toBe('cluj'));
  it('maps an unknown id to the default city', () => expect(resolveCityId('nope', data)).toBe(DEFAULT_CITY_ID));
  it('does not treat inherited object keys as cities', () => expect(resolveCityId('toString', data)).toBe(DEFAULT_CITY_ID));
  it('uses the bundled data when none is passed', () => expect(resolveCityId('nope')).toBe(DEFAULT_CITY_ID));
});

describe('buildInputs', () => {
  it('derives price and rent from city €/m², size, the negotiation margin and the exchange rate', () => {
    const i = buildInputs(data, 'cluj', 'new', 50);
    const c = data.cities.cluj;
    const eur = data.values.eurRon.value;
    expect(i.price).toBe(Math.round(c.priceSqmEurNew.value * 50 * eur * (1 - data.values.negotiationPct.value)));
    expect(i.rent).toBe(Math.round(rentForSize(rentSqmFor(data, 'cluj', 'new'), 50) * eur));
  });

  it('prices the rent at the rent index\'s own yield, applied to the chosen price', () => {
    const c = data.cities.bucuresti;
    const yieldOf = (type: 'new' | 'existing') =>
      rentSqmFor(data, 'bucuresti', type) / (type === 'new' ? c.priceSqmEurNew.value : c.priceSqmEurExisting.value);
    expect(yieldOf('existing')).toBeCloseTo(c.rentSqmEur.value / c.rentPriceSqmEur.value, 12);
    expect(yieldOf('new')).toBeCloseTo(yieldOf('existing'), 12);
  });

  it('sets growth, return and long-run IRCC from inflation plus their real parts', () => {
    const i = buildInputs(data, 'cluj', 'existing', 50, 0.05);
    const real = (k: string) => data.values[k].value;
    expect(i.propertyGrowth).toBeCloseTo(1.05 * (1 + real('propertyRealGrowth')) - 1, 6);
    expect(i.rentGrowth).toBeCloseTo(1.05 * (1 + real('rentRealGrowth')) - 1, 6);
    expect(i.investReturn).toBeCloseTo(1.05 * (1 + real('investRealReturn')) - 1, 6);
    expect(i.irccLongRun).toBeCloseTo(0.05 + real('irccLongRunSpread'), 6);
    expect(buildInputs(data, 'cluj', 'existing', 50).inflation).toBe(data.values.inflation.value);
  });

  it('charges a buyer agency fee on existing homes only', () => {
    expect(buildInputs(data, 'cluj', 'existing', 50).buyerAgencyPct).toBe(data.values.buyerAgencyPct.value);
    expect(buildInputs(data, 'cluj', 'new', 50).buyerAgencyPct).toBe(data.values.buyerAgencyPctNew.value);
    expect(sourceFor(data, 'cluj', 'new', 'buyerAgencyPct')).toBe(data.values.buyerAgencyPctNew);
  });

  it('sets property tax per m², using a city rate where one is set', () => {
    expect(buildInputs(data, 'iasi', 'existing', 50).propertyTaxAnnual).toBe(Math.round(data.cities.iasi.propertyTaxSqm!.value * 50));
    expect(buildInputs(data, 'sibiu', 'existing', 50).propertyTaxAnnual).toBe(Math.round(data.values.propertyTaxSqm.value * 50));
  });

  it('uses existing-build prices for existing properties', () => {
    const c = data.cities.bucuresti;
    expect(c.priceSqmEurExisting.value).not.toBe(c.priceSqmEurNew.value);
    const ratio = buildInputs(data, 'bucuresti', 'existing', 50).price / buildInputs(data, 'bucuresti', 'new', 50).price;
    expect(ratio).toBeCloseTo(c.priceSqmEurExisting.value / c.priceSqmEurNew.value, 4);
  });

  it('uses the default city for an unknown id', () => {
    expect(buildInputs(data, 'nope', 'new', 50)).toEqual(buildInputs(data, DEFAULT_CITY_ID, 'new', 50));
  });
});

describe('resolveInputs', () => {
  it('moves the inflation-linked defaults with an edited inflation, but keeps their own edits', () => {
    const i = resolveInputs(data, 'cluj', 'existing', 50, { inflation: 0.06, rentGrowth: 0.02 });
    expect(i.inflation).toBe(0.06);
    expect(i.investReturn).toEqual(buildInputs(data, 'cluj', 'existing', 50, 0.06).investReturn);
    expect(i.rentGrowth).toBe(0.02);
  });

  it('equals the defaults with no edits', () => {
    expect(resolveInputs(data, 'cluj', 'existing', 50, {})).toEqual(buildInputs(data, 'cluj', 'existing', 50));
  });
});

describe('sourceFor', () => {
  it('points inflation-linked fields at their real part', () => {
    expect(sourceFor(data, 'cluj', 'new', 'investReturn')).toBe(data.values.investRealReturn);
    expect(sourceFor(data, 'cluj', 'new', 'irccLongRun')).toBe(data.values.irccLongRunSpread);
  });
  it('returns the city rent source for rent', () => {
    expect(sourceFor(data, 'cluj', 'new', 'rent')).toBe(data.cities.cluj.rentSqmEur);
  });
  it('returns global values for other keys', () => {
    expect(sourceFor(data, 'cluj', 'new', 'ircc')).toBe(data.values.ircc);
  });
  it('uses the default city for an unknown id, like buildInputs', () => {
    expect(sourceFor(data, 'nope', 'new', 'rent')).toBe(data.cities[DEFAULT_CITY_ID].rentSqmEur);
  });
});

describe('rentForSize', () => {
  it('matches the city rate per m² at the reference size', () => {
    expect(rentForSize(10, RENT_REFERENCE_SQM)).toBeCloseTo(10 * RENT_REFERENCE_SQM, 9);
  });

  it('charges less per m² for larger homes and more for smaller ones', () => {
    expect(rentForSize(10, 80) / 80).toBeLessThan(10);
    expect(rentForSize(10, 35) / 35).toBeGreaterThan(10);
    expect(rentForSize(10, 80)).toBeGreaterThan(rentForSize(10, 60));
  });

  it('is zero for no area', () => expect(rentForSize(10, 0)).toBe(0));
});

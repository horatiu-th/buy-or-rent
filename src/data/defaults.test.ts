import { buildInputs, sourceFor, loadDefaults, resolveCityId } from './defaults';
import { DEFAULT_CITY_ID } from './schema';

const data = loadDefaults();

describe('resolveCityId', () => {
  it('keeps a known id', () => expect(resolveCityId('cluj', data)).toBe('cluj'));
  it('maps an unknown id to the default city', () => expect(resolveCityId('nope', data)).toBe(DEFAULT_CITY_ID));
  it('does not treat inherited object keys as cities', () => expect(resolveCityId('toString', data)).toBe(DEFAULT_CITY_ID));
  it('uses the bundled data when none is passed', () => expect(resolveCityId('nope')).toBe(DEFAULT_CITY_ID));
});

describe('buildInputs', () => {
  it('derives price and rent from city €/m², size and the exchange rate', () => {
    const i = buildInputs(data, 'cluj', 'new', 50);
    const c = data.cities.cluj;
    const eur = data.values.eurRon.value;
    expect(i.price).toBe(Math.round(c.priceSqmEurNew.value * 50 * eur));
    expect(i.rent).toBe(Math.round(c.rentSqmEur.value * 50 * eur));
  });

  it('uses existing-build prices for existing properties', () => {
    expect(buildInputs(data, 'cluj', 'existing', 50).price).toBeLessThan(buildInputs(data, 'cluj', 'new', 50).price);
  });

  it('uses the default city for an unknown id', () => {
    expect(buildInputs(data, 'nope', 'new', 50)).toEqual(buildInputs(data, DEFAULT_CITY_ID, 'new', 50));
  });
});

describe('sourceFor', () => {
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

import { buildInputs, sourceFor, loadDefaults } from './defaults';

const data = loadDefaults();

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

  it('falls back to the first city for an unknown id', () => {
    expect(buildInputs(data, 'nope', 'new', 50)).toEqual(buildInputs(data, Object.keys(data.cities)[0], 'new', 50));
  });
});

describe('sourceFor', () => {
  it('returns the city rent source for rent', () => {
    expect(sourceFor(data, 'cluj', 'new', 'rent')).toBe(data.cities.cluj.rentSqmEur);
  });
  it('returns global values for other keys', () => {
    expect(sourceFor(data, 'cluj', 'new', 'ircc')).toBe(data.values.ircc);
  });
});

import { mergeData } from './mergeData';
import { REQUIRED_VALUE_KEYS, type SourcedValue } from '../src/data/schema';

const sv = (value: number, source = 'x'): SourcedValue => ({ value, unit: '', source, asOf: '2026-01-01', status: 'ok' });
const allValues = Object.fromEntries(REQUIRED_VALUE_KEYS.map((k) => [k, sv(1)]));
const city = { name: 'Cluj', priceSqmEurNew: sv(3000), priceSqmEurExisting: sv(2800), rentSqmEur: sv(15) };

describe('mergeData', () => {
  it('lets overrides win over auto values', () => {
    const out = mergeData(
      { values: { ...allValues, ircc: sv(0.06, 'auto') }, cities: { cluj: city } },
      { values: { ircc: sv(0.05, 'manual') } },
    );
    expect(out.values.ircc.value).toBe(0.05);
  });

  it('merges cities field by field', () => {
    const out = mergeData(
      { values: allValues, cities: { cluj: city } },
      { cities: { cluj: { rentSqmEur: sv(16) } } },
    );
    expect(out.cities.cluj.rentSqmEur.value).toBe(16);
    expect(out.cities.cluj.priceSqmEurNew.value).toBe(3000);
  });

  it('throws when a required value is missing', () => {
    expect(() => mergeData({ values: {}, cities: { cluj: city } }, {})).toThrow(/eurRon/);
  });

  it('throws when a city is incomplete', () => {
    expect(() => mergeData({ values: allValues, cities: { cluj: { name: 'Cluj' } } }, {})).toThrow(/cluj/);
  });
});

import { mergeData } from './mergeData';
import { VALUE_RANGES } from './ranges';
import { DEFAULT_CITY_ID, REQUIRED_VALUE_KEYS, type SourcedValue } from '../src/data/schema';

const TODAY = '2026-11-23';
const sv = (value: number, extra: Partial<SourcedValue> = {}): SourcedValue =>
  ({ value, unit: 'x', source: 'x', asOf: '2026-01-01', status: 'manual', ...extra });
const mid = (k: (typeof REQUIRED_VALUE_KEYS)[number]) => (VALUE_RANGES[k].min + VALUE_RANGES[k].max) / 2;
const allValues = Object.fromEntries(REQUIRED_VALUE_KEYS.map((k) => [k, sv(mid(k))]));
const city = { name: 'City', priceSqmEurNew: sv(3000), priceSqmEurExisting: sv(2800), rentSqmEur: sv(15) };
const base = { values: allValues, cities: { [DEFAULT_CITY_ID]: city } };

const merge = (auto: object, overrides: object = {}) => mergeData(auto as never, overrides as never, TODAY);
const withValue = (key: string, v: unknown) => merge(base, { values: { [key]: v } });

describe('mergeData', () => {
  it('lets overrides win over auto values', () => {
    const { data } = merge(base, { values: { ircc: sv(0.05) } });
    expect(data.values.ircc.value).toBe(0.05);
  });

  it('merges cities field by field', () => {
    const { data } = merge(base, { cities: { [DEFAULT_CITY_ID]: { rentSqmEur: sv(16) } } });
    expect(data.cities[DEFAULT_CITY_ID].rentSqmEur.value).toBe(16);
    expect(data.cities[DEFAULT_CITY_ID].priceSqmEurNew.value).toBe(3000);
  });

  it('throws when a required value is missing', () => {
    expect(() => merge({ values: {}, cities: base.cities })).toThrow(/eurRon/);
  });

  it('throws when a city is incomplete', () => {
    expect(() => merge({ values: allValues, cities: { [DEFAULT_CITY_ID]: city, cluj: { name: 'Cluj' } } })).toThrow(/cluj/);
  });

  it('throws when the default city is missing', () => {
    expect(() => merge({ values: allValues, cities: { cluj: city } })).toThrow(new RegExp(DEFAULT_CITY_ID));
  });

  describe('rejects malformed entries, naming the key', () => {
    it('a rate written as a percentage instead of a decimal', () => {
      expect(() => withValue('ircc', sv(5.57))).toThrow(/ircc.*outside/);
    });
    it('a value that is not a number', () => {
      expect(() => withValue('ircc', { ...sv(0), value: '0.1' })).toThrow(/ircc.*value/);
    });
    it('missing metadata', () => {
      expect(() => withValue('ircc', { value: 0.05 })).toThrow(/ircc.*unit/);
      expect(() => withValue('ircc', { ...sv(0.05), source: '' })).toThrow(/ircc.*source/);
      expect(() => withValue('ircc', { ...sv(0.05), status: undefined })).toThrow(/ircc.*status/);
    });
    it('an impossible asOf date', () => {
      expect(() => withValue('ircc', sv(0.05, { asOf: '2026-13-45' }))).toThrow(/ircc.*asOf/);
      expect(() => withValue('ircc', sv(0.05, { asOf: '2026-02-30' }))).toThrow(/ircc.*asOf/);
    });
    it('an unknown status', () => {
      expect(() => withValue('ircc', { ...sv(0.05), status: 'fresh' })).toThrow(/ircc.*status/);
    });
    it('an impossible validUntil date', () => {
      expect(() => withValue('ircc', sv(0.05, { validUntil: '2026-12-32' }))).toThrow(/ircc.*validUntil/);
    });
    it('an unknown field, which is usually a typo', () => {
      expect(() => withValue('ircc', { ...sv(0.05), validUntill: '2026-12-31' })).toThrow(/ircc.*validUntill/);
    });
    it('an unknown value key, which is usually a typo', () => {
      expect(() => withValue('irc', sv(0.05))).toThrow(/irc\b/);
    });
    it('an implausible city price', () => {
      expect(() => merge(base, { cities: { [DEFAULT_CITY_ID]: { rentSqmEur: sv(1500) } } }))
        .toThrow(new RegExp(`${DEFAULT_CITY_ID}.*rentSqmEur`));
    });
    it('a city without a name', () => {
      expect(() => merge(base, { cities: { [DEFAULT_CITY_ID]: { name: '' } } })).toThrow(/name/);
    });
  });

  describe('warnings', () => {
    it('warns when an override shadows a fetched value', () => {
      const { warnings } = merge(base, { values: { eurRon: sv(5.3) } });
      expect(warnings).toEqual([expect.stringMatching(/eurRon.*both/)]);
    });

    it('warns when an override shadows a fetched city value', () => {
      const { warnings } = merge(base, { cities: { [DEFAULT_CITY_ID]: { rentSqmEur: sv(16) } } });
      expect(warnings).toEqual([expect.stringMatching(/rentSqmEur.*both/)]);
    });

    it('warns once validUntil has passed', () => {
      const { warnings } = withValue('ircc', sv(0.05, { validUntil: '2026-11-22' }));
      expect(warnings).toContainEqual(expect.stringMatching(/ircc.*2026-11-22/));
    });

    it('does not warn on the last valid day', () => {
      const { warnings } = merge({ ...base, values: { ...allValues, ircc: sv(0.05, { validUntil: TODAY }) } });
      expect(warnings).toEqual([]);
    });
  });
});

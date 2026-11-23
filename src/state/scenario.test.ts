import { decodeScenario, encodeScenario, DEFAULT_SCENARIO } from './scenario';

describe('scenario URL encoding', () => {
  it('round-trips city, type, size and overrides', () => {
    const s = { ...DEFAULT_SCENARIO, cityId: 'iasi', propertyType: 'existing' as const, sqm: 65, overrides: { rent: 2000, includeSaleCosts: false } };
    expect(decodeScenario(encodeScenario(s))).toEqual(s);
  });

  it('omits default values from the URL', () => {
    expect(encodeScenario(DEFAULT_SCENARIO).toString()).toBe('');
  });

  it('ignores unknown and non-numeric params', () => {
    const s = decodeScenario(new URLSearchParams('foo=1&rent=abc&price=400000'));
    expect(s.overrides).toEqual({ price: 400000 });
  });
});

describe('scenario URL hardening', () => {
  it('accepts only 0 or 1 for boolean params', () => {
    expect(decodeScenario(new URLSearchParams('includeSaleCosts=0')).overrides).toEqual({ includeSaleCosts: false });
    expect(decodeScenario(new URLSearchParams('includeSaleCosts=1')).overrides).toEqual({ includeSaleCosts: true });
    expect(decodeScenario(new URLSearchParams('includeSaleCosts=yes')).overrides).toEqual({});
  });

  it('ignores a city id that is not in the list of known cities', () => {
    const ids = ['bucuresti', 'iasi'];
    expect(decodeScenario(new URLSearchParams('oras=iasi'), ids).cityId).toBe('iasi');
    expect(decodeScenario(new URLSearchParams('oras=atlantis'), ids).cityId).toBe(DEFAULT_SCENARIO.cityId);
  });

  it('clamps numeric overrides to the field limits', () => {
    const s = decodeScenario(new URLSearchParams('horizonYears=5000&downPaymentPct=-3&price=999999999'));
    expect(s.overrides).toEqual({ horizonYears: 50, downPaymentPct: 0, price: 999999999 });
  });
});

describe('area from the URL', () => {
  it('clamps out-of-range values and ignores invalid ones', () => {
    expect(decodeScenario(new URLSearchParams('mp=5000')).sqm).toBe(500);
    expect(decodeScenario(new URLSearchParams('mp=3')).sqm).toBe(10);
    expect(decodeScenario(new URLSearchParams('mp=72')).sqm).toBe(72);
    expect(decodeScenario(new URLSearchParams('mp=abc')).sqm).toBe(DEFAULT_SCENARIO.sqm);
    expect(decodeScenario(new URLSearchParams('mp=')).sqm).toBe(DEFAULT_SCENARIO.sqm);
  });
});

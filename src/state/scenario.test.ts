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

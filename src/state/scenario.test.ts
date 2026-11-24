import { applyScenarioPatch, clampSqm, decodeScenario, encodeScenario, DEFAULT_SCENARIO } from './scenario';

describe('scenario URL encoding', () => {
  it('round-trips city, size and overrides', () => {
    const s = { ...DEFAULT_SCENARIO, cityId: 'iasi', sqm: 65, overrides: { rent: 2000, includeSaleCosts: false } };
    expect(decodeScenario(encodeScenario(s))).toEqual(s);
  });

  it('ignores the property type from older links', () => {
    expect(decodeScenario(new URLSearchParams('tip=new&oras=iasi'))).toEqual({ ...DEFAULT_SCENARIO, cityId: 'iasi' });
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
    const s = decodeScenario(new URLSearchParams('horizonYears=5000&downPaymentPct=-3&price=1e300&rent=2500'));
    expect(s.overrides).toEqual({ horizonYears: 50, downPaymentPct: 0, price: 100_000_000, rent: 2500 });
  });

  it('rounds periods counted in whole years or months', () => {
    const s = decodeScenario(new URLSearchParams('horizonYears=2.5&loanTermYears=24.4&depositMonths=1.6'));
    expect(s.overrides).toEqual({ horizonYears: 3, loanTermYears: 24, depositMonths: 2 });
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

describe('inflation-adjusted view', () => {
  it('is on by default and stays out of the URL', () => {
    expect(DEFAULT_SCENARIO.real).toBe(true);
    expect(encodeScenario(DEFAULT_SCENARIO).has('real')).toBe(false);
  });

  it('round-trips the nominal view through real=0', () => {
    const s = { ...DEFAULT_SCENARIO, real: false };
    expect(encodeScenario(s).get('real')).toBe('0');
    expect(decodeScenario(encodeScenario(s)).real).toBe(false);
  });

  it('ignores malformed values', () => {
    expect(decodeScenario(new URLSearchParams('real=yes')).real).toBe(true);
  });
});

describe('clampSqm', () => {
  it('keeps the area within the supported range', () => {
    expect(clampSqm(5000)).toBe(500);
    expect(clampSqm(3)).toBe(10);
    expect(clampSqm(72.5)).toBe(72.5);
  });
});

describe('changing the place', () => {
  const edited = { ...DEFAULT_SCENARIO, overrides: { price: 500000, rent: 3000, fixedRate: 0.06 } };

  it.each([
    ['city', { cityId: 'iasi' }],
    ['area', { sqm: 80 }],
  ])('drops price and rent edits when the %s changes, keeping the rest', (_, patch) => {
    expect(applyScenarioPatch(edited, patch).overrides).toEqual({ fixedRate: 0.06 });
  });

  it('keeps every edit when only the view changes', () => {
    expect(applyScenarioPatch(edited, { currency: 'EUR', real: false }).overrides).toBe(edited.overrides);
  });

  it('keeps every edit when the place is set to what it already is', () => {
    expect(applyScenarioPatch(edited, { cityId: edited.cityId }).overrides).toBe(edited.overrides);
  });
});

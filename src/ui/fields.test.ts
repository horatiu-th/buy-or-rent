import { MAX_HORIZON_YEARS, MAX_LOAN_TERM_YEARS, MIN_HORIZON_YEARS, MIN_LOAN_TERM_YEARS } from '../engine';
import { baseInputs } from '../engine/fixtures';
import { FIELDS, fieldDef as def, isNumberField, normalizeField } from './fields';

describe('FIELDS', () => {
  it('has exactly one field for every input', () => {
    expect(FIELDS.map((f) => f.key).sort()).toEqual(Object.keys(baseInputs).sort());
  });
});

describe('normalizeField', () => {
  it('clamps to the field limits', () => {
    expect(normalizeField(def('horizonYears'), 2000)).toBe(50);
    expect(normalizeField(def('downPaymentPct'), -3)).toBe(0);
    expect(normalizeField(def('price'), -100000)).toBe(0);
    expect(normalizeField(def('price'), 50_000_000)).toBe(50_000_000);
  });

  it('caps every amount so a huge finite value never reaches the simulation', () => {
    for (const f of FIELDS.filter(isNumberField).filter((x) => x.unit === 'money')) {
      expect(f.max, f.key).toBeDefined();
      expect(normalizeField(f, 1e300), f.key).toBe(f.max);
    }
  });

  it('uses the same period limits as the simulation', () => {
    expect([def('horizonYears').min, def('horizonYears').max]).toEqual([MIN_HORIZON_YEARS, MAX_HORIZON_YEARS]);
    expect([def('loanTermYears').min, def('loanTermYears').max]).toEqual([MIN_LOAN_TERM_YEARS, MAX_LOAN_TERM_YEARS]);
  });

  it('rounds fields counted in whole years or months', () => {
    expect(normalizeField(def('horizonYears'), 2.5)).toBe(3);
    expect(normalizeField(def('loanTermYears'), 24.4)).toBe(24);
    expect(normalizeField(def('fixedYears'), 4.6)).toBe(5);
    expect(normalizeField(def('saleTaxShortHoldYears'), 2.2)).toBe(2);
    expect(normalizeField(def('depositMonths'), 1.5)).toBe(2);
  });

  it('keeps fractional values for other units', () => {
    expect(normalizeField(def('fixedRate'), 0.0575)).toBe(0.0575);
    expect(normalizeField(def('rent'), 2500.5)).toBe(2500.5);
  });

  it('rounds after clamping so a limit is never crossed', () => {
    expect(normalizeField(def('loanTermYears'), 0.2)).toBe(1);
  });
});

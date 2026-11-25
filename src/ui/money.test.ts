import { euro, LEI } from '../test/money';
import type { DataFile } from '../data/schema';
import { CURRENCIES, CURRENCY_IDS, formatMoney, isCurrency, moneyFor, roundsToZero } from './money';

describe('formatMoney', () => {
  it('formats lei with Romanian grouping', () => {
    expect(formatMoney(1234567, LEI)).toBe('1.234.567 lei');
  });
  it("formats in the money's number locale", () => {
    expect(formatMoney(1234567, { ...LEI, numberLocale: 'en-GB' })).toBe('1,234,567 lei');
  });
  it('converts to another currency', () => {
    expect(formatMoney(5100, euro(5.1))).toBe('1.000 €');
  });
  it('keeps the sign of negative amounts', () => {
    expect(formatMoney(-1234.4, LEI)).toBe('-1.234 lei');
  });
  it('never shows a negative zero', () => {
    expect(formatMoney(-0.4, LEI)).toBe('0 lei');
    expect(formatMoney(-0.4, euro(5))).toBe('0 €');
  });
});

describe('roundsToZero', () => {
  it('is true exactly when the amount prints as zero in that currency', () => {
    expect(roundsToZero(-0.4, LEI)).toBe(true);
    expect(roundsToZero(2, LEI)).toBe(false);
    expect(roundsToZero(2, euro(5))).toBe(true);
  });
});

describe('the currency registry', () => {
  const data = { values: { eurRon: { value: 5 } } } as unknown as DataFile;

  it('gives every currency a symbol and a positive rate from the data', () => {
    for (const id of CURRENCY_IDS) {
      expect(CURRENCIES[id].symbol).not.toBe('');
      expect(moneyFor(id, data, 'ro-RO').perUnit).toBeGreaterThan(0);
    }
  });

  it('marks only the engine currency as the base', () => {
    expect(moneyFor('RON', data, 'ro-RO')).toEqual({ currency: 'RON', symbol: 'lei', perUnit: 1, isBase: true, numberLocale: 'ro-RO' });
    expect(moneyFor('EUR', data, 'ro-RO')).toMatchObject({ perUnit: 5, isBase: false });
  });

  it('accepts only registered ids, so a link cannot select an unknown currency', () => {
    expect(isCurrency('EUR')).toBe(true);
    expect(isCurrency('USD')).toBe(false);
    expect(isCurrency(null)).toBe(false);
    expect(isCurrency('toString')).toBe(false);
  });
});

import { countOf, formatDuration, formatMoney, parseNumber, unitWord } from './format';

describe('formatMoney', () => {
  it('formats lei with Romanian grouping', () => {
    expect(formatMoney(1234567, 'RON', 1)).toBe('1.234.567 lei');
  });
  it('converts to euro', () => {
    expect(formatMoney(5100, 'EUR', 5.1)).toBe('1.000 €');
  });
  it('keeps the sign of negative amounts', () => {
    expect(formatMoney(-1234.4, 'RON', 1)).toBe('-1.234 lei');
  });
  it('never shows a negative zero', () => {
    expect(formatMoney(-0.4, 'RON', 1)).toBe('0 lei');
    expect(formatMoney(-0.4, 'EUR', 5)).toBe('0 €');
  });
});

describe('formatDuration', () => {
  it('formats months as years and months', () => {
    expect(formatDuration(1)).toBe('1 lună');
    expect(formatDuration(12)).toBe('1 an');
    expect(formatDuration(27)).toBe('2 ani și 3 luni');
    expect(formatDuration(0)).toBe('0 luni');
  });
  it('adds "de" from twenty years on, as Romanian grammar requires', () => {
    expect(formatDuration(19 * 12)).toBe('19 ani');
    expect(formatDuration(20 * 12)).toBe('20 de ani');
    expect(formatDuration(30 * 12 + 2)).toBe('30 de ani și 2 luni');
  });
  it('rounds fractional months instead of printing float noise', () => {
    expect(formatDuration(3.6 * 12)).toBe('3 ani și 7 luni');
    expect(formatDuration(0.3)).toBe('0 luni');
  });
});

describe('countOf', () => {
  it.each([
    [1, '1 an'], [2, '2 ani'], [19, '19 ani'], [20, '20 de ani'], [21, '21 de ani'],
    [100, '100 de ani'], [101, '101 ani'], [119, '119 ani'], [120, '120 de ani'],
  ])('%i → %s', (n, text) => {
    expect(countOf(n, 'an', 'ani')).toBe(text);
  });
});

describe('unitWord', () => {
  it.each([
    [1, 'an'], [0, 'ani'], [2, 'ani'], [19, 'ani'], [20, 'de ani'], [30, 'de ani'], [101, 'ani'],
  ])('%i → %s', (n, text) => {
    expect(unitWord(n, 'an', 'ani')).toBe(text);
  });
});

describe('parseNumber', () => {
  it('accepts a comma or a dot as the decimal mark', () => {
    expect(parseNumber('4,5', 'decimal')).toBe(4.5);
    expect(parseNumber('4.5', 'decimal')).toBe(4.5);
    expect(parseNumber('-0,25', 'decimal')).toBe(-0.25);
    expect(parseNumber('3.', 'decimal')).toBe(3);
  });
  it('reads a dot in a percentage as a decimal mark', () => {
    expect(parseNumber('1.234', 'decimal')).toBe(1.234);
  });
  it('rejects text that is not a single number', () => {
    for (const s of ['', '-', 'abc', '1,2,3', '1.2,3', '4,5%']) expect(parseNumber(s, 'decimal')).toBeNull();
  });
  it('reads Romanian thousand separators in amounts', () => {
    expect(parseNumber('664.819', 'amount')).toBe(664819);
    expect(parseNumber('1.234.567', 'amount')).toBe(1234567);
    expect(parseNumber('1 234 567', 'amount')).toBe(1234567);
    expect(parseNumber('1 234', 'amount')).toBe(1234);
    expect(parseNumber('1.234,5', 'amount')).toBe(1234.5);
    expect(parseNumber('1,234.5', 'amount')).toBe(1234.5);
  });
  it('reads a dot in an amount as a decimal mark when the digits after it are not a group of three', () => {
    expect(parseNumber('12.5', 'amount')).toBe(12.5);
    expect(parseNumber('1234.56', 'amount')).toBe(1234.56);
    expect(parseNumber('4,5', 'amount')).toBe(4.5);
  });
  it('accepts a typographic minus sign', () => {
    expect(parseNumber('−100', 'amount')).toBe(-100);
  });
});

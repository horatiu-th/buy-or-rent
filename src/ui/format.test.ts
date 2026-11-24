import { parseNumber } from './format';

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

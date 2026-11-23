import { formatMoney, formatDuration } from './format';

describe('formatMoney', () => {
  it('formats lei with Romanian grouping', () => {
    expect(formatMoney(1234567, 'RON', 1)).toBe('1.234.567 lei');
  });
  it('converts to euro', () => {
    expect(formatMoney(5100, 'EUR', 5.1)).toBe('1.000 €');
  });
});

describe('formatDuration', () => {
  it('formats months as years and months', () => {
    expect(formatDuration(1)).toBe('1 lună');
    expect(formatDuration(12)).toBe('1 an');
    expect(formatDuration(27)).toBe('2 ani și 3 luni');
    expect(formatDuration(0)).toBe('0 luni');
  });
});

import { en } from './en';

describe('en.duration', () => {
  it('formats months as years and months', () => {
    expect(en.duration(1)).toBe('1 month');
    expect(en.duration(12)).toBe('1 year');
    expect(en.duration(27)).toBe('2 years and 3 months');
    expect(en.duration(20 * 12)).toBe('20 years');
    expect(en.duration(0)).toBe('0 months');
  });
  it('rounds fractional months instead of printing float noise', () => {
    expect(en.duration(3.6 * 12)).toBe('3 years and 7 months');
  });
});

describe('en.unitWord', () => {
  it.each([[1, 'year'], [0, 'years'], [2, 'years'], [21, 'years']])('%i → %s', (n, text) => {
    expect(en.unitWord(n, 'year')).toBe(text);
  });
});

describe('en.footer.rate', () => {
  it('spells out the date so day and month cannot be swapped', () => {
    expect(en.footer.rate('5,0912', '2026-03-04')).toContain('4 March 2026');
  });
});

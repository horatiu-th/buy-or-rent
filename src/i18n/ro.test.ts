import { ro } from './ro';

describe('ro.duration', () => {
  it('formats months as years and months', () => {
    expect(ro.duration(1)).toBe('1 lună');
    expect(ro.duration(12)).toBe('1 an');
    expect(ro.duration(27)).toBe('2 ani și 3 luni');
    expect(ro.duration(0)).toBe('0 luni');
  });
  it('adds "de" from twenty years on, as Romanian grammar requires', () => {
    expect(ro.duration(19 * 12)).toBe('19 ani');
    expect(ro.duration(20 * 12)).toBe('20 de ani');
    expect(ro.duration(30 * 12 + 2)).toBe('30 de ani și 2 luni');
  });
  it('rounds fractional months instead of printing float noise', () => {
    expect(ro.duration(3.6 * 12)).toBe('3 ani și 7 luni');
    expect(ro.duration(0.3)).toBe('0 luni');
  });
});

describe('ro.count', () => {
  it.each([
    [1, '1 an'], [2, '2 ani'], [19, '19 ani'], [20, '20 de ani'], [21, '21 de ani'],
    [100, '100 de ani'], [101, '101 ani'], [119, '119 ani'], [120, '120 de ani'],
  ])('%i → %s', (n, text) => {
    expect(ro.count(n, 'year')).toBe(text);
  });
});

describe('ro.unitWord', () => {
  it.each([
    [1, 'an'], [0, 'ani'], [2, 'ani'], [19, 'ani'], [20, 'de ani'], [30, 'de ani'], [101, 'ani'],
  ])('%i → %s', (n, text) => {
    expect(ro.unitWord(n, 'year')).toBe(text);
  });
  it('declines months too', () => {
    expect(ro.unitWord(1, 'month')).toBe('lună');
    expect(ro.unitWord(20, 'month')).toBe('de luni');
  });
});

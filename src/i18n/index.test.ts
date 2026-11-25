import { DEFAULT_LOCALE, LOCALE_IDS, LOCALES, matchLocale } from '.';

describe('matchLocale', () => {
  it('picks the first preferred language we have, by its primary subtag', () => {
    expect(matchLocale(['en-US', 'ro'])).toBe('en');
    expect(matchLocale(['de-DE', 'ro-RO', 'en'])).toBe('ro');
    expect(matchLocale(['EN-gb'])).toBe('en');
  });
  it('falls back to the default when none matches', () => {
    expect(matchLocale(['de', 'fr'])).toBe(DEFAULT_LOCALE);
    expect(matchLocale([])).toBe(DEFAULT_LOCALE);
  });
});

describe('LOCALES', () => {
  it('gives every language a distinct name of its own', () => {
    const names = LOCALE_IDS.map((id) => LOCALES[id].language.name);
    expect(new Set(names).size).toBe(names.length);
  });
});

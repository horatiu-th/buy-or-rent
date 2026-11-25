import { useCallback, useEffect, useState } from 'react';
import { isLocale, LOCALES, matchLocale, type LocaleId } from '.';

const KEY = 'lang';

/** A language picked on an earlier visit wins; otherwise the browser's preferred languages decide. */
function initialLocale(): LocaleId {
  try {
    const stored = localStorage.getItem(KEY);
    if (isLocale(stored)) return stored;
  } catch {
    // Storage can be blocked; fall through to the browser's languages.
  }
  return matchLocale(navigator.languages?.length ? navigator.languages : [navigator.language]);
}

/**
 * The page language. The choice is remembered across visits but kept out of the link: a shared
 * scenario should open in the reader's language, not the sender's.
 */
export function useLocale() {
  const [locale, setLocaleState] = useState<LocaleId>(initialLocale);

  useEffect(() => {
    // Screen readers pick their voice from <html lang>, and the tab title should match the page.
    document.documentElement.lang = locale;
    document.title = LOCALES[locale].title;
  }, [locale]);

  const setLocale = useCallback((next: LocaleId) => {
    setLocaleState(next);
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // Private modes can refuse storage; the language still applies for this visit.
    }
  }, []);

  return { locale, setLocale };
}

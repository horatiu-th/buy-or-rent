import { createContext, useContext } from 'react';
import { en } from './en';
import { ro } from './ro';

/**
 * The Romanian messages are the reference: every other language provides the same keys with the
 * same shapes, and the compiler rejects one that is missing anything.
 */
export type Messages = typeof ro;

/**
 * Every language the page can show, keyed by its BCP 47 tag, which also goes on <html lang>. The picker
 * lists them in this order. To add one, write a file like ro.ts and register it here.
 */
export const LOCALES = { ro, en } as const satisfies Record<string, Messages>;
export type LocaleId = keyof typeof LOCALES;
export const LOCALE_IDS = Object.keys(LOCALES) as LocaleId[];

/** Shown when neither a stored choice nor the browser's languages match one we have. */
export const DEFAULT_LOCALE: LocaleId = 'ro';

export const isLocale = (v: unknown): v is LocaleId => typeof v === 'string' && Object.hasOwn(LOCALES, v);

/**
 * The first of the browser's preferred languages that we have, matched on the primary subtag so
 * "en-US" picks English; the default when none matches.
 */
export function matchLocale(preferred: readonly string[]): LocaleId {
  for (const tag of preferred) {
    const primary = tag.split('-')[0].toLowerCase();
    if (isLocale(primary)) return primary;
  }
  return DEFAULT_LOCALE;
}

/**
 * The active messages. Defaults to the reference language, so a component rendered on its own (in a
 * test, say) still has text; the app provides the chosen language at its root.
 */
export const MessagesContext = createContext<Messages>(LOCALES[DEFAULT_LOCALE]);

/** The active language's text, grammar and number formats. */
export const useT = () => useContext(MessagesContext);

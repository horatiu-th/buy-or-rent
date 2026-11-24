import { ro } from './ro';

/**
 * The Romanian messages are the reference: every other language provides the same keys with the
 * same shapes, and the compiler rejects one that is missing anything.
 */
export type Messages = typeof ro;

/** Every language the page can show. To add one, write a file like ro.ts and register it here. */
export const LOCALES = { ro } as const satisfies Record<string, Messages>;
export type LocaleId = keyof typeof LOCALES;

export const DEFAULT_LOCALE: LocaleId = 'ro';

/** The active messages. Components and helpers read all their text, grammar and number formats from here. */
export const t: Messages = LOCALES[DEFAULT_LOCALE];

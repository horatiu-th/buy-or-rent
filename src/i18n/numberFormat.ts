const cache = new Map<string, Intl.NumberFormat>();

/**
 * A shared Intl.NumberFormat for a locale and options. Building one is slow compared with formatting,
 * and charts and tables format thousands of numbers per render, so each combination is built once.
 */
export function numberFormat(locale: string, options: Intl.NumberFormatOptions = {}): Intl.NumberFormat {
  const key = `${locale}|${JSON.stringify(options)}`;
  let fmt = cache.get(key);
  if (!fmt) {
    fmt = new Intl.NumberFormat(locale, options);
    cache.set(key, fmt);
  }
  return fmt;
}

/** The character a locale puts between groups of thousands: "." in Romanian, "," in English. */
export function groupSeparator(locale: string): string {
  return numberFormat(locale).formatToParts(11111).find((p) => p.type === 'group')?.value ?? '';
}

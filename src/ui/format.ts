import { groupSeparator, numberFormat } from '../i18n/numberFormat';

/**
 * How typed numbers are read:
 * - Spaces are ignored everywhere, so "1 234" is 1234.
 * - 'decimal' (percentages, years, area): "," and "." are both decimal marks; at most one is allowed.
 * - 'amount' (money): the page groups amounts in the locale's style ("664.819" in Romanian, "664,819" in
 *   English), so that locale's group separator followed by groups of exactly three digits is a thousands
 *   separator. When both "." and "," appear, the last one is the decimal mark. Otherwise a single "," or
 *   "." is a decimal mark ("12.5", "4,5").
 * Returns null for anything that isn't one number, including the in-between states of typing ("", "-").
 */
export function parseNumber(text: string, kind: 'amount' | 'decimal', locale: string): number | null {
  let s = text.replace(/\s/g, '').replace(/^−/, '-');
  if (!/^-?[\d.,]*\d[\d.,]*$/.test(s)) return null;
  if (kind === 'amount') {
    const lastDot = s.lastIndexOf('.');
    const lastComma = s.lastIndexOf(',');
    if (lastDot >= 0 && lastComma >= 0) {
      const group = lastDot > lastComma ? ',' : '.';
      s = s.split(group).join('');
    } else {
      const group = groupSeparator(locale);
      const groupedPattern = group === '.' ? /^-?\d{1,3}(\.\d{3})+$/ : group === ',' ? /^-?\d{1,3}(,\d{3})+$/ : null;
      if (groupedPattern?.test(s)) s = s.split(group).join('');
    }
  }
  s = s.replace(',', '.');
  if (!/^-?(\d+\.?\d*|\.\d+)$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** How a number sits in an input box, in the locale's number format, thousands grouped only when asked. */
export function formatInputNumber(n: number, grouped: boolean, locale: string): string {
  return numberFormat(locale, { useGrouping: grouped, maximumFractionDigits: 6 }).format(n || 0);
}

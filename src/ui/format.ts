import { t } from '../i18n';

/**
 * How typed numbers are read:
 * - Spaces are ignored everywhere, so "1 234" is 1234.
 * - 'decimal' (percentages, years, area): "," and "." are both decimal marks; at most one is allowed.
 * - 'amount' (money): the page shows amounts as "664.819", so a "." followed by groups of exactly three
 *   digits is a thousands separator. When both "." and "," appear, the last one is the decimal mark.
 *   Otherwise a single "," or "." is a decimal mark ("12.5", "4,5").
 * Returns null for anything that isn't one number, including the in-between states of typing ("", "-").
 */
export function parseNumber(text: string, kind: 'amount' | 'decimal'): number | null {
  let s = text.replace(/\s/g, '').replace(/^−/, '-');
  if (!/^-?[\d.,]*\d[\d.,]*$/.test(s)) return null;
  if (kind === 'amount') {
    const lastDot = s.lastIndexOf('.');
    const lastComma = s.lastIndexOf(',');
    if (lastDot >= 0 && lastComma >= 0) {
      const group = lastDot > lastComma ? ',' : '.';
      s = s.split(group).join('');
    } else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) {
      s = s.split('.').join('');
    }
  }
  s = s.replace(',', '.');
  if (!/^-?(\d+\.?\d*|\.\d+)$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

const plainFmt = new Intl.NumberFormat(t.numberLocale, { useGrouping: false, maximumFractionDigits: 6 });
const groupedFmt = new Intl.NumberFormat(t.numberLocale, { maximumFractionDigits: 6 });

/** How a number sits in an input box, in the page's number format, thousands grouped only when asked. */
export function formatInputNumber(n: number, grouped: boolean): string {
  return (grouped ? groupedFmt : plainFmt).format(n || 0);
}

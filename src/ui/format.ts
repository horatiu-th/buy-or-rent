export type Currency = 'RON' | 'EUR';

const intFmt = new Intl.NumberFormat('ro-RO', { maximumFractionDigits: 0 });

export function formatMoney(lei: number, currency: Currency, eurRon: number): string {
  const amount = currency === 'EUR' ? lei / eurRon : lei;
  // `|| 0` turns the -0 that Math.round gives for small negatives into 0, so it never prints "-0".
  return `${intFmt.format(Math.round(amount) || 0)} ${currency === 'EUR' ? '€' : 'lei'}`;
}

/**
 * "1 an", "2 ani", "20 de ani". Romanian puts "de" between a number and its noun when the
 * number's last two digits are 00 or 20–99 (so "101 ani" but "120 de ani").
 */
/** The unit word that follows n in Romanian, including the "de" that numbers ending in 00 or 20–99 take. */
export function unitWord(n: number, one: string, many: string): string {
  if (n === 1) return one;
  const lastTwo = Math.abs(n) % 100;
  const de = lastTwo >= 20 || (lastTwo === 0 && n !== 0);
  return `${de ? 'de ' : ''}${many}`;
}

export function countOf(n: number, one: string, many: string): string {
  return `${n} ${unitWord(n, one, many)}`;
}

export function formatDuration(months: number): string {
  const total = Math.round(months);
  // Defensive: callers pass positive durations, but an empty string here would leave a sentence dangling.
  if (!(total > 0)) return '0 luni';
  const y = Math.floor(total / 12);
  const m = total % 12;
  const years = y === 0 ? '' : countOf(y, 'an', 'ani');
  const mons = m === 0 ? '' : countOf(m, 'lună', 'luni');
  return [years, mons].filter(Boolean).join(' și ');
}

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

const plainFmt = new Intl.NumberFormat('ro-RO', { useGrouping: false, maximumFractionDigits: 6 });
const groupedFmt = new Intl.NumberFormat('ro-RO', { maximumFractionDigits: 6 });

/** How a number sits in an input box: Romanian decimal comma, thousands grouped only when asked. */
export function formatInputNumber(n: number, grouped: boolean): string {
  return (grouped ? groupedFmt : plainFmt).format(n || 0);
}

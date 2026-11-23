export type Currency = 'RON' | 'EUR';

const intFmt = new Intl.NumberFormat('ro-RO', { maximumFractionDigits: 0 });

export function formatMoney(lei: number, currency: Currency, eurRon: number): string {
  const amount = currency === 'EUR' ? lei / eurRon : lei;
  return `${intFmt.format(Math.round(amount))} ${currency === 'EUR' ? '€' : 'lei'}`;
}

export function formatDuration(months: number): string {
  // Defensive: callers pass positive durations, but an empty string here would leave a sentence dangling.
  if (months <= 0) return '0 luni';
  const y = Math.floor(months / 12);
  const m = months % 12;
  const years = y === 0 ? '' : y === 1 ? '1 an' : `${y} ani`;
  const mons = m === 0 ? '' : m === 1 ? '1 lună' : `${m} luni`;
  return [years, mons].filter(Boolean).join(' și ');
}

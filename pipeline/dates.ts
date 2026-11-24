const DAY_MS = 24 * 60 * 60 * 1000;

/** A real calendar date in YYYY-MM-DD form. Rejects shapes like 2026-13-45 that Date would silently roll over. */
export function isIsoDate(s: unknown): s is string {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/** Whole days from `from` to `to`, in UTC so clock changes don't shift the count. */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
}

export { todayIso } from '../src/data/dates';

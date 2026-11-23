import type { DataPath, SourcedValue } from '../src/data/schema';
import { daysBetween, isIsoDate, todayIso } from './dates';
import type { AutoDataFile, Fetcher } from './types';
import { check } from './validate';

export type Outcome =
  | 'updated' | 'unchanged' // accepted
  | 'confirmed' // accepted: a held candidate seen again in a later publication
  | 'held' // moved more than maxJump; kept as a candidate, stored value untouched
  | 'rejected' // implausible or out of order; stored value untouched
  | 'failed' // fetch threw; stored value untouched
  | 'missing'; // fetch failed and there is no stored value, so the key stays absent

export interface ReportLine {
  path: DataPath;
  outcome: Outcome;
  value?: number;
  asOf?: string;
  reason?: string;
  /** The stored value is older than the fetcher's maxAgeDays. */
  stale: boolean;
}

export const PROBLEM_OUTCOMES: readonly Outcome[] = ['held', 'rejected', 'failed', 'missing'];

function getAt(obj: unknown, path: string): SourcedValue | undefined {
  return path.split('.').reduce<any>((o, k) => (o == null ? undefined : o[k]), obj);
}

function setAt(obj: any, path: string, v: SourcedValue) {
  const keys = path.split('.');
  let o = obj;
  for (const k of keys.slice(0, -1)) o = o[k] ??= {};
  o[keys[keys.length - 1]] = v;
}

function clearPending(data: AutoDataFile, path: DataPath) {
  if (!data.pending) return;
  delete data.pending[path];
  if (Object.keys(data.pending).length === 0) delete data.pending;
}

/**
 * Runs every fetcher against the previous auto data. Staleness comes from the age of each value's
 * asOf, not from whether this particular run succeeded, so a single failed fetch changes nothing
 * and `changed` stays false unless there is something worth reviewing.
 */
export async function runFetchers(fetchers: Fetcher[], previous: AutoDataFile, today = todayIso()) {
  const data: AutoDataFile = structuredClone(previous);
  const report: ReportLine[] = [];

  for (const f of fetchers) {
    const prev = getAt(data, f.path);
    let line: Omit<ReportLine, 'path' | 'stale'>;

    const accept = (value: number, asOf: string, outcome: Outcome, reason?: string) => {
      setAt(data, f.path, { value, unit: f.unit, source: f.source, sourceUrl: f.sourceUrl, asOf, status: 'ok' });
      clearPending(data, f.path);
      return { outcome, value, asOf, reason };
    };

    try {
      const { value, asOf } = await f.fetch();
      const range = check(value, f.range);
      const jump = check(value, f.range, prev?.value, f.maxJump);
      const candidate = data.pending?.[f.path];

      if (!isIsoDate(asOf)) line = { outcome: 'rejected', value, reason: `invalid date ${JSON.stringify(asOf)}` };
      else if (prev && asOf < prev.asOf) line = { outcome: 'rejected', value, asOf, reason: `dated ${asOf}, older than the stored ${prev.asOf}` };
      else if (!range.ok) line = { outcome: 'rejected', value, asOf, reason: range.reason };
      else if (jump.ok) line = accept(value, asOf, prev?.value === value && prev.asOf === asOf ? 'unchanged' : 'updated');
      // A genuine move shows up again in the next publication; a one-off glitch usually doesn't.
      // Requiring a later asOf stops a re-read of the same publication from confirming itself.
      else if (candidate && asOf > candidate.asOf && check(value, f.range, candidate.value, f.maxJump).ok) {
        line = accept(value, asOf, 'confirmed', `confirms ${candidate.value} from ${candidate.asOf}`);
      } else {
        data.pending = { ...data.pending, [f.path]: { value, asOf, reason: jump.reason } };
        line = { outcome: 'held', value, asOf, reason: `${jump.reason}; held until a later publication confirms it` };
      }
    } catch (e) {
      line = { outcome: prev ? 'failed' : 'missing', reason: e instanceof Error ? e.message : String(e) };
    }

    const current = getAt(data, f.path);
    const stale = current ? daysBetween(current.asOf, today) > f.maxAgeDays : false;
    if (current) {
      const status = stale ? 'stale' : 'ok';
      if (current.status !== status) setAt(data, f.path, { ...current, status });
    }
    report.push({ path: f.path, ...line, stale });
  }

  const changed = JSON.stringify(data) !== JSON.stringify(previous);
  return { data, report, changed };
}

export function formatReport(report: ReportLine[], changed: boolean): string {
  const lines = report.map((r) =>
    `| ${r.path} | ${r.outcome}${r.stale ? ' (stale)' : ''} | ${r.value ?? ''} | ${r.asOf ?? ''} | ${r.reason ?? ''} |`);
  const held = report.filter((r) => r.outcome === 'held');
  const notes = [
    changed ? '' : 'No data changed, so no update is proposed.',
    held.length
      ? `**Held for confirmation:** ${held.map((r) => `${r.path} = ${r.value}`).join(', ')}. ` +
        'Merging records the candidate; the next run applies it if the source still agrees. ' +
        'To apply it now, edit data/auto.json by hand after checking the source.'
      : '',
  ].filter(Boolean);
  return ['## Data update', '', '| Path | Outcome | Value | As of | Note |', '|---|---|---|---|---|', ...lines, '', ...notes]
    .join('\n') + '\n';
}

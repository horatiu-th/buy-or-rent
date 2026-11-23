import type { PartialDataFile, SourcedValue } from '../src/data/schema';
import type { Fetcher } from './types';
import { check } from './validate';

export interface ReportLine {
  path: string;
  outcome: 'updated' | 'unchanged' | 'stale' | 'missing';
  value?: number;
  reason?: string;
}

function getAt(obj: unknown, path: string): SourcedValue | undefined {
  return path.split('.').reduce<any>((o, k) => (o == null ? undefined : o[k]), obj);
}

function setAt(obj: any, path: string, v: SourcedValue) {
  const keys = path.split('.');
  let o = obj;
  for (const k of keys.slice(0, -1)) o = o[k] ??= {};
  o[keys[keys.length - 1]] = v;
}

export async function runFetchers(fetchers: Fetcher[], previous: PartialDataFile) {
  const data: PartialDataFile = structuredClone(previous);
  const report: ReportLine[] = [];

  for (const f of fetchers) {
    const prev = getAt(data, f.path);
    const markStale = (reason: string) => {
      if (prev) setAt(data, f.path, { ...prev, status: 'stale' });
      report.push({ path: f.path, outcome: prev ? 'stale' : 'missing', reason });
    };
    try {
      const { value, asOf } = await f.fetch();
      const c = check(value, f.range, prev?.value);
      if (!c.ok) { markStale(c.reason); continue; }
      setAt(data, f.path, { value, unit: f.unit, source: f.source, sourceUrl: f.sourceUrl, asOf, status: 'ok' });
      report.push({ path: f.path, outcome: prev?.value === value ? 'unchanged' : 'updated', value });
    } catch (e) {
      markStale(e instanceof Error ? e.message : String(e));
    }
  }
  return { data, report };
}

export function formatReport(report: ReportLine[]): string {
  const lines = report.map((r) =>
    `| ${r.path} | ${r.outcome} | ${r.value ?? ''} | ${r.reason ?? ''} |`);
  return ['## Data update', '', '| Path | Outcome | Value | Note |', '|---|---|---|---|', ...lines].join('\n') + '\n';
}

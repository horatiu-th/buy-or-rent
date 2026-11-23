import { STATUSES } from '../src/data/schema';
import { isIsoDate } from './dates';

export interface Range { min: number; max: number }
export type CheckResult = { ok: true } | { ok: false; reason: string };

export function check(value: number, range: Range, previous?: number, maxJump = 0.3): CheckResult {
  if (!Number.isFinite(value)) return { ok: false, reason: 'not a number' };
  if (value < range.min || value > range.max) return { ok: false, reason: `outside [${range.min}, ${range.max}]` };
  if (previous !== undefined && previous !== 0 && Math.abs(value - previous) / Math.abs(previous) > maxJump) {
    return { ok: false, reason: `changed more than ${maxJump * 100}% from ${previous}` };
  }
  return { ok: true };
}

const FIELDS = new Set(['value', 'unit', 'source', 'sourceUrl', 'asOf', 'validUntil', 'status']);
const nonEmpty = (x: unknown) => typeof x === 'string' && x.trim() !== '';

/** Problems with one stored SourcedValue, as messages without the key name. Empty when it is well formed. */
export function sourcedValueProblems(v: unknown, range: Range): string[] {
  if (typeof v !== 'object' || v === null) return ['is not an object'];
  const o = v as Record<string, unknown>;
  const problems: string[] = [];
  for (const k of Object.keys(o)) if (!FIELDS.has(k)) problems.push(`has unknown field "${k}"`);
  if (typeof o.value !== 'number') problems.push(`value must be a number, got ${JSON.stringify(o.value)}`);
  else {
    const c = check(o.value, range);
    if (!c.ok) problems.push(`value ${o.value} is ${c.reason}`);
  }
  if (!nonEmpty(o.unit)) problems.push('unit is missing');
  if (!nonEmpty(o.source)) problems.push('source is missing');
  if (o.sourceUrl !== undefined && !(typeof o.sourceUrl === 'string' && /^https?:\/\//.test(o.sourceUrl))) {
    problems.push('sourceUrl must be an http(s) URL');
  }
  if (!isIsoDate(o.asOf)) problems.push(`asOf must be a YYYY-MM-DD date, got ${JSON.stringify(o.asOf)}`);
  if (o.validUntil !== undefined && !isIsoDate(o.validUntil)) {
    problems.push(`validUntil must be a YYYY-MM-DD date, got ${JSON.stringify(o.validUntil)}`);
  }
  if (!STATUSES.includes(o.status as never)) problems.push(`status must be one of ${STATUSES.join(', ')}, got ${JSON.stringify(o.status)}`);
  return problems;
}

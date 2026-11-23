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

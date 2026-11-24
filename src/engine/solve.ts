import { lastRow, simulate } from './simulate';
import { sanitizeInputs } from './sanitize';
import type { Inputs, MonthRow } from './types';

export type EquivalentRent =
  | { kind: 'value'; rent: number }
  | { kind: 'alwaysBuy' }
  | { kind: 'alwaysRent' }
  /**
   * Buying wins at zero rent but loses at a high one, so a higher rent helps the renter and there is no
   * rent above which buying wins. Happens only with extreme inputs, e.g. a large idle deposit and collapsing returns.
   */
  | { kind: 'noThreshold' }
  /** The simulation overflowed at the search bounds, so no rent can be trusted. */
  | { kind: 'invalid' };

const gapOf = (r: MonthRow) => r.buyerNetWorth - r.renterNetWorth;

/** Buyer net worth minus renter net worth at the horizon. */
export function finalGap(i: Inputs): number {
  return gapOf(lastRow(simulate(i).rows));
}

// The first upper bound tried: 2% of the price per month is above any realistic rent, but a floor in lei
// keeps the bound meaningful when the price is tiny and fixed costs dominate.
const RENT_SEARCH_PRICE_SHARE = 0.02;
const RENT_SEARCH_FLOOR = 1_000;
// Owning can cost more per month than 2% of the price (e.g. at very high loan rates), so the bound
// doubles until the buyer wins; past ~1000× the first bound, renting is taken to win at any rent.
const MAX_DOUBLINGS = 10;
// Results are shown in whole lei, so the search stops once the bracket is far narrower than that.
const RENT_TOLERANCE = 1e-3;
const MAX_BISECTIONS = 60;

/**
 * The starting rent at which buyer and renter end the horizon level. The bisection relies on the final
 * gap growing with rent, which holds unless an idle rent deposit outweighs everything the buyer invests;
 * that case is detected at the ends of the search range and reported as `noThreshold`.
 */
export function equivalentRent(raw: Inputs): EquivalentRent {
  // Sanitized first so the search bounds come from the same price the simulation uses.
  const i = sanitizeInputs({ ...raw, rent: 0 });
  const gapAt = (rent: number) => finalGap({ ...i, rent });
  const firstBound = Math.max(i.price * RENT_SEARCH_PRICE_SHARE, RENT_SEARCH_FLOOR);

  const gapLo = gapAt(0);
  if (!Number.isFinite(gapLo)) return { kind: 'invalid' };
  if (gapLo >= 0) {
    // Buying wins at zero rent; that only means it wins at every rent if a high rent doesn't reverse it.
    const gapFar = gapAt(firstBound * 2 ** MAX_DOUBLINGS);
    if (!Number.isFinite(gapFar)) return { kind: 'invalid' };
    return gapFar >= 0 ? { kind: 'alwaysBuy' } : { kind: 'noThreshold' };
  }

  let lo = 0;
  let hi = firstBound;
  let gapHi = gapAt(hi);
  for (let k = 0; k < MAX_DOUBLINGS && gapHi <= 0; k++) {
    lo = hi;
    hi *= 2;
    gapHi = gapAt(hi);
  }
  if (!Number.isFinite(gapHi)) return { kind: 'invalid' };
  if (gapHi <= 0) return { kind: 'alwaysRent' };

  for (let k = 0; k < MAX_BISECTIONS && hi - lo > RENT_TOLERANCE; k++) {
    const mid = (lo + hi) / 2;
    if (gapAt(mid) < 0) lo = mid;
    else hi = mid;
  }
  return { kind: 'value', rent: (lo + hi) / 2 };
}

export const SENSITIVITY_STEPS = [-0.02, 0, 0.02] as const;
/** The row and column of the grid that hold the inputs as given. */
export const SENSITIVITY_BASE = SENSITIVITY_STEPS.indexOf(0);

/** Rows vary property growth, columns vary investment return. Cells are finalGap. */
export function sensitivity(i: Inputs): number[][] {
  return SENSITIVITY_STEPS.map((dp) =>
    SENSITIVITY_STEPS.map((dr) =>
      finalGap({ ...i, propertyGrowth: i.propertyGrowth + dp, investReturn: i.investReturn + dr }),
    ),
  );
}

/** The other assumptions the verdict is sensitive to, each moved on its own, down and up. */
export const ASSUMPTION_SWINGS = [
  { key: 'rent', down: (i) => i.rent * 0.9, up: (i) => i.rent * 1.1 },
  { key: 'rentGrowth', down: (i) => i.rentGrowth - 0.01, up: (i) => i.rentGrowth + 0.01 },
  { key: 'irccLongRun', down: (i) => Math.max(0, i.irccLongRun - 0.01), up: (i) => i.irccLongRun + 0.01 },
  { key: 'maintenancePct', down: (i) => i.maintenancePct * 0.75, up: (i) => i.maintenancePct * 1.25 },
] as const satisfies readonly { key: keyof Inputs; down: (i: Inputs) => number; up: (i: Inputs) => number }[];

export type SwingKey = (typeof ASSUMPTION_SWINGS)[number]['key'];

export interface Swing {
  key: SwingKey;
  down: { value: number; gap: number };
  up: { value: number; gap: number };
}

/** finalGap with one assumption at a time moved down and up; the base case is finalGap(i). */
export function assumptionSwings(i: Inputs): Swing[] {
  return ASSUMPTION_SWINGS.map((s) => {
    const at = (value: number) => ({ value, gap: finalGap({ ...i, [s.key]: value }) });
    return { key: s.key, down: at(s.down(i)), up: at(s.up(i)) };
  });
}

/** Holding periods shown next to the chosen horizon: how long the household actually stays matters more than the loan term. */
export const HORIZON_STEPS = [5, 10, 20, 30] as const;

/** The standard holding periods plus the chosen one, in order and without duplicates. */
function horizonsFor(i: Inputs, steps: readonly number[]): number[] {
  return [...new Set([...steps, sanitizeInputs(i).horizonYears])].sort((a, b) => a - b);
}

export interface HorizonGap {
  years: number;
  /** Buyer minus renter net worth at that horizon, nominal. */
  gap: number;
  /** Divide gap by this for today's lei. */
  deflator: number;
}

export interface HorizonThreshold {
  years: number;
  eq: EquivalentRent;
}

export type HorizonResult = HorizonGap & HorizonThreshold;

/** Who is ahead at each holding period, and by how much. One simulation per horizon. */
export function horizonGaps(i: Inputs, steps: readonly number[] = HORIZON_STEPS): HorizonGap[] {
  return horizonsFor(i, steps).map((years) => {
    const last = lastRow(simulate({ ...i, horizonYears: years }).rows);
    return { years, gap: gapOf(last), deflator: last.deflator };
  });
}

/**
 * The break-even rent at each holding period. It doesn't depend on the rent, and it is the costliest
 * figure on the page (a search per horizon), so it is kept apart from the gaps for callers to cache.
 */
export function horizonThresholds(i: Inputs, steps: readonly number[] = HORIZON_STEPS): HorizonThreshold[] {
  return horizonsFor(i, steps).map((years) => ({ years, eq: equivalentRent({ ...i, horizonYears: years }) }));
}

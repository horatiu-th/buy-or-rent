import { simulate } from './simulate';
import { sanitizeInputs } from './sanitize';
import type { Inputs } from './types';

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

/** Buyer net worth minus renter net worth at the horizon. */
export function finalGap(i: Inputs): number {
  const rows = simulate(i).rows;
  const last = rows[rows.length - 1];
  return last.buyerNetWorth - last.renterNetWorth;
}

// The first upper bound tried: 2% of the price per month is above any realistic rent, but a floor in lei
// keeps the bound meaningful when the price is tiny and fixed costs dominate.
const RENT_SEARCH_PRICE_SHARE = 0.02;
const RENT_SEARCH_FLOOR = 1_000;
// Owning can cost more per month than 2% of the price (e.g. at very high loan rates), so the bound
// doubles until the buyer wins; past ~1000× the first bound, renting is taken to win at any rent.
const MAX_DOUBLINGS = 10;

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

  for (let k = 0; k < 40; k++) {
    const mid = (lo + hi) / 2;
    if (gapAt(mid) < 0) lo = mid;
    else hi = mid;
  }
  return { kind: 'value', rent: (lo + hi) / 2 };
}

export const SENSITIVITY_STEPS = [-0.02, 0, 0.02];

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
  { key: 'rent', down: (i: Inputs) => i.rent * 0.9, up: (i: Inputs) => i.rent * 1.1 },
  { key: 'rentGrowth', down: (i: Inputs) => i.rentGrowth - 0.01, up: (i: Inputs) => i.rentGrowth + 0.01 },
  { key: 'irccLongRun', down: (i: Inputs) => Math.max(0, i.irccLongRun - 0.01), up: (i: Inputs) => i.irccLongRun + 0.01 },
  { key: 'maintenancePct', down: (i: Inputs) => i.maintenancePct * 0.75, up: (i: Inputs) => i.maintenancePct * 1.25 },
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
export const HORIZON_STEPS = [5, 10, 20, 30];

export interface HorizonResult {
  years: number;
  /** Buyer minus renter net worth at that horizon, nominal. */
  gap: number;
  /** Divide gap by this for today's lei. */
  deflator: number;
  eq: EquivalentRent;
}

/** The verdict at several holding periods, always including the chosen horizon. */
export function horizonComparison(i: Inputs, steps: readonly number[] = HORIZON_STEPS): HorizonResult[] {
  const chosen = sanitizeInputs(i).horizonYears;
  const years = [...new Set([...steps, chosen])].sort((a, b) => a - b);
  return years.map((y) => {
    const at = { ...i, horizonYears: y };
    const rows = simulate(at).rows;
    const last = rows[rows.length - 1];
    return { years: y, gap: last.buyerNetWorth - last.renterNetWorth, deflator: last.deflator, eq: equivalentRent(at) };
  });
}

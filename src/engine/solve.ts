import { simulate } from './simulate';
import { sanitizeInputs } from './sanitize';
import type { Inputs } from './types';

export type EquivalentRent =
  | { kind: 'value'; rent: number }
  | { kind: 'alwaysBuy' }
  | { kind: 'alwaysRent' }
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
 * The starting rent at which buyer and renter end the horizon level. Relies on the final gap growing
 * with rent, which holds unless an idle rent deposit outweighs everything the buyer invests.
 */
export function equivalentRent(raw: Inputs): EquivalentRent {
  // Sanitized first so the search bounds come from the same price the simulation uses.
  const i = sanitizeInputs({ ...raw, rent: 0 });
  const gapAt = (rent: number) => finalGap({ ...i, rent });

  const gapLo = gapAt(0);
  if (!Number.isFinite(gapLo)) return { kind: 'invalid' };
  if (gapLo >= 0) return { kind: 'alwaysBuy' };

  let lo = 0;
  let hi = Math.max(i.price * RENT_SEARCH_PRICE_SHARE, RENT_SEARCH_FLOOR);
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

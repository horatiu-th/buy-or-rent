import { simulate } from './simulate';
import type { Inputs } from './types';

export type EquivalentRent =
  | { kind: 'value'; rent: number }
  | { kind: 'alwaysBuy' }
  | { kind: 'alwaysRent' };

/** Buyer net worth minus renter net worth at the horizon. */
export function finalGap(i: Inputs): number {
  const rows = simulate(i).rows;
  const last = rows[rows.length - 1];
  return last.buyerNetWorth - last.renterNetWorth;
}

export function equivalentRent(i: Inputs): EquivalentRent {
  const gapAt = (rent: number) => finalGap({ ...i, rent });
  let lo = 0;
  // 2% of the price per month is far above any realistic rent, so it bounds the search.
  let hi = i.price * 0.02;
  if (gapAt(lo) >= 0) return { kind: 'alwaysBuy' };
  if (gapAt(hi) <= 0) return { kind: 'alwaysRent' };
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

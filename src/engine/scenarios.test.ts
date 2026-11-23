import { simulate, equivalentRent } from './index';
import { baseInputs } from './fixtures';

const summarize = (i: typeof baseInputs) => {
  const r = simulate(i);
  const end = r.rows[r.rows.length - 1];
  const round = (x: number) => Math.round(x);
  const eq = equivalentRent(i);
  return {
    buyer: round(end.buyerNetWorth),
    renter: round(end.renterNetWorth),
    breakEvenMonth: r.breakEvenMonth,
    // Rounded so solver tolerance changes don't churn the snapshot.
    equivalentRent: eq.kind === 'value' ? { ...eq, rent: Math.round(eq.rent * 100) / 100 } : eq,
  };
};

it('2-room flat, existing build', () => {
  expect(summarize({ ...baseInputs, price: 450_000, rent: 2_300 })).toMatchSnapshot();
});

it('3-room flat, new build', () => {
  expect(summarize({ ...baseInputs, price: 750_000, rent: 3_500 })).toMatchSnapshot();
});

it('cash purchase, short horizon', () => {
  expect(summarize({ ...baseInputs, downPaymentPct: 1, horizonYears: 5 })).toMatchSnapshot();
});

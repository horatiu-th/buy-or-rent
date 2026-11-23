import { breakEven, irccAt, IRCC_CONVERGENCE_MONTHS, simulate } from './simulate';
import type { MonthRow } from './types';
import { acquisitionCosts } from './costs';
import { amortize } from './mortgage';
import { baseInputs, flatWorld } from './fixtures';

const last = <T,>(xs: T[]) => xs[xs.length - 1];

describe('simulate', () => {
  it('produces one row per month plus month 0', () => {
    expect(simulate(baseInputs).rows).toHaveLength(30 * 12 + 1);
  });

  it("starts the renter ahead by the buyer's sunk costs less the renter's agency fee", () => {
    const i = { ...baseInputs, includeSaleCosts: false };
    const r0 = simulate(i).rows[0];
    expect(r0.renterNetWorth - r0.buyerNetWorth).toBeCloseTo(acquisitionCosts(i) - i.rent * i.rentAgencyPct, 6);
  });

  it('charges the renting agency fee once and does not refund it', () => {
    const withFee = simulate({ ...flatWorld, rentAgencyPct: 0.5 });
    const without = simulate({ ...flatWorld, rentAgencyPct: 0 });
    const fee = flatWorld.rent * 0.5;
    expect(withFee.renter.agencyFee).toBe(fee);
    expect(last(without.rows).renterNetWorth - last(withFee.rows).renterNetWorth).toBeCloseTo(fee, 6);
  });

  it('adds the buyer agency fee to the sunk purchase costs', () => {
    const withFee = simulate({ ...flatWorld, buyerAgencyPct: 0.02 }).rows[0];
    const without = simulate(flatWorld).rows[0];
    const gap = (r: typeof without) => r.renterNetWorth - r.buyerNetWorth;
    expect(gap(withFee) - gap(without)).toBeCloseTo(flatWorld.price * 0.02, 6);
  });

  it('charges the optional home policy on the current property value', () => {
    const i = { ...flatWorld, homeInsurancePct: 0.001, propertyGrowth: 0.05 };
    const { rows } = simulate(i);
    const payment = amortize({
      principal: i.price * (1 - i.downPaymentPct), termMonths: 360, fixedRate: i.fixedRate,
      fixedMonths: i.fixedYears * 12, variableRate: (m) => irccAt(m, i) + i.variableMargin,
    });
    expect(rows[13].buyerMonthlyCost - payment[12].payment).toBeCloseTo(rows[13].propertyValue * 0.001 / 12, 6);
  });

  it('spends the same total cash on both sides, every month', () => {
    // With no returns, appreciation or sale costs, each portfolio equals its contributions and can be read
    // back from net worth, so this checks the cash flows from the rows rather than from the running totals.
    const i = { ...baseInputs, investReturn: 0, propertyGrowth: 0, includeSaleCosts: false };
    const upfront = i.price * i.downPaymentPct + acquisitionCosts(i);
    const deposit = i.rent * i.depositMonths;
    let buyerSpent = upfront;
    let renterSpent = deposit + i.rent * i.rentAgencyPct;
    let buyerPf = 0;
    for (const row of simulate(i).rows) {
      buyerSpent += row.buyerMonthlyCost;
      renterSpent += row.renterMonthlyCost;
      buyerPf = row.buyerNetWorth - (row.propertyValue - row.loanBalance);
      const renterPf = row.renterNetWorth - deposit;
      expect(buyerSpent + buyerPf).toBeCloseTo(renterSpent + renterPf, 4);
    }
    // Rent overtakes the buyer's costs in this scenario, so both directions of top-up are exercised.
    expect(buyerPf).toBeGreaterThan(0);
  });

  it('returns the rent deposit to the renter at the horizon', () => {
    // At zero return, holding a deposit that comes back is worth the same as investing that cash.
    const withDeposit = last(simulate({ ...flatWorld, depositMonths: 2 }).rows);
    const without = last(simulate({ ...flatWorld, depositMonths: 0 }).rows);
    expect(withDeposit.renterNetWorth).toBeCloseTo(without.renterNetWorth, 6);
  });

  it('stops the loan payment once the term ends within the horizon', () => {
    const i = { ...flatWorld, loanTermYears: 10, horizonYears: 15 };
    const { rows } = simulate(i);
    const finalPayment = amortize({
      principal: i.price * (1 - i.downPaymentPct), termMonths: 120, fixedRate: i.fixedRate,
      fixedMonths: i.fixedYears * 12, variableRate: (m) => irccAt(m, i) + i.variableMargin,
    })[119].payment;
    expect(rows[120].buyerMonthlyCost - rows[121].buyerMonthlyCost).toBeCloseTo(finalPayment, 6);
    expect(rows[121].buyerMonthlyCost).toBe(0);
    expect(rows[180].loanBalance).toBe(0);
  });

  it('subtracts the outstanding loan when the horizon ends before the term', () => {
    // With free rent the renter takes all the spare cash, so the buyer holds only home equity.
    const end = last(simulate({ ...flatWorld, rent: 0, horizonYears: 10 }).rows);
    expect(end.loanBalance).toBeGreaterThan(0);
    expect(end.buyerNetWorth).toBeCloseTo(flatWorld.price - end.loanBalance, 6);
  });

  it('lowers the sale tax once the home is held past the short-hold threshold', () => {
    // A deliberate step in buyer net worth: Romanian sale tax drops for longer holds.
    const i = { ...flatWorld, includeSaleCosts: true, downPaymentPct: 1, rent: 0 };
    const { rows } = simulate(i);
    const threshold = i.saleTaxShortHoldYears * 12;
    const jump = rows[threshold + 1].buyerNetWorth - rows[threshold].buyerNetWorth;
    expect(jump).toBeCloseTo(i.price * (i.saleTaxShortPct - i.saleTaxLongPct), 6);
    expect(rows[threshold].buyerNetWorth - rows[threshold - 1].buyerNetWorth).toBeCloseTo(0, 6);
  });

  it('in a flat world with a cash purchase and free rent, the gap is only the fees', () => {
    const i = { ...flatWorld, downPaymentPct: 1, rent: 0, notaryPct: 0.01 };
    const end = last(simulate(i).rows);
    expect(end.buyerNetWorth).toBeCloseTo(i.price, 6);
    expect(end.renterNetWorth - end.buyerNetWorth).toBeCloseTo(i.price * 0.01, 6);
  });

  it('pays off the loan by the end of the term', () => {
    const { rows } = simulate(baseInputs);
    expect(rows[360].loanBalance).toBe(0);
  });

  it('favours renting when rent is tiny and buying when rent is huge', () => {
    const cheap = last(simulate({ ...baseInputs, rent: 100 }).rows);
    const pricey = last(simulate({ ...baseInputs, rent: 10_000 }).rows);
    expect(cheap.renterNetWorth).toBeGreaterThan(cheap.buyerNetWorth);
    expect(pricey.buyerNetWorth).toBeGreaterThan(pricey.renterNetWorth);
  });

  it('raises rent once per year', () => {
    const { rows } = simulate({ ...flatWorld, rentGrowth: 0.1 });
    expect(rows[12].renterMonthlyCost).toBeCloseTo(2_500, 6);
    expect(rows[13].renterMonthlyCost).toBeCloseTo(2_750, 6);
  });

  it('exposes a deflator that grows with inflation', () => {
    const { rows } = simulate({ ...baseInputs, inflation: 0.05 });
    expect(rows[12].deflator).toBeCloseTo(1.05, 6);
  });

  it('reports a break-even month only when the buyer stays ahead', () => {
    const r = simulate({ ...baseInputs, rent: 10_000 });
    expect(r.breakEvenMonth).not.toBeNull();
    const after = r.rows.filter((row) => row.month >= r.breakEvenMonth!);
    expect(after.every((row) => row.buyerNetWorth >= row.renterNetWorth)).toBe(true);
    expect(simulate({ ...baseInputs, rent: 100 }).breakEvenMonth).toBeNull();
  });

  it('reports break-even at month 0 and the buyer ever ahead when buying costs nothing upfront', () => {
    const r = simulate({ ...flatWorld, price: 0, rent: 1_000 });
    expect(r.breakEvenMonth).toBe(0);
    expect(r.buyerEverAhead).toBe(true);
  });

  it('reports the buyer never ahead when renting wins every month', () => {
    const r = simulate({ ...baseInputs, rent: 100 });
    expect(r.buyerEverAhead).toBe(false);
  });

  it('reports the buyer ever ahead when an early lead is later lost', () => {
    // A cash buyer with no fees starts level; renting a dear home loses at first, then cheap rent and
    // a collapsing property let the renter overtake.
    const r = simulate({ ...flatWorld, downPaymentPct: 1, rent: 5_000, rentGrowth: -0.2, propertyGrowth: -0.1 });
    expect(r.rows.some((row) => row.month > 0 && row.buyerNetWorth > row.renterNetWorth)).toBe(true);
    expect(r.buyerEverAhead).toBe(true);
    expect(r.breakEvenMonth).toBeNull();
  });
});

describe('breakEven', () => {
  const rows = (pairs: [number, number][]): MonthRow[] =>
    pairs.map(([buyerNetWorth, renterNetWorth], month) => ({
      month, buyerNetWorth, renterNetWorth, propertyValue: 0, loanBalance: 0, buyerMonthlyCost: 0,
      renterMonthlyCost: 0, renterCashNetWorth: 0, deflator: 1,
    }));

  it('is 0 when the buyer is ahead from month 0 onward', () => {
    expect(breakEven(rows([[10, 5], [11, 5], [12, 5]]))).toBe(0);
  });

  it('counts a tie as the buyer being ahead', () => {
    expect(breakEven(rows([[5, 5], [5, 5], [5, 5]]))).toBe(0);
    expect(breakEven(rows([[4, 5], [5, 5], [6, 5]]))).toBe(1);
  });

  it('starts after the last month the buyer is behind, ignoring an earlier lead', () => {
    expect(breakEven(rows([[6, 5], [4, 5], [6, 5], [7, 5]]))).toBe(2);
  });

  it('is null when the buyer is behind at the horizon', () => {
    expect(breakEven(rows([[6, 5], [6, 5], [4, 5]]))).toBeNull();
  });
});

describe('renter who keeps savings in a bank deposit', () => {
  // Without tax the two renters differ only in return; with tax they also differ in when it is paid.
  it('matches the investing renter when the deposit pays the same and nothing is taxed', () => {
    const { rows } = simulate({ ...baseInputs, investReturn: 0.04, savingsRate: 0.04, investTaxRate: 0, savingsTaxRate: 0 });
    for (const r of rows) expect(r.renterCashNetWorth).toBeCloseTo(r.renterNetWorth, 4);
  });

  it('falls behind the investing renter when investing pays more', () => {
    const end = simulate({ ...baseInputs, investReturn: 0.06, savingsRate: 0.02 }).rows.at(-1)!;
    expect(end.renterCashNetWorth).toBeLessThan(end.renterNetWorth);
  });

  it('holds exactly the deposit plus every lei not spent at a zero deposit rate', () => {
    const i = { ...baseInputs, investReturn: 0.08, savingsRate: 0 };
    const { rows } = simulate(i);
    const upfront = i.price * i.downPaymentPct + acquisitionCosts(i) - i.rent * i.rentAgencyPct;
    const saved = rows.slice(1).reduce((s, r) => s + Math.max(0, r.buyerMonthlyCost - r.renterMonthlyCost), 0);
    expect(rows.at(-1)!.renterCashNetWorth).toBeCloseTo(upfront + saved, 4);
  });

  it('withholds deposit tax as interest is paid, so savings compound at the after-tax rate', () => {
    // A rent far above the cost of owning means the renter never adds savings after day one.
    const i = { ...baseInputs, rent: 20_000, depositMonths: 0, savingsRate: 0.04, savingsTaxRate: 0.1, horizonYears: 30 };
    const { rows } = simulate(i);
    const start = rows[0].renterCashNetWorth;
    expect(rows.at(-1)!.renterCashNetWorth).toBeCloseTo(start * Math.pow(1 + 0.04 * 0.9, 30), 2);
  });

  it('taxes deposit interest independently of the investment tax', () => {
    const at = (savingsTaxRate: number, investTaxRate: number) =>
      simulate({ ...baseInputs, savingsRate: 0.05, savingsTaxRate, investTaxRate }).rows.at(-1)!.renterCashNetWorth;
    expect(at(0.1, 0)).toBeLessThan(at(0, 0));
    expect(at(0.1, 0)).toBeCloseTo(at(0.1, 0.5), 6);
  });
});

describe('property tax', () => {
  it('starts at the annual amount and rises with inflation once a year, whatever the home is worth', () => {
    const i = { ...flatWorld, propertyTaxAnnual: 1_200, inflation: 0.05, propertyGrowth: 0.1 };
    const { rows } = simulate(i);
    const tax = (m: number) => simulate({ ...i, propertyTaxAnnual: 0 }).rows[m].buyerMonthlyCost;
    expect(rows[1].buyerMonthlyCost - tax(1)).toBeCloseTo(100, 9);
    expect(rows[12].buyerMonthlyCost - tax(12)).toBeCloseTo(100, 9);
    expect(rows[13].buyerMonthlyCost - tax(13)).toBeCloseTo(105, 9);
  });
});

describe('irccAt', () => {
  const i = { ircc: 0.06, irccLongRun: 0.045 };

  it('starts at today\'s IRCC and reaches the long-run level after the convergence period', () => {
    expect(irccAt(1, i)).toBe(0.06);
    expect(irccAt(IRCC_CONVERGENCE_MONTHS + 1, i)).toBeCloseTo(0.045, 12);
    expect(irccAt(300, i)).toBeCloseTo(0.045, 12);
  });

  it('changes only at the start of a quarter', () => {
    expect(irccAt(2, i)).toBe(irccAt(1, i));
    expect(irccAt(3, i)).toBe(irccAt(1, i));
    expect(irccAt(4, i)).toBeLessThan(irccAt(3, i));
  });

  it('stays flat when the long-run level equals today\'s', () => {
    expect(irccAt(100, { ircc: 0.05, irccLongRun: 0.05 })).toBe(0.05);
  });
});

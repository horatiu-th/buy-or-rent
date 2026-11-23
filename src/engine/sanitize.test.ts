import { MAX_HORIZON_YEARS, MAX_LOAN_TERM_YEARS, MIN_HORIZON_YEARS, MIN_LOAN_TERM_YEARS, sanitizeInputs } from './sanitize';
import type { Inputs } from './types';
import { simulate } from './simulate';
import { baseInputs } from './fixtures';

const last = <T,>(xs: T[]) => xs[xs.length - 1];
const allFinite = (i: typeof baseInputs) =>
  simulate(i).rows.every((r) => Object.values(r).every((v) => Number.isFinite(v)));

describe('sanitizeInputs', () => {
  it('leaves valid inputs unchanged', () => {
    expect(sanitizeInputs(baseInputs)).toEqual(baseInputs);
  });

  it('clamps the down payment to between 0 and 100%', () => {
    expect(sanitizeInputs({ ...baseInputs, downPaymentPct: 1.2 }).downPaymentPct).toBe(1);
    expect(sanitizeInputs({ ...baseInputs, downPaymentPct: -0.1 }).downPaymentPct).toBe(0);
  });

  it('gives a loan at least a one-year term', () => {
    expect(sanitizeInputs({ ...baseInputs, loanTermYears: 0 }).loanTermYears).toBe(1);
  });

  it('keeps at least a one-year horizon and a non-negative fixed period', () => {
    const s = sanitizeInputs({ ...baseInputs, horizonYears: 0, fixedYears: -2 });
    expect(s.horizonYears).toBe(1);
    expect(s.fixedYears).toBe(0);
  });

  it('keeps growth, return and inflation rates above -99%', () => {
    const s = sanitizeInputs({ ...baseInputs, propertyGrowth: -1, investReturn: -2, inflation: -1, rentGrowth: -1.5 });
    for (const v of [s.propertyGrowth, s.investReturn, s.inflation, s.rentGrowth]) expect(v).toBeGreaterThan(-1);
  });

  it('floors amounts, fees, percentages and tax rates at zero', () => {
    const s = sanitizeInputs({
      ...baseInputs, price: -1, rent: -1, notaryPct: -1, registryPct: -1, bankFees: -1, propertyTaxAnnual: -1,
      homeInsuranceAnnual: -1, lifeInsurancePct: -1, maintenancePct: -1, renterInsuranceAnnual: -1,
      depositMonths: -1, investTaxRate: -1, savingsTaxRate: -1, saleAgencyPct: -1, saleTaxShortPct: -1,
      saleTaxLongPct: -1, saleTaxShortHoldYears: -1,
    });
    expect(s).toMatchObject({
      price: 0, rent: 0, notaryPct: 0, registryPct: 0, bankFees: 0, propertyTaxAnnual: 0, homeInsuranceAnnual: 0,
      lifeInsurancePct: 0, maintenancePct: 0, renterInsuranceAnnual: 0, depositMonths: 0, investTaxRate: 0,
      savingsTaxRate: 0, saleAgencyPct: 0, saleTaxShortPct: 0, saleTaxShortHoldYears: 0, saleTaxLongPct: 0,
    });
  });

  it('floors loan rates at zero, so the bank never pays the borrower', () => {
    const s = sanitizeInputs({ ...baseInputs, fixedRate: -0.02, ircc: -0.01, variableMargin: -0.03 });
    expect(s).toMatchObject({ fixedRate: 0, ircc: 0, variableMargin: 0 });
  });

  it('caps tax rates at 100%', () => {
    const s = sanitizeInputs({
      ...baseInputs, investTaxRate: 1.5, savingsTaxRate: 2, saleTaxShortPct: 1.1, saleTaxLongPct: 3,
    });
    expect(s).toMatchObject({ investTaxRate: 1, savingsTaxRate: 1, saleTaxShortPct: 1, saleTaxLongPct: 1 });
  });

  it('caps the horizon and the loan term at the longest periods the interface offers', () => {
    const s = sanitizeInputs({ ...baseInputs, horizonYears: 500, loanTermYears: 200 });
    expect(s.horizonYears).toBe(MAX_HORIZON_YEARS);
    expect(s.loanTermYears).toBe(MAX_LOAN_TERM_YEARS);
  });

  it('rounds periods counted in whole years or months', () => {
    const s = sanitizeInputs({ ...baseInputs, horizonYears: 9.6, loanTermYears: 24.4, fixedYears: 2.5, depositMonths: 1.7 });
    expect(s).toMatchObject({ horizonYears: 10, loanTermYears: 24, fixedYears: 3, depositMonths: 2 });
  });

  it('replaces NaN and infinite numbers before clamping', () => {
    const numericKeys = (Object.keys(baseInputs) as (keyof Inputs)[]).filter((k) => typeof baseInputs[k] === 'number');
    for (const bad of [NaN, Infinity, -Infinity]) {
      const raw = { ...baseInputs } as Record<keyof Inputs, unknown>;
      for (const k of numericKeys) raw[k] = bad;
      const s = sanitizeInputs(raw as Inputs);
      for (const k of numericKeys) expect(Number.isFinite(s[k]), `${k} from ${bad}`).toBe(true);
      expect(s.horizonYears).toBe(MIN_HORIZON_YEARS);
      expect(s.loanTermYears).toBe(MIN_LOAN_TERM_YEARS);
      expect(s.price).toBe(0);
      expect(s.investReturn).toBe(0);
    }
  });
});

describe('simulate with out-of-range inputs', () => {
  it('still charges for and repays a loan given a zero-year term', () => {
    const r = simulate({ ...baseInputs, loanTermYears: 0 });
    expect(r.buyer.principal).toBeCloseTo(baseInputs.price * (1 - baseInputs.downPaymentPct), 4);
    expect(r.buyer.interest).toBeGreaterThan(0);
    expect(r.rows[12].loanBalance).toBe(0);
  });

  it('never produces negative interest from a down payment above 100%', () => {
    const r = simulate({ ...baseInputs, downPaymentPct: 1.2 });
    expect(r.buyer.interest).toBe(0);
    expect(r.rows.every((row) => row.loanBalance === 0)).toBe(true);
  });

  it('stays finite when growth, return or inflation is -100% or worse', () => {
    expect(allFinite({ ...baseInputs, propertyGrowth: -1 })).toBe(true);
    expect(allFinite({ ...baseInputs, investReturn: -1 })).toBe(true);
    expect(allFinite({ ...baseInputs, inflation: -1 })).toBe(true);
    expect(Number.isFinite(last(simulate({ ...baseInputs, propertyGrowth: -2 }).rows).buyerNetWorth)).toBe(true);
  });

  it('stays finite when any single input is NaN or infinite', () => {
    for (const k of Object.keys(baseInputs) as (keyof Inputs)[]) {
      if (typeof baseInputs[k] !== 'number') continue;
      for (const bad of [NaN, Infinity, -Infinity]) expect(allFinite({ ...baseInputs, [k]: bad }), `${k}=${bad}`).toBe(true);
    }
  });

  it('runs no longer than the maximum horizon', () => {
    expect(simulate({ ...baseInputs, horizonYears: 1e6 }).rows).toHaveLength(MAX_HORIZON_YEARS * 12 + 1);
  });

  it('treats a fixed period longer than the loan as fixed for the whole term', () => {
    const longer = simulate({ ...baseInputs, fixedYears: 40, loanTermYears: 30 });
    const whole = simulate({ ...baseInputs, fixedYears: 30, loanTermYears: 30 });
    expect(longer.buyer.interest).toBeCloseTo(whole.buyer.interest, 6);
    expect(longer.rows[360].loanBalance).toBe(0);
  });
});

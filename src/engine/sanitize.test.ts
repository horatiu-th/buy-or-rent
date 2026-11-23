import { sanitizeInputs } from './sanitize';
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
      ...baseInputs, price: -1, rent: -1, notaryPct: -1, registryPct: -1, bankFees: -1, propertyTaxPct: -1,
      homeInsuranceAnnual: -1, lifeInsurancePct: -1, maintenancePct: -1, renterInsuranceAnnual: -1,
      depositMonths: -1, investTaxRate: -1, saleAgencyPct: -1, saleTaxShortPct: -1, saleTaxLongPct: -1,
      saleTaxShortHoldYears: -1,
    });
    expect(s).toMatchObject({
      price: 0, rent: 0, notaryPct: 0, registryPct: 0, bankFees: 0, propertyTaxPct: 0, homeInsuranceAnnual: 0,
      lifeInsurancePct: 0, maintenancePct: 0, renterInsuranceAnnual: 0, depositMonths: 0, investTaxRate: 0,
      saleAgencyPct: 0, saleTaxShortPct: 0, saleTaxShortHoldYears: 0, saleTaxLongPct: 0,
    });
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
});

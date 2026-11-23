import { amortize } from './mortgage';
import { acquisitionCosts, saleCosts } from './costs';
import { sanitizeInputs } from './sanitize';
import type { BuyerTotals, Inputs, MonthRow, RenterTotals, Result } from './types';

interface Portfolio {
  value: number;
  basis: number; // contributions, so only gains are taxed at liquidation
}

const monthlyRate = (annual: number) => Math.pow(1 + annual, 1 / 12) - 1;

function liquidate(p: Portfolio, taxRate: number) {
  const tax = Math.max(0, p.value - p.basis) * taxRate;
  return { net: p.value - tax, tax };
}

function contribute(p: Portfolio, amount: number) {
  p.value += amount;
  p.basis += amount;
}

// A tie counts as the buyer being ahead, so breakEvenMonth and buyerEverAhead use the same test.
const buyerAhead = (r: MonthRow) => r.buyerNetWorth >= r.renterNetWorth;

/**
 * Months over which IRCC moves in a straight line from today's value to the long-run one. IRCC is a
 * trailing average of interbank rates and follows policy-rate changes with a lag of about two quarters,
 * so it takes a few years to settle once inflation returns towards the target.
 */
export const IRCC_CONVERGENCE_MONTHS = 36;

/** The IRCC that applies in a month (1-based), changing once a quarter as the published index does. */
export function irccAt(month: number, i: Pick<Inputs, 'ircc' | 'irccLongRun'>): number {
  const quarterStart = Math.floor((month - 1) / 3) * 3;
  const progress = Math.min(1, quarterStart / IRCC_CONVERGENCE_MONTHS);
  return i.ircc + (i.irccLongRun - i.ircc) * progress;
}

export function breakEven(rows: MonthRow[]): number | null {
  // Counted from the last month the buyer is behind, so an early, temporary lead doesn't count.
  let lastBehind = -1;
  for (const r of rows) if (!buyerAhead(r)) lastBehind = r.month;
  const end = rows[rows.length - 1].month;
  return lastBehind === end ? null : lastBehind + 1;
}

export function simulate(raw: Inputs): Result {
  const i = sanitizeInputs(raw);
  const months = Math.round(i.horizonYears * 12);
  const loanAmount = i.price * (1 - i.downPaymentPct);
  const downPayment = i.price - loanAmount;
  const acq = acquisitionCosts(i);
  const upfront = downPayment + acq;
  const deposit = i.rent * i.depositMonths;
  const rentAgencyFee = i.rent * i.rentAgencyPct;

  const schedule = amortize({
    principal: loanAmount,
    termMonths: Math.round(i.loanTermYears * 12),
    fixedRate: i.fixedRate,
    fixedMonths: Math.round(i.fixedYears * 12),
    variableRate: (m) => irccAt(m, i) + i.variableMargin,
  });

  // Both households start with the same cash; whoever spends less upfront invests the difference.
  const startGap = upfront - deposit - rentAgencyFee;
  const buyerPf: Portfolio = { value: 0, basis: 0 };
  const renterPf: Portfolio = { value: 0, basis: 0 };
  // The same renter's savings held in a bank deposit instead: identical contributions, deposit interest.
  const renterSavings: Portfolio = { value: 0, basis: 0 };
  contribute(startGap > 0 ? renterPf : buyerPf, Math.abs(startGap));
  if (startGap > 0) contribute(renterSavings, startGap);

  const buyer: BuyerTotals = {
    downPayment, acquisitionCosts: acq, interest: 0, principal: 0, propertyTax: 0,
    insurance: 0, maintenance: 0, saleCosts: 0, investmentTax: 0, cashOut: upfront + buyerPf.basis,
  };
  const renter: RenterTotals = {
    agencyFee: rentAgencyFee, rent: 0, insurance: 0, investmentTax: 0,
    cashOut: deposit + rentAgencyFee + renterPf.basis,
  };

  const gProp = monthlyRate(i.propertyGrowth);
  const gInv = monthlyRate(i.investReturn);
  // Banks withhold deposit tax when interest is paid, so savings compound at the after-tax rate.
  const gSav = monthlyRate(i.savingsRate * (1 - i.savingsTaxRate));
  const gInf = monthlyRate(i.inflation);
  let value = i.price;
  let balance = loanAmount;

  const snapshot = (month: number, buyerCost: number, renterCost: number): MonthRow => ({
    month,
    propertyValue: value,
    loanBalance: balance,
    buyerMonthlyCost: buyerCost,
    renterMonthlyCost: renterCost,
    buyerNetWorth: value - balance - saleCosts(value, month, i) + liquidate(buyerPf, i.investTaxRate).net,
    renterNetWorth: liquidate(renterPf, i.investTaxRate).net + deposit,
    renterCashNetWorth: renterSavings.value + deposit,
    deflator: Math.pow(1 + gInf, month),
  });

  const rows: MonthRow[] = [snapshot(0, 0, 0)];

  for (let m = 1; m <= months; m++) {
    const loanMonth = schedule[m - 1];
    const balanceBefore = balance;
    value *= 1 + gProp;

    let payment = 0;
    if (loanMonth) {
      payment = loanMonth.payment;
      buyer.interest += loanMonth.interest;
      buyer.principal += loanMonth.principal;
      balance = loanMonth.balance;
    }
    const propertyTax = (value * i.propertyTaxPct) / 12;
    const insurance = i.homeInsuranceAnnual / 12 + (value * i.homeInsurancePct) / 12 + (balanceBefore * i.lifeInsurancePct) / 12;
    const maintenance = (value * i.maintenancePct) / 12;
    const buyerCost = payment + propertyTax + insurance + maintenance;
    buyer.propertyTax += propertyTax;
    buyer.insurance += insurance;
    buyer.maintenance += maintenance;

    const rent = i.rent * Math.pow(1 + i.rentGrowth, Math.floor((m - 1) / 12));
    const renterInsurance = i.renterInsuranceAnnual / 12;
    const renterCost = rent + renterInsurance;
    renter.rent += rent;
    renter.insurance += renterInsurance;

    buyerPf.value *= 1 + gInv;
    renterPf.value *= 1 + gInv;
    renterSavings.value *= 1 + gSav;
    const diff = buyerCost - renterCost;
    contribute(diff > 0 ? renterPf : buyerPf, Math.abs(diff));
    if (diff > 0) contribute(renterSavings, diff);
    buyer.cashOut += buyerCost + Math.max(0, -diff);
    renter.cashOut += renterCost + Math.max(0, diff);

    rows.push(snapshot(m, buyerCost, renterCost));
  }

  buyer.saleCosts = saleCosts(value, months, i);
  buyer.investmentTax = liquidate(buyerPf, i.investTaxRate).tax;
  renter.investmentTax = liquidate(renterPf, i.investTaxRate).tax;

  return { rows, buyer, renter, breakEvenMonth: breakEven(rows), buyerEverAhead: rows.some(buyerAhead) };
}

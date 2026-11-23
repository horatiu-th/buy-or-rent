import type { Inputs } from './types';

export function acquisitionCosts(i: Inputs): number {
  return i.price * (i.notaryPct + i.registryPct + i.buyerAgencyPct) + i.bankFees;
}

export function saleCosts(value: number, monthsHeld: number, i: Inputs): number {
  if (!i.includeSaleCosts) return 0;
  const taxPct = monthsHeld <= i.saleTaxShortHoldYears * 12 ? i.saleTaxShortPct : i.saleTaxLongPct;
  return value * (i.saleAgencyPct + taxPct);
}

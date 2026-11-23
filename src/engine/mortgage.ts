export function annuityPayment(principal: number, annualRate: number, months: number): number {
  if (principal <= 0 || months <= 0) return 0;
  const r = annualRate / 12;
  if (r === 0) return principal / months;
  return (principal * r) / (1 - Math.pow(1 + r, -months));
}

export interface LoanParams {
  principal: number;
  termMonths: number;
  fixedRate: number;
  fixedMonths: number;
  /** A constant rate, or the rate for each month (1-based) of the variable period. */
  variableRate: number | ((month: number) => number);
}

export interface LoanMonth {
  payment: number;
  interest: number;
  principal: number;
  balance: number; // after this month's payment
}

export function amortize(p: LoanParams): LoanMonth[] {
  const schedule: LoanMonth[] = [];
  const variableAt = typeof p.variableRate === 'number' ? () => p.variableRate as number : p.variableRate;
  let balance = p.principal;
  let rate = NaN;
  let payment = 0;

  for (let m = 1; m <= p.termMonths; m++) {
    const next = m <= p.fixedMonths ? p.fixedRate : variableAt(m);
    // Banks recompute the annuity on the remaining balance and term whenever the applied rate changes.
    if (next !== rate) {
      rate = next;
      payment = annuityPayment(balance, rate, p.termMonths - m + 1);
    }
    const interest = (balance * rate) / 12;
    // The last payment absorbs floating-point drift so the loan closes at exactly zero.
    const principal = m === p.termMonths ? balance : payment - interest;
    balance = m === p.termMonths ? 0 : balance - principal;
    schedule.push({ payment: interest + principal, interest, principal, balance });
  }
  return schedule;
}

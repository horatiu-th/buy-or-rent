export interface Inputs {
  // Property and purchase
  price: number; // lei, VAT included
  downPaymentPct: number;
  notaryPct: number; // of price
  registryPct: number; // ANCPI registration, of price
  bankFees: number; // lei, valuation + loan fees
  buyerAgencyPct: number; // buyer-side agency commission, of price, VAT included

  // Loan
  loanTermYears: number;
  fixedRate: number; // annual, during the fixed period
  fixedYears: number; // 0 = variable from the start
  ircc: number; // annual, the index that applies today
  irccLongRun: number; // annual, the level IRCC moves to over IRCC_CONVERGENCE_MONTHS
  variableMargin: number; // bank margin over IRCC

  // Ownership
  propertyTaxAnnual: number; // lei/year today; it depends on floor area, not value, and is indexed with inflation
  homeInsuranceAnnual: number; // lei/year, mandatory PAD policy
  homeInsurancePct: number; // annual, of property value: the optional policy banks require
  lifeInsurancePct: number; // annual, of outstanding loan balance
  maintenancePct: number; // annual, of property value
  propertyGrowth: number; // annual

  // Renting
  rent: number; // lei/month at start
  rentGrowth: number; // annual, applied once per year
  renterInsuranceAnnual: number; // lei/year
  depositMonths: number;
  rentAgencyPct: number; // agency fee for renting, as a share of one month's starting rent, not refunded

  // Investing
  investReturn: number; // annual, gross
  investTaxRate: number; // on gains, applied at liquidation
  savingsRate: number; // annual bank deposit interest for the renter who doesn't invest
  savingsTaxRate: number; // on deposit interest, which Romania taxes separately from investment gains

  // Sale at horizon
  includeSaleCosts: boolean;
  saleAgencyPct: number;
  saleTaxShortPct: number; // of sale value, when held <= saleTaxShortHoldYears
  saleTaxLongPct: number;
  saleTaxShortHoldYears: number;

  // Analysis
  horizonYears: number;
  inflation: number; // annual, used only for real-value display
}

export interface MonthRow {
  month: number;
  propertyValue: number;
  loanBalance: number;
  buyerMonthlyCost: number;
  renterMonthlyCost: number;
  buyerNetWorth: number;
  renterNetWorth: number;
  /** The same renter if every lei saved sat in a bank deposit instead of being invested. */
  renterCashNetWorth: number;
  /** Divide a nominal value by this to get today's lei. */
  deflator: number;
}

export interface BuyerTotals {
  downPayment: number;
  acquisitionCosts: number;
  interest: number;
  principal: number;
  propertyTax: number;
  insurance: number;
  maintenance: number;
  saleCosts: number;
  saleAgencyFee: number;
  saleTax: number;
  investmentTax: number;
  cashOut: number;
}

export interface RenterTotals {
  agencyFee: number;
  rent: number;
  insurance: number;
  investmentTax: number;
  cashOut: number;
}

export interface Result {
  rows: MonthRow[];
  buyer: BuyerTotals;
  renter: RenterTotals;
  /**
   * First month from which the buyer stays ahead through the horizon: 0 if ahead from the start,
   * null if behind at the horizon. A tie counts as ahead.
   */
  breakEvenMonth: number | null;
  /** Whether the buyer is ahead (or level) in any month, including month 0, even if the lead is later lost. */
  buyerEverAhead: boolean;
}

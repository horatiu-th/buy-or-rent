export interface Inputs {
  // Property and purchase
  price: number; // lei, VAT included
  downPaymentPct: number;
  notaryPct: number; // of price
  registryPct: number; // ANCPI registration, of price
  bankFees: number; // lei, valuation + loan fees

  // Loan
  loanTermYears: number;
  fixedRate: number; // annual, during the fixed period
  fixedYears: number; // 0 = variable from the start
  ircc: number; // annual, assumed for the whole variable period
  variableMargin: number; // bank margin over IRCC

  // Ownership
  propertyTaxPct: number; // annual, of property value
  homeInsuranceAnnual: number; // lei/year, PAD + optional home policy
  lifeInsurancePct: number; // annual, of outstanding loan balance
  maintenancePct: number; // annual, of property value
  propertyGrowth: number; // annual

  // Renting
  rent: number; // lei/month at start
  rentGrowth: number; // annual, applied once per year
  renterInsuranceAnnual: number; // lei/year
  depositMonths: number;

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
  investmentTax: number;
  cashOut: number;
}

export interface RenterTotals {
  rent: number;
  insurance: number;
  investmentTax: number;
  cashOut: number;
}

export interface Result {
  rows: MonthRow[];
  buyer: BuyerTotals;
  renter: RenterTotals;
  /** First month from which the buyer stays ahead through the horizon; null if never. */
  breakEvenMonth: number | null;
}

export interface Inputs {
  // Property and purchase
  price: number; // lei, VAT included
  downPaymentPct: number;
  notaryPct: number; // of price
  registryPct: number; // ANCPI registration, of price
  bankFees: number; // lei, valuation + loan fees
  buyerAgencyPct: number; // buyer-side agency commission, of price, VAT included
  fitOutCost: number; // lei, one-off at purchase: furnishing or works the rented comparable already has

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
  maintenancePct: number; // annual, of property value, including periodic renovation
  propertyGrowth: number; // annual

  // Renting
  rent: number; // lei/month at start
  rentGrowth: number; // annual, applied once per year
  renterInsuranceAnnual: number; // lei/year
  depositMonths: number;
  rentAgencyPct: number; // agency fee for renting, as a share of one month's rent, paid at the start and on every move
  moveEveryYears: number; // 0 = never; otherwise the renter moves at the start of every this-many-th year
  moveCost: number; // lei per move today (transport, cleaning), indexed with inflation

  // Investing
  investReturn: number; // annual, gross
  investTaxRate: number; // on gains, applied at liquidation

  // Sale at horizon
  includeSaleCosts: boolean;
  saleAgencyPct: number;
  saleTaxShortPct: number; // of sale value, when held <= saleTaxShortHoldYears
  saleTaxLongPct: number;
  saleTaxShortHoldYears: number;

  // Analysis
  horizonYears: number;
  inflation: number; // annual; indexes lei amounts set today and converts results to today's money
}

export interface MonthRow {
  month: number;
  propertyValue: number;
  loanBalance: number;
  buyerMonthlyCost: number;
  /** Cash the renter spends on housing that month; in a move month this includes the move and the deposit top-up. */
  renterMonthlyCost: number;
  buyerNetWorth: number;
  renterNetWorth: number;
  /** Divide a nominal value by this to get today's lei. */
  deflator: number;
}

export interface BuyerTotals {
  downPayment: number;
  acquisitionCosts: number;
  fitOut: number;
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
  /** Every rental agency fee: the first one and one per move. */
  agencyFee: number;
  moving: number;
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

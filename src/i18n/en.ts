import type { Inputs } from '../engine';
import type { Messages } from '.';
import type { Money } from '../ui/money';

type FieldText = { label: string; help: string };

type DurationUnit = 'year' | 'month';
const UNIT_WORDS: Record<DurationUnit, Record<'one' | 'other', string>> = {
  year: { one: 'year', other: 'years' },
  month: { one: 'month', other: 'months' },
};

const plural = new Intl.PluralRules('en');

/** The word that follows n: "1 year", "2 years". */
function unitWord(n: number, unit: DurationUnit): string {
  return UNIT_WORDS[unit][plural.select(n) === 'one' ? 'one' : 'other'];
}

const count = (n: number, unit: DurationUnit) => `${n} ${unitWord(n, unit)}`;

/** "2 years and 3 months", rounded to whole months. */
function duration(months: number): string {
  const total = Math.round(months);
  // Defensive: callers pass positive durations, but an empty string would leave a sentence dangling.
  if (!(total > 0)) return count(0, 'month');
  const y = Math.floor(total / 12);
  const m = total % 12;
  return [y && count(y, 'year'), m && count(m, 'month')].filter(Boolean).join(' and ');
}

/** "4 March 2026": spelled out, so day and month can't be read the wrong way round. */
const longDate = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

export const en = {
  /** BCP 47 tag for number formatting: decimal point, comma for thousands. */
  numberLocale: 'en-GB',
  unitWord,
  count,
  duration,
  /** Short scale words for chart axes: "900k", "1.5m". */
  axisUnits: { thousand: 'k', million: 'm' },
  title: 'Buy or rent?',
  subtitle: 'What owning a home in Romania is worth over the years, compared with renting.',
  city: 'City',
  sqm: 'Usable area (m², no balcony)',
  resetAll: 'Reset all',
  language: { label: 'Language', name: 'English' },
  themes: {
    label: 'Theme',
    system: 'Match system',
    light: 'Light',
    dark: 'Dark',
    sand: 'Sand',
    midnight: 'Midnight',
    graphite: 'Graphite',
    contrast: 'High contrast',
  },
  reset: 'Back to the default value',
  help: 'Help',
  presets: { label: 'Interest type', fixed5: 'Fixed 5 years', variable: 'Variable' },
  currency: 'Currency',
  scale: {
    label: 'Adjust the rent',
    rentWins: 'Renting wins',
    buyWins: 'Buying wins',
    yourRent: 'Your rent',
    threshold: 'Threshold',
  },
  atHorizon: (after: string, real: boolean, money: Money) => {
    const basis = money.isBase ? "in today's lei" : `in today's lei, converted to ${money.symbol}`;
    return `Net worth after ${after}, ${real ? basis : 'in nominal terms'}`;
  },
  tabsLabel: 'Charts',
  footer: {
    rate: (rate: string, date: string) => `NBR exchange rate: ${rate} lei/€, as of ${longDate.format(new Date(date))}.`,
    sources: 'Sources and assumptions behind the defaults',
    newTab: '(opens in a new tab)',
  },
  resultsLabel: 'Results',
  breakEvenMark: 'Buying pulls ahead',
  // Values are divided by Romanian inflation; euro amounts are then converted at today's fixed rate,
  // so "today's euro" would wrongly suggest euro-area inflation.
  realValues: (money: Money) =>
    money.isBase
      ? 'Adjusted for Romanian inflation'
      : `Adjusted for Romanian inflation, ${money.symbol} at today's rate`,
  nominalNote: 'Nominal values: amounts here are not adjusted for inflation.',
  realHint: 'A value that grows in line with inflation shows as a flat line.',
  howWeCompare: {
    title: 'How we compare',
    paragraphs: [
      'Two households start with the same money and spend the same amount each month: one buys with a mortgage, the other rents. Whoever has lower housing costs invests the difference. The same goes for the start: whoever spends less up front invests the rest, usually the renter, who pays no down payment or purchase costs.',
      'Net worth is what each would have if they sold everything that month: the home minus the loan and selling costs, plus investments after tax. That is why the buyer usually starts behind: the purchase taxes are already paid.',
      'The verdict compares the two investing households at the chosen horizon. The dotted lines in the chart show the same households keeping their savings in a bank deposit instead, and do not change the verdict.',
    ],
  },
  keyAssumptions: {
    lead: (property: string, matchesInflation: boolean, invest: string) =>
      `The verdict rests mostly on two assumptions: home prices rise ${property} a year${matchesInflation ? ', in line with inflation' : ''}, and investments return ${invest} a year. See how much they change the result in the `,
    link: 'Sensitivity',
    tail: ' tab.',
  },
  source: 'source',
  stale: 'outdated data',
  toCheck: 'needs checking',
  assumptions: 'The defaults are assumptions, not forecasts. Check them against your own situation.',
  buyer: 'Buyer',
  renter: 'Renter',
  buyerInvesting: 'Investing buyer',
  renterInvesting: 'Investing renter',
  buyerNoInvest: 'Non-investing buyer',
  renterNoInvest: 'Non-investing renter',
  investing: 'invests',
  notInvesting: "doesn't invest",
  chartStart: 'At the start',
  afterTime: (d: string) => `After ${d}`,
  monthN: (n: number) => `Month ${n}`,
  charts: {
    netWorth: 'Chart: net worth over time',
    monthly: 'Chart: monthly costs over time',
    breakdown: 'Chart: where the money goes',
    legend: 'Series shown in the chart',
    netWorthSummary: (span: string, buyer: string, renter: string, buyerNoInvest: string, renterNoInvest: string) =>
      `Net worth month by month, over ${span}. At the end: investing buyer ${buyer}, investing renter ${renter}, non-investing buyer ${buyerNoInvest}, non-investing renter ${renterNoInvest}.`,
    breakEvenSummary: (after: string) => `Buying pulls ahead after ${after} and stays ahead until the end of the chosen horizon.`,
    monthlySummary: (firstBuyer: string, firstRenter: string, lastBuyer: string, lastRenter: string) =>
      `Monthly cost in the first month: buyer ${firstBuyer}, renter ${firstRenter}. In the last month: buyer ${lastBuyer}, renter ${lastRenter}.`,
    noInvestNote: 'Dotted lines: the same households, saving the same money, but keeping it in a bank deposit instead of investing it. The gap to the solid line of the same colour is what investing adds over the deposit.',
    lastSeries: 'At least one series stays visible.',
    breakdownSummary: (items: string) => `Totals over the whole horizon, in nominal terms. ${items}.`,
  },
  headlineValue: (after: string, rent: string) =>
    `After ${after}, the buyer ends up with a higher net worth than the investing renter if the monthly rent is above ${rent}.`,
  headlineAlwaysBuy: (after: string) =>
    `After ${after}, the buyer has at least the same net worth as the investing renter, even at zero rent.`,
  headlineAlwaysRent: (after: string) =>
    `After ${after}, the investing renter has at least the same net worth as the owner at any rent we tested.`,
  verdictBuy: (after: string) =>
    `With your numbers, buying pulls ahead after ${after} and stays ahead until the end.`,
  verdictBuyFromStart: 'With your numbers, buying is ahead from the start and stays ahead until the end.',
  verdictRent: 'With your numbers, renting stays the better deal over the whole horizon.',
  verdictRentAtEnd: 'With your numbers, renting is the better deal at the end, though buying was ahead for a while.',
  headlineInvalid: "Check the values you entered: the calculation can't run with them.",
  headlineNoThreshold: (after: string) =>
    `After ${after}, the buyer wins at a low rent but loses at a high one: with these values there is no rent above which buying wins.`,
  saleTaxNote: (after: string) =>
    `The buyer's net worth assumes a sale that month. The tax on selling drops after ${after}, which can move the point at which buying comes out ahead.`,
  tabs: {
    netWorth: 'Net worth',
    monthly: 'Monthly costs',
    breakdown: 'Where the money goes',
    sensitivity: 'Sensitivity',
  },
  breakdown: {
    rent: {
      label: 'Rent',
      help: 'The sum of the monthly rents over the chosen period. At the start of each simulated year, the rent changes by the growth rate you entered.',
    },
    interest: {
      label: 'Interest',
      help: 'The part of each mortgage payment that covers interest on the loan balance. The total adds up the interest paid over the period.',
    },
    maintenance: {
      label: 'Maintenance',
      help: "The budget for upkeep and repairs. It is worked out monthly, as one twelfth of the yearly percentage applied to the home's estimated value that month.",
    },
    saleAgencyFee: {
      label: 'Agency fee on sale',
      help: "The agency's fee, as a percentage of the home's estimated value at the end. Applies only if you include selling costs.",
    },
    acquisitionCosts: {
      label: 'Upfront costs',
      help: "The buyer pays the notary, land registration, the agency fee and any fit-out you entered. With a mortgage, bank fees and mortgage registration costs are added. For the renter, it adds up the agency fees for renting and the cost of moving, if they move.",
    },
    insurance: {
      label: 'Insurance',
      help: "For the buyer, it adds up the premiums for the mandatory PAD policy, optional home insurance and life insurance. For the renter, the premiums for renter's insurance.",
    },
    taxes: {
      label: 'Taxes',
      help: 'The buyer pays the yearly property tax, indexed to inflation. Both sides pay tax on investment gains at the end. If you include selling costs, the buyer also pays tax on the sale of the home, at a rate that depends on how long it was held.',
    },
  },
  sensitivityHelp:
    'The difference in final net worth between the buyer and the investing renter if home price growth or investment returns differ by ±2 percentage points. Your values are in the centre.',
  sensitivityBuyWins: 'buying wins',
  sensitivityRentWins: 'renting wins',
  sensitivityBase: 'your values',
  sensitivityTie: 'a tie',
  sensitivityRows: 'Home price growth',
  sensitivityCols: 'Investment return',
  swingsHelp:
    'The difference in final net worth between the buyer and the investing renter when one other assumption is lower or higher and the rest stay at your values.',
  swingsAssumption: 'Assumption',
  swingsDown: 'Lower',
  swingsBase: 'Your values',
  swingsUp: 'Higher',
  swingLabels: {
    rent: 'Monthly rent (±10%)',
    rentGrowth: 'Rent growth (±1 pp)',
    irccLongRun: 'Long-run IRCC (±1 pp)',
    maintenancePct: 'Maintenance and repairs (±25%)',
  },
  horizons: {
    title: 'Over other horizons',
    help: "The same calculation if you sell or stop renting sooner. The length of the mortgage doesn't say how long you'll live there.",
    after: 'After',
    threshold: 'Rent threshold',
    gap: (real: boolean) => `Who comes out ahead, and by how much (${real ? "today's lei" : 'nominal terms'})`,
    yours: 'your horizon',
    alwaysBuy: 'buying wins at any rent',
    alwaysRent: 'renting wins at any rent',
    none: '—',
  },
  groups: {
    buying: 'Buying',
    renting: 'Renting',
  },
  topics: {
    home: 'The home',
    loan: 'The mortgage',
    purchaseCosts: 'Purchase costs',
    ownershipCosts: 'Ownership costs',
    sale: 'Selling at the end',
  },
  buyingMore: 'Purchase, ownership and selling costs',
  editedCount: (n: number) => (n === 1 ? '1 value changed' : `${n} values changed`),
  fields: {
    price: { label: 'Home price', help: "The full price paid, including VAT on new builds. The default is the median asking price in the city across all flats, old and new, minus the usual negotiating margin. Some developers list prices without VAT (21%): check the offer." },
    rent: { label: 'Monthly rent', help: 'The rent for a comparable home. The default starts from asking rents in listings and from asking prices in the same listings, so both describe the same market; the agreed rent can be a few percent lower.' },
    downPaymentPct: { label: 'Down payment', help: 'The share of the price paid from savings.' },
    fixedRate: { label: 'Fixed rate', help: 'The yearly interest rate during the fixed-rate period.' },
    fixedYears: { label: 'Fixed-rate period', help: '0 = variable rate from the start.' },
    ircc: { label: 'Current IRCC', help: 'The reference rate for consumer loans published by the National Bank of Romania (NBR), valid for the current quarter.' },
    irccLongRun: { label: 'Long-run IRCC', help: 'An assumption, not a forecast: the level we assume IRCC reaches in 3 years. Default: inflation plus 1 percentage point, so it moves with inflation. No published forecast goes beyond 2028; a plausible range is 3.5–5.5%. The variable rate follows this path after the fixed period.' },
    variableMargin: { label: "Bank's margin", help: 'Added to IRCC after the fixed period. With your salary paid into the bank, usually 2.2–2.5%; without, around 3.5%.' },
    loanTermYears: { label: 'Mortgage term', help: 'The number of years over which you repay the mortgage.' },
    horizonYears: { label: 'Time horizon', help: 'How many years from now to compare the two options.' },
    notaryPct: { label: 'Notary fee', help: 'An approximate percentage of the price.' },
    registryPct: { label: 'Land registration (ANCPI)', help: 'The fee for recording the purchase in the land register.' },
    bankFees: { label: 'Bank fees', help: "File review, valuation, the fixed mortgage registration fee and the RNPM fee, paid only with a mortgage. ANCPI's fee of 0.1% of the loan and the notary's fee for the mortgage contract are added automatically." },
    buyerAgencyPct: { label: 'Agency fee on purchase', help: 'A percentage of the price, including VAT. Usually 2% + VAT when buying through an agency; 0 when buying directly from a developer or owner.' },
    fitOutCost: { label: 'Fit-out on purchase', help: 'Paid once, at purchase: furniture, appliances or work that the comparable rented home already has. 0 by default, as there is no data on how many rentals come furnished. Furnishing a 2-room flat to a mid-range standard costs around 35,000–55,000 lei, without appliances (2026).' },
    propertyTaxAnnual: { label: 'Property tax', help: "Per year, today. It depends on the floor area and the area of the city, not on the home's price, and is indexed to inflation every year. The default is for a mid-range area; check your city hall's website." },
    homeInsuranceAnnual: { label: 'PAD insurance', help: 'The mandatory home insurance, per year.' },
    homeInsurancePct: { label: 'Optional home insurance', help: "The policy the bank requires with a mortgage, as a yearly percentage of the home's value." },
    lifeInsurancePct: { label: 'Life insurance', help: 'A yearly percentage of the loan balance, if the bank requires it.' },
    maintenancePct: { label: 'Maintenance and repairs', help: "A yearly percentage of the home's value, including a full renovation of the flat about every 20 years. 1% by default, the usual rule of thumb; a standard renovation every 20 years costs about 1% a year of the national average price (2026)." },
    propertyGrowth: { label: 'Home price growth', help: 'Assumed yearly growth, nominal. Defaults to inflation: in 2015–2025 home prices rose roughly in line with inflation, and in real terms they are still more than a third below their 2009 level.' },
    rentGrowth: { label: 'Rent growth', help: 'Assumed yearly growth, nominal. Defaults to inflation, which is how rents rose in 2015–2025.' },
    inflation: { label: 'Inflation', help: "Romania's long-run yearly inflation. Home price and rent growth, investment returns, the deposit rate and long-run IRCC start from it by default and move with it, unless you changed them. It indexes the property tax and moving costs, and is used to show amounts in today's lei: future sums are brought back to today's purchasing power, and in € they are then converted at today's rate." },
    investReturn: { label: 'Investment return', help: 'The yearly nominal return, in lei, on money not put into the home, after fund costs and before tax. Default: a global equity ETF, at 3.5% above inflation. For a more cautious portfolio, use a lower value.' },
    investTaxRate: { label: 'Tax on gains', help: 'Applied to investment gains at the end. In 2026: 3% through a Romanian broker for holdings of over a year, 16% through a foreign broker. CASS, the health contribution due above certain income thresholds, is not included.' },
    savingsRate: { label: 'Bank deposit rate', help: 'The gross yearly interest on a term deposit in lei. Used for the households that don\'t invest: the money they save, up front and monthly, sits in a deposit instead of being invested. Defaults to inflation: over the long run, deposit rates have hovered around inflation or below it. In September 2026, the average rate on new household deposits was 5.07% (NBR).' },
    savingsTaxRate: { label: 'Tax on interest', help: 'Withheld by the bank when interest is paid. In 2026: 10%.' },
    renterInsuranceAnnual: { label: "Renter's insurance", help: 'Per year.' },
    depositMonths: { label: 'Rental deposit', help: 'The number of monthly rents paid as a deposit, returned at the end.' },
    rentAgencyPct: { label: 'Agency fee on renting', help: 'A percentage of one monthly rent, paid at the start and at every move. Often 50%; 0 when renting directly from the owner.' },
    moveEveryYears: { label: 'Move every', help: "0 = the renter doesn't move. Otherwise, they move at the start of every period of that many years: they pay the agency fee and moving cost again, and the deposit is reset to the rent at that time. 0 by default: there is no data on how long renters stay in a home." },
    moveCost: { label: 'Moving cost', help: 'Transport, cleaning and the like, per move, today; indexed to inflation. The agency fee and deposit are added separately.' },
    includeSaleCosts: { label: 'Include selling costs', help: 'Compares liquid wealth, as if you sold at the end.' },
    saleAgencyPct: { label: 'Agency fee', help: 'A percentage of the sale price.' },
    saleTaxShortPct: { label: 'Tax on sale (short hold)', help: 'A percentage of the sale price.' },
    saleTaxLongPct: { label: 'Tax on sale (long hold)', help: 'A percentage of the sale price.' },
    saleTaxShortHoldYears: { label: 'Short-hold threshold', help: 'The number of years up to which the higher tax applies.' },
  } satisfies Record<keyof Inputs, FieldText>,
} satisfies Messages;

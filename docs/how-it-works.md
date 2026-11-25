# How the calculation works

The engine lives in `src/engine/`. It is plain TypeScript: it takes an `Inputs` object and returns a month-by-month timeline. Nothing in it depends on the UI.

## The idea

Comparing a mortgage payment with a rent is misleading: the buyer builds equity, pays one-off fees and owns an asset that changes in value, while the renter keeps cash that can earn a return. So instead of comparing monthly costs, the calculator compares **net worth**.

The buyer and the investing renter start with the same cash and invest any difference in housing costs.

## The timeline

`simulate(inputs)` runs one step per month from month 0 to the horizon (default 30 years).

### Month 0

| | Buyer | Investing renter |
|---|---|---|
| Pays | Down payment + acquisition costs (notary, land registry, buyer agency fee and, with a loan, bank fees and the loan-based mortgage fees from `mortgageSetupCosts()`) + any fit-out (`fitOutCost`) | Rental deposit + rental agency fee |
| Keeps | Nothing, if their upfront costs are higher | The difference, invested |

If the renter's upfront costs are larger than the buyer's (rare), the buyer keeps and invests the difference instead. The deposit comes back at the end; the agency fee doesn't.

The mortgage fees are ANCPI's 0.1% of the loan and the notary's minimum fee for the mortgage contract, plus 21% VAT. That fee follows the progressive scale for guarantee contracts in Order 177/C/2024 (annex 2, point V), charged on the loan: 0.85% up to 50,000 lei (at least 150 lei), then 425 lei + 0.5%, 750 lei + 0.46% above 100,000, 1,209 lei + 0.19% above 200,000 and 1,778 lei + 0.1% above 500,000 (`mortgageNotaryFee()`). The flat 750 / 1,500 lei amounts in the same order apply to state-programme loans and to later contracts securing the same debt, not to an ordinary first mortgage.

The fit-out is furniture, appliances or works that the rented comparable already has. It is paid once and has no resale value; its default is 0 (see `data/SOURCES.md`).

### Every month after

**Buyer's cost**
- Loan payment from the amortization schedule (see below).
- Property tax: `propertyTaxAnnual / 12`, raised once a year by `inflation`. Local taxes are set per m² and indexed with inflation, so they don't follow the market value.
- Insurance: the mandatory PAD policy per year / 12, the optional home policy banks require (`property value × homeInsurancePct / 12`), and life insurance on the loan balance.
- Maintenance: `property value × maintenancePct / 12`. The default, 1% a year, covers repairs and a full renovation about every 20 years.

**Renter's cost**
- Rent, raised once a year by `rentGrowth`.
- Renter's insurance per year / 12.
- If `moveEveryYears` is set, a move at the start of every such period after the first: a new agency fee on the rent at the time, `moveCost` (indexed with inflation), and the deposit reset to `depositMonths` × the current rent. The old deposit comes back, so only the difference is spent that month; it is all returned at the end.

**Who invests the difference**
- If the buyer's cost is higher, the investing renter invests the difference.
- If the rent is higher, the buyer invests the difference.

**Growth**
- The property grows by `propertyGrowth` (converted to a monthly rate).
- Investments grow by `investReturn`.

By default these follow inflation: `propertyGrowth`, `rentGrowth` and `investReturn` are `(1 + inflation) × (1 + real part) − 1`, and `irccLongRun` is inflation plus a spread, with the real parts in the data (`inflationLinked()` in `src/data/defaults.ts`). Changing inflation moves all four, unless they were edited. The engine itself takes them as plain nominal rates.

**Rate conventions**
- Loan rates are **nominal**: the monthly rate is `annual / 12`, which is how Romanian banks quote mortgage rates.
- Property growth, investment return and inflation are **effective** annual rates: the monthly rate is `(1 + annual)^(1/12) − 1`, so twelve months compound to exactly the annual figure.
- Rent is the exception: it stays flat for a year, then rises by the full `rentGrowth`.

### The loan

`amortize()` in `src/engine/mortgage.ts` builds a standard annuity schedule:

- Rates are nominal: each month's interest is `balance × rate / 12`.
- During the fixed period, the rate is `fixedRate`.
- After it, the rate is `IRCC + variableMargin`. IRCC moves in a straight line, once a quarter, from today's `ircc` to `irccLongRun` over `IRCC_CONVERGENCE_MONTHS` (36), then stays there. With a 5-year fixed period the borrower only ever sees the long-run level.
- Whenever the applied rate changes, the payment is recalculated on the remaining balance and term, as Romanian banks do for variable-rate loans.
- If `fixedYears` is 0, the loan is variable from the start; if it is as long as the term or longer, the loan stays fixed throughout.
- The last payment absorbs rounding so the balance ends at exactly zero.

## Net worth

Net worth is what each household would have **if it liquidated everything that month**.

| Household | Net worth |
|---|---|
| Buyer | property value − loan balance − sale costs + investments after tax on gains |
| Renter who invests | investments after tax on gains + rental deposit |
| Buyer who doesn't invest | property value − loan balance − sale costs + bank deposit |
| Renter who doesn't invest | bank deposit + rental deposit |

The bank deposit earns `savingsRate` (by default equal to inflation), after the interest tax `savingsTaxRate`; a negative rate is a loss and gets no tax back.

The households that don't invest have exactly the same cash flows as the ones that do: the same starting cash and monthly surplus go into a bank deposit instead of a portfolio. So all four spend the same, the two dotted lines compare buying and renting for a saver who only uses a bank deposit, and the gap between a solid line and the dotted line of the same colour is what investing earns over the deposit.

The households that don't invest only appear on the net-worth chart. The verdict, the break-even rent and the other tables compare the two that invest.


**Sale costs** are the agency fee plus the property transfer tax, both as a share of the sale value. The tax rate is higher if the home has been owned for up to `saleTaxShortHoldYears` inclusive (3% up to and including 3 years, 1% after, under current Romanian rules), so month 36 still uses the higher rate and month 37 the lower one. Because net worth assumes a sale each month, the buyer's line jumps up when the lower rate kicks in. The interface explains this when it affects the result.

**Investment tax** is applied once, on the gain, when the portfolio is liquidated.

## Outputs

| Output | Meaning | Where |
|---|---|---|
| `rows` | One row per month: property value, loan balance, monthly costs, both net worths, and a deflator | `simulate()` |
| `breakEvenMonth` | The first month from which the buyer **stays ahead** of the investing renter until the horizon. `0` if the buyer is ahead from month 0 onward; `null` if the buyer is behind at the horizon. A temporary early lead doesn't count. A tie counts as ahead. | `simulate()` |
| `buyerEverAhead` | Whether the buyer is ahead (or level) in any month, month 0 included, even if the lead is later lost. Lets the interface tell "never ahead" apart from "ahead for a while" when `breakEvenMonth` is `null`. | `simulate()` |
| Equivalent rent | The starting rent at which the buyer and the investing renter end the horizon level. Found by bisection. The search starts with an upper bound of 2% of the price per month (at least 1,000 lei) and doubles it, up to 10 times, until the buyer comes out ahead. | `equivalentRent()` in `solve.ts` |
| `alwaysBuy` / `alwaysRent` / `noThreshold` / `invalid` | Returned instead of a rent when buying wins at zero rent and at the largest bound, when it still loses at the largest bound tried, when it wins at zero rent but loses at the largest bound (a higher rent helps the renter), or when the simulation overflows to a non-finite result | `equivalentRent()` |
| Other horizons | The final gap and equivalent rent at 5, 10, 20 and 30 years and the chosen horizon, because how long the household stays matters more than the loan term | `horizonGaps()` and `horizonThresholds()` in `solve.ts` |
| Sensitivity grid | The final net-worth gap when property growth and investment return each move by ±2 percentage points (3 × 3) | `sensitivity()` in `solve.ts` |
| Assumption swings | The final gap with rent (±10%), rent growth (±1 pp), long-run IRCC (±1 pp) and upkeep (±25% of its rate) each moved on its own | `assumptionSwings()` in `solve.ts` |
| Totals | Lifetime sums: interest, taxes, insurance, maintenance, rent, sale costs, investment tax | `result.buyer`, `result.renter` |

The equivalent rent doesn't depend on the rent you entered, which is why the rent scale in the interface can be dragged without the threshold moving.

The bisection assumes the buyer's final lead grows with rent, which `solve.test.ts` checks across several scenarios. It can fail in extreme cases, such as a rent deposit of many months combined with collapsing returns, where a higher rent mostly enlarges the renter's idle deposit. The solver checks both ends of its range and reports `noThreshold` or `alwaysRent` instead of a rent that would mean the opposite.

## Today's money vs nominal

Each row carries a `deflator = (1 + inflation)^(months / 12)`. The interface divides by it to show values **in today's lei**, which is the default view. In the simulation, inflation indexes the amounts set in today's lei (property tax, moving costs); in the defaults, it sets the growth rates and returns that follow it.

Two views always stay nominal, and say so when the rest of the page shows today's money:

- "Unde se duc banii" (where the money goes), because its lifetime totals mix money from different years.
- The sensitivity tables.

The horizon table follows the switch.

Euro amounts are lei converted at **today's** BNR rate. In the nominal view this quietly assumes the leu doesn't depreciate; the today's-money view doesn't have that problem.

## Input safety

`sanitizeInputs()` runs before every simulation, so edge cases from the UI or a shared link can't break the maths:

- `NaN` and infinite numbers are replaced first: by the minimum for the horizon and the loan term, by 0 for everything else.
- Prices, rents, fees, insurance, upkeep, fit-out, moving costs and the move interval, the fixed period and loan rates (fixed rate, IRCC, margin) are clamped to zero or more, so the bank never pays the borrower.
- Tax rates (investment and both sale taxes) are clamped to 0–100%.
- Growth rates, returns and inflation can't go to −100% or below.
- The down payment is clamped to 0–100%.
- The horizon is 1–50 years and the loan term at most 35 (`MIN_`/`MAX_HORIZON_YEARS`, `MIN_`/`MAX_LOAN_TERM_YEARS`, matching the interface). With a loan, the term is at least one year, so a loan can't go unpaid.
- The horizon, loan term, fixed period, deposit months and move interval are rounded to whole numbers.

Very large but finite values can still overflow; `equivalentRent()` reports `invalid` rather than a meaningless rent.

The interface also limits each field to a sensible range (`src/ui/fields.ts`) and clamps values read from shared links.

## What the model doesn't do

These are deliberate simplifications:

- **No uncertainty.** Growth rates and returns are fixed for the whole horizon. The sensitivity table is the only view of "what if they differ".
- **IRCC follows one fixed path**: from today's value to the long-run one over three years, then flat.
- **Fixed annual lei amounts aren't indexed.** The PAD policy (`homeInsuranceAnnual`) and renter's insurance (`renterInsuranceAnnual`) stay the same nominal amount for the whole horizon, so they shrink in today's money.
- **The rent deposit is reset only on a move.** Between moves it stays at `depositMonths` × the rent when the lease started.
- **Property tax uses one zone per city.** The real bill depends on the zone within the city (about ±6% around the default) and on the local rate.
- **No CASS** (health contribution) on investment income above the thresholds.
- **The buyer always invests** any monthly surplus at the investment return.
- **Moves are off by default.** No published data says how long Romanian tenants stay, so `moveEveryYears` defaults to 0 and `moveCost` to 0; set them to include repeat agency fees, deposit resets and moving costs.
- **No fit-out by default.** No data says what share of rentals are furnished, so `fitOutCost` defaults to 0. Renovation needed right after buying isn't separate from the price either.
- **Sale tax on the sale price only.** The tax base is the higher of the price and the notaries' market-study value for the area; the model uses the simulated price, which in the large cities is usually above that minimum.
- **One average home per city.** Price and rent are the city's all-apartment medians, old and new together; there is no new/existing switch. A new flat usually costs and rents for more than the average: enter its own price and rent.
- **No Noua Casă preset.** The programme's 2027 terms weren't known when the defaults were set; users can enter a 5% down payment and IRCC + 2% themselves.

## Tests

The engine has its own tests next to each module (`*.test.ts`). The most important ones check invariants rather than single numbers:

- Both households spend exactly the same cash, rebuilt from the monthly rows.
- With no growth, returns or fees, the gap is exactly the acquisition costs.
- The loan schedule repays exactly the principal, and recalculates correctly after the fixed period.
- At the equivalent rent, the final gap is within 1 leu of zero, and the gap never falls as rent rises.
- Each move costs exactly the agency fee and moving cost, and a deposit reset changes nothing at zero return.
- The mortgage notary fee matches the order's scale at each bracket.

`scenarios.test.ts` holds snapshots of a few reference scenarios, so any change in results shows up in review.

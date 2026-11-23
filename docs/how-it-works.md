# How the calculation works

The engine lives in `src/engine/`. It is plain TypeScript: it takes an `Inputs` object and returns a month-by-month timeline. Nothing in it depends on the UI.

## The idea

Comparing a mortgage payment with a rent is misleading: the buyer builds equity, pays one-off fees and owns an asset that changes in value, while the renter keeps cash that can earn a return. So instead of comparing monthly costs, the calculator compares **net worth**.

Three households start with **the same amount of cash** and spend **the same amount every month**. Whatever one of them doesn't spend on housing, they keep: the buyer and the investing renter invest it, the saving renter puts it in a deposit. At any month, the household with the higher net worth is the one whose choice was better so far.

## The timeline

`simulate(inputs)` runs one step per month from month 0 to the horizon (default 30 years).

### Month 0

| | Buyer | Renter |
|---|---|---|
| Pays | Down payment + acquisition costs (notary, land registry, buyer agency fee, bank fees) | Rental deposit + rental agency fee |
| Keeps | Nothing, if their upfront costs are higher | The difference, invested or saved |

If the renter's upfront costs are larger than the buyer's (rare), the buyer keeps and invests the difference instead. The deposit comes back at the end; the agency fee doesn't.

### Every month after

**Buyer's cost**
- Loan payment from the amortization schedule (see below).
- Property tax: `property value × propertyTaxPct / 12`.
- Insurance: the mandatory PAD policy per year / 12, the optional home policy banks require (`property value × homeInsurancePct / 12`), and life insurance on the loan balance.
- Maintenance: `property value × maintenancePct / 12`.

**Renter's cost**
- Rent, raised once a year by `rentGrowth`.
- Renter's insurance per year / 12.

**Who invests the difference**
- If the buyer's cost is higher, the renter invests (or saves) the difference.
- If the rent is higher, the buyer invests the difference.

**Growth**
- The property grows by `propertyGrowth` (converted to a monthly rate).
- Investments grow by `investReturn`.
- Deposits grow by `savingsRate × (1 − savingsTaxRate)`, because banks withhold the interest tax as interest is paid.

**Rate conventions**
- Loan rates are **nominal**: the monthly rate is `annual / 12`, which is how Romanian banks quote mortgage rates.
- Property growth, investment return, deposit interest and inflation are **effective** annual rates: the monthly rate is `(1 + annual)^(1/12) − 1`, so twelve months compound to exactly the annual figure.
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
| Renter who saves | deposit balance (already after tax) + rental deposit |

**Sale costs** are the agency fee plus the property transfer tax, both as a share of the sale value. The tax rate is higher if the home has been owned for up to `saleTaxShortHoldYears` inclusive (3% up to and including 3 years, 1% after, under current Romanian rules), so month 36 still uses the higher rate and month 37 the lower one. Because net worth assumes a sale each month, the buyer's line jumps up when the lower rate kicks in. The interface explains this when it affects the result.

**Investment tax** is applied once, on the gain, when the portfolio is liquidated.

## Outputs

| Output | Meaning | Where |
|---|---|---|
| `rows` | One row per month: property value, loan balance, monthly costs, the three net worths, and a deflator | `simulate()` |
| `breakEvenMonth` | The first month from which the buyer **stays ahead** of the investing renter until the horizon. `0` if the buyer is ahead from month 0 onward; `null` if the buyer is behind at the horizon. A temporary early lead doesn't count. A tie counts as ahead. | `simulate()` |
| `buyerEverAhead` | Whether the buyer is ahead (or level) in any month, month 0 included, even if the lead is later lost. Lets the interface tell "never ahead" apart from "ahead for a while" when `breakEvenMonth` is `null`. | `simulate()` |
| Equivalent rent | The starting rent at which the buyer and the investing renter end the horizon level. Found by bisection. The search starts with an upper bound of 2% of the price per month (at least 1,000 lei) and doubles it, up to 10 times, until the buyer comes out ahead. | `equivalentRent()` in `solve.ts` |
| `alwaysBuy` / `alwaysRent` / `invalid` | Returned instead of a rent when buying wins even at zero rent, when it still loses at the largest bound tried, or when the simulation overflows to a non-finite result at the search bounds | `equivalentRent()` |
| Sensitivity grid | The final net-worth gap when property growth and investment return each move by ±2 percentage points (3 × 3) | `sensitivity()` in `solve.ts` |
| Totals | Lifetime sums: interest, taxes, insurance, maintenance, rent, sale costs, investment tax | `result.buyer`, `result.renter` |

The equivalent rent doesn't depend on the rent you entered, which is why the rent scale in the interface can be dragged without the threshold moving.

The bisection assumes the buyer's final lead grows with rent, which `solve.test.ts` checks across several scenarios. It can fail in extreme cases, such as a rent deposit of many months combined with collapsing returns, where a higher rent mostly enlarges the renter's idle deposit; the solver then reports `alwaysRent`.

## Today's money vs nominal

Each row carries a `deflator = (1 + inflation)^(months / 12)`. The interface divides by it to show values **in today's lei**, which is the default view. Inflation is used only for this; it doesn't change the simulation itself.

Two views always stay nominal, and say so when the rest of the page shows today's money:

- "Unde se duc banii" (where the money goes), because its lifetime totals mix money from different years.
- The sensitivity table.

Euro amounts are lei converted at **today's** BNR rate. In the nominal view this quietly assumes the leu doesn't depreciate; the today's-money view doesn't have that problem.

## Input safety

`sanitizeInputs()` runs before every simulation, so edge cases from the UI or a shared link can't break the maths:

- `NaN` and infinite numbers are replaced first: by the minimum for the horizon and the loan term, by 0 for everything else.
- Prices, rents, fees, insurance, the fixed period and loan rates (fixed rate, IRCC, margin) are clamped to zero or more, so the bank never pays the borrower.
- Tax rates (investment, deposit and both sale taxes) are clamped to 0–100%.
- Growth rates, returns and inflation can't go to −100% or below.
- The down payment is clamped to 0–100%.
- The horizon is 1–50 years and the loan term at most 35 (`MIN_`/`MAX_HORIZON_YEARS`, `MIN_`/`MAX_LOAN_TERM_YEARS`, matching the interface). With a loan, the term is at least one year, so a loan can't go unpaid.
- The horizon, loan term, fixed period and deposit months are rounded to whole numbers.

Very large but finite values can still overflow; `equivalentRent()` reports `invalid` rather than a meaningless rent.

The interface also limits each field to a sensible range (`src/ui/fields.ts`) and clamps values read from shared links.

## What the model doesn't do

These are deliberate simplifications:

- **No uncertainty.** Growth rates and returns are fixed for the whole horizon. The sensitivity table is the only view of "what if they differ".
- **IRCC follows one fixed path**: from today's value to the long-run one over three years, then flat.
- **Fixed annual lei amounts aren't indexed.** The PAD policy (`homeInsuranceAnnual`) and renter's insurance (`renterInsuranceAnnual`) stay the same nominal amount for the whole horizon, so they shrink in today's money.
- **The rent deposit isn't topped up** as rent rises; it stays at `depositMonths` × the starting rent.
- **Property tax is a share of market value.** In reality it applies to a statutory value that is usually well below market price, and varies by locality; the default is set to approximate that.
- **No CASS** (health contribution) on investment income above the thresholds.
- **The buyer always invests** any monthly surplus at the investment return, even when compared with the saving renter.
- **One rental agency fee only.** The renter pays it once at the start; renters who move pay it again, which isn't modelled. No moving, furnishing or renovation costs either.
- **No Noua Casă preset.** The programme's 2027 terms weren't known when the defaults were set; users can enter a 5% down payment and IRCC + 2% themselves.

## Tests

The engine has its own tests next to each module (`*.test.ts`). The most important ones check invariants rather than single numbers:

- Both households spend exactly the same cash, rebuilt from the monthly rows.
- With no growth, returns or fees, the gap is exactly the acquisition costs.
- The loan schedule repays exactly the principal, and recalculates correctly after the fixed period.
- At the equivalent rent, the final gap is within 1 leu of zero, and the gap never falls as rent rises.
- The saving renter compounds at exactly the after-tax deposit rate.

`scenarios.test.ts` holds snapshots of a few reference scenarios, so any change in results shows up in review.

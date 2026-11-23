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
| Pays | Down payment + acquisition costs (notary, land registry, bank fees) | Rental deposit |
| Keeps | Nothing, if their upfront costs are higher | The difference, invested or saved |

If the deposit is larger than the buyer's upfront costs (rare), the buyer keeps and invests the difference instead.

### Every month after

**Buyer's cost**
- Loan payment from the amortization schedule (see below).
- Property tax: `property value × propertyTaxPct / 12`.
- Insurance: home insurance per year / 12, plus life insurance on the loan balance.
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

### The loan

`amortize()` in `src/engine/mortgage.ts` builds a standard annuity schedule:

- During the fixed period, the rate is `fixedRate`.
- After it, the payment is recalculated on the remaining balance at `ircc + variableMargin`, held constant until the end of the term.
- If `fixedYears` is 0, the loan is variable from the start.
- The last payment absorbs rounding so the balance ends at exactly zero.

## Net worth

Net worth is what each household would have **if it liquidated everything that month**.

| Household | Net worth |
|---|---|
| Buyer | property value − loan balance − sale costs + investments after tax on gains |
| Renter who invests | investments after tax on gains + rental deposit |
| Renter who saves | deposit balance (already after tax) + rental deposit |

**Sale costs** are the agency fee plus the property transfer tax, both as a share of the sale value. The tax rate is higher if the home has been owned for less than `saleTaxShortHoldYears` (3% up to 3 years, 1% after, under current Romanian rules). Because net worth assumes a sale each month, the buyer's line jumps up when the lower rate kicks in. The interface explains this when it affects the result.

**Investment tax** is applied once, on the gain, when the portfolio is liquidated.

## Outputs

| Output | Meaning | Where |
|---|---|---|
| `rows` | One row per month: property value, loan balance, monthly costs, the three net worths, and a deflator | `simulate()` |
| `breakEvenMonth` | The first month from which the buyer **stays ahead** of the investing renter until the horizon. `null` if that never happens. A temporary early lead doesn't count. | `simulate()` |
| Equivalent rent | The starting rent at which the buyer and the investing renter end the horizon level. Found by bisection between 0 and 2% of the price per month. | `equivalentRent()` in `solve.ts` |
| `alwaysBuy` / `alwaysRent` | Returned instead of a rent when buying wins even at zero rent, or loses even at the top of the search range | `equivalentRent()` |
| Sensitivity grid | The final net-worth gap when property growth and investment return each move by ±2 percentage points (3 × 3) | `sensitivity()` in `solve.ts` |
| Totals | Lifetime sums: interest, taxes, insurance, maintenance, rent, sale costs, investment tax | `result.buyer`, `result.renter` |

The equivalent rent doesn't depend on the rent you entered, which is why the rent scale in the interface can be dragged without the threshold moving.

## Today's money vs nominal

Each row carries a `deflator = (1 + inflation)^(months / 12)`. The interface divides by it to show values **in today's lei**, which is the default view. Inflation is used only for this; it doesn't change the simulation itself.

Two views always stay nominal, and say so when the rest of the page shows today's money:

- "Unde se duc banii" (where the money goes), because its lifetime totals mix money from different years.
- The sensitivity table.

Euro amounts are lei converted at **today's** BNR rate. In the nominal view this quietly assumes the leu doesn't depreciate; the today's-money view doesn't have that problem.

## Input safety

`sanitizeInputs()` runs before every simulation, so edge cases from the UI or a shared link can't break the maths:

- Prices, rents, fees, insurance and tax rates are clamped to zero or more.
- Growth rates, returns and inflation can't go to −100% or below.
- The down payment is clamped to 0–100%.
- With a loan, the term is at least one year, so a loan can't go unpaid.
- The horizon is at least one year.

The interface also limits each field to a sensible range (`src/ui/fields.ts`) and clamps values read from shared links.

## What the model doesn't do

These are deliberate simplifications:

- **No uncertainty.** Growth rates and returns are fixed for the whole horizon. The sensitivity table is the only view of "what if they differ".
- **IRCC stays constant** after the fixed period.
- **Property tax is a share of market value.** In reality it applies to a statutory value that is usually well below market price, and varies by locality; the default is set to approximate that.
- **No CASS** (health contribution) on investment income above the thresholds.
- **The buyer always invests** any monthly surplus at the investment return, even when compared with the saving renter.
- **No moving costs, agency fees for renting, furnishing or renovation.**
- **No Noua Casă preset.** The programme's 2027 terms weren't known when the defaults were set; users can enter a 5% down payment and IRCC + 2% themselves.

## Tests

The engine has its own tests next to each module (`*.test.ts`). The most important ones check invariants rather than single numbers:

- Both households spend exactly the same cash, rebuilt from the monthly rows.
- With no growth, returns or fees, the gap is exactly the acquisition costs.
- The loan schedule repays exactly the principal, and recalculates correctly after the fixed period.
- At the equivalent rent, the final gap is within 1 leu of zero.
- The saving renter compounds at exactly the after-tax deposit rate.

`scenarios.test.ts` holds snapshots of a few reference scenarios, so any change in results shows up in review.

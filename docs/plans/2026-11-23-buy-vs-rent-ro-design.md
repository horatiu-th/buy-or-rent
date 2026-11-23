# Buy vs Rent Calculator (Romania) — Design

Date: 2026-11-23

## Goal

A public, Romanian-language web app that helps people decide whether to buy or rent a home in Romania. Simple single page, configurable numbers, live-updating charts, credible sourced defaults.

## Decisions

| Topic | Decision |
|---|---|
| Audience | Public (Romanian users) |
| Main answer | Net worth over time (buyer vs renter) + break-even year; headline "equivalent rent" |
| Flow | Single live page; city picker on top; key inputs visible; advanced inputs collapsed |
| Data | Static JSON refreshed by scheduled GitHub Action (incl. scraping where allowed) + manual overrides |
| Stack | Vite + React + TypeScript, Recharts, Vitest |
| Language | Romanian only in v1; all strings in one file |

## 1. Calculation model

Monthly simulation over a horizon (default 30 years). Both households start with the same cash.

**Buyer**
- Upfront: down payment, notary fees, ANCPI (intabulare), bank valuation and loan fees, VAT on new builds (folded into price).
- Monthly: mortgage annuity, property tax, PAD + home insurance, life insurance if required, maintenance (% of property value/year).
- Rate: fixed for N years, then IRCC + margin (IRCC user-configurable, default = current).
- Property appreciates at a configurable %/year.
- Optional sale costs at horizon (agency fee %, income tax on sale if held < 3 years) to compare net liquid wealth.

**Renter**
- Monthly: rent + renter's insurance; rent grows at configurable %/year.
- Deposit (default 1–2 months), returned at horizon.
- Invests the upfront cash the buyer spent, and each month invests the difference when the buyer's monthly cost exceeds rent. Symmetric: when rent is higher, the buyer invests the difference.
- Investment return configurable, net of tax on gains (default 10%, verify).

**Outputs**
- `netWorth[month]` per side. Buyer: property value − remaining loan − sale costs + buyer investments. Renter: investments + deposit.
- Break-even month: first month buyer net worth exceeds renter net worth.
- Equivalent rent: starting rent at which both net worths are equal at the horizon (bisection).
- Nominal or real lei (inflation input).

Defaults are assumptions, not forecasts, and are labelled as such.

## 2. Inputs and UI

**Top:** city picker (București, Cluj-Napoca, Timișoara, Iași, Brașov, Constanța, Oradea, Sibiu, Altul/manual), property type (new build / existing), size m². City pre-fills median price/m², rent/m², local tax.

**Key inputs:** price (lei/€ toggle at BNR rate), monthly rent, down payment % ("Noua Casă" preset if the programme is still active — verify), interest (fixed period + margin over IRCC; presets "Fix 5 ani" / "Variabilă"), loan term, horizon.

**Advanced (collapsed):** acquisition costs, ownership costs, growth rates (property, rent, inflation), investments (return, tax), sale costs.

Each input: ⓘ explanation, source + date tag, "↺ reset" when edited.

**Results:**
1. Headline: "Cumpărarea merită dacă o chirie similară e peste X lei/lună" + one-line verdict for the user's inputs.
2. Net worth chart, two lines, break-even marked.
3. Tabs: monthly costs over time; cost breakdown at year N; sensitivity (property growth, investment return ±2 pp).

Scenario state lives in URL query params (shareable, no backend). "Reset all" restores city defaults.

## 3. Data pipeline

- `data/auto.json` — written by the pipeline only.
- `data/overrides.json` — hand-edited; wins over auto.
- Merged at build into `public/defaults.json`. Each value: `{ value, unit, source, sourceUrl, asOf, status: "ok" | "stale" | "manual" }`.

| Data | Source | Method |
|---|---|---|
| IRCC | BNR | Parse published page/XML |
| EUR/RON | BNR | Official daily XML |
| Inflation | INS / BNR | INS Tempo or BNR report |
| Mortgage margins | BNR new-loan rate statistics (preferred over scraping banks) | Fetch/parse |
| Price €/m² per city | imobiliare.ro index / storia.ro reports | Report pages, only if ToS allows; else manual |
| Rent €/m² per city | Same | Same |
| Notary, ANCPI fees | Official schedules | Manual |
| VAT rules, property tax | Legislation / city halls | Manual |

Endpoint availability and formats are unverified; verifying them is the first pipeline task. Check robots.txt/ToS of real-estate portals before scraping.

**Schedule:** weekly GitHub Action; opens a PR on changes (no direct push).

**Failure handling:** per-fetcher validation (type, plausible range, ±30% jump flagged). On failure keep last good value with `status: "stale"` and warn in the PR/job summary. UI shows stale values with a subtle marker.

**Deploy:** merge to main → build → static hosting (host TBD).

## 4. Code architecture

```
src/
  engine/        simulate.ts, mortgage.ts, costs.ts, solve.ts, types.ts  (pure TS, no I/O)
  data/          loadDefaults.ts
  state/         useScenario.ts  (inputs ↔ URL)
  ui/            CityPicker, InputField, AdvancedPanel, Headline,
                 NetWorthChart, MonthlyCostsChart, BreakdownChart, SensitivityTable
  i18n/ro.ts
pipeline/
  fetchers/      bnr.ts, ins.ts, imobiliare.ts, ...
  validate.ts
  run.ts         writes data/auto.json
```

Flow: defaults.json → city defaults → user edits (URL) → `Inputs` → `simulate()` → `Result` → charts.

Performance: ~50 simulations of 360 steps per change; runs on main thread with small debounce.

Invalid input: UI min/max validation; implausible-but-valid scenarios show a warning and still compute. If equivalent rent has no solution in a plausible range, the headline says so instead of showing a number.

Money: plain numbers in lei, rounded only for display.

## 5. Testing and scope

**Engine (Vitest):**
- Mortgage annuity vs known reference values; principal sums to loan; correct recalculation at fixed→variable switch.
- Simulation invariants: equal total cash invested both sides; with zero growth/return and rent = buyer monthly cost, difference comes only from fees; month-0 net worth = initial cash − sunk costs.
- Solver: net worth gap ≈ 0 at the solved rent; `null` when no solution.
- Snapshots for 2–3 reference scenarios.

**Pipeline:** fetchers against saved fixtures (no network in CI); validate range, jump, and stale fallback.

**UI:** Testing Library for city → headline update, edit → URL update, URL → restored state.

**Out of v1:** accounts, saved scenarios in a DB, English, multi-property comparison, Monte Carlo, detailed credit-insurance modelling, PDF export.

## Implementation order

1. Engine + tests with hard-coded defaults.
2. Minimal UI: key inputs, headline, net worth chart.
3. Advanced panel, other tabs, URL state.
4. Hand-built `defaults.json` from verified sources.
5. Pipeline: BNR → INS → real-estate portals (after ToS check).
6. Deploy.

# Cumpăr sau închiriez?

A buy-vs-rent calculator for Romania. It answers one question: **at what rent does buying a home pay off?**

**Live:** https://horatiu-th.github.io/buy-or-rent/ · The interface is in Romanian.

## What it does

You pick a city and a size. The calculator fills in typical prices, rents, loan rates, fees and taxes from public sources, and then simulates, month by month, two households:

- **Cumpărător** (buyer): pays the down payment and fees, takes a mortgage, owns the home.
- **Chiriaș care investește** (renter who invests): rents a similar home and invests every leu the buyer spent and they didn't.

It shows:

- **The verdict:** the rent above which buying wins, and when the buyer pulls ahead for good.
- **A rent scale:** where your rent sits against that threshold. Drag it to try other rents.
- **Other horizons:** the threshold and the gap after 5, 10, 20 and 30 years, since how long you stay matters more than the loan term.
- **Charts:** net worth over time, monthly costs, where the money goes, and how sensitive the result is to price growth, investment returns, rent, rent growth, long-run interest rates and upkeep.

Across the charts, blue represents the buyer and teal represents the renter. Under **Închiriere**, the investment return and investment tax fields follow the rental costs. Both households use these rates when they invest a surplus.

Every input can be changed, values are shown in today's money by default, and any scenario can be shared as a link.

## Quick start

Requires Node 24 (see `.nvmrc`).

```bash
npm ci
npm run dev    # http://localhost:5173
```

| Command | What it does |
|---|---|
| `npm run dev` | Local dev server with hot reload |
| `npm test` | Unit and UI tests (Vitest) |
| `npm run typecheck` | TypeScript check |
| `npm run build` | Merge data, typecheck, build the static site into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run data:fetch` | Refresh `data/auto.json` from BNR (rewrites it only when a value changed) |
| `npm run data:merge` | Rebuild `src/data/defaults.json` from `data/` |

## Project layout

```
src/
  engine/   Calculation engine: pure TypeScript, no UI
  data/     Default values (generated) and the code that turns them into inputs
  state/    Scenario state, kept in the URL
  ui/       React components, charts and field definitions
  i18n/     All interface text (Romanian)
pipeline/   Scripts that fetch, validate and merge default data
data/       Hand-maintained and fetched default values, plus their sources
docs/       Documentation and the original design and plan
.github/    Deploy and weekly data-update workflows
```

## Documentation

| Guide | Read it to |
|---|---|
| [How the calculation works](docs/how-it-works.md) | Understand the model, its outputs and its limits |
| [Architecture](docs/architecture.md) | Find your way around the code and change it |
| [Data](docs/data.md) | Learn where defaults come from and how to update them |
| [Operations](docs/operations.md) | Deploy, run the workflows and handle routine upkeep |
| [Sources](data/SOURCES.md) | See the source and reasoning behind every default value |

The original design and implementation plan are kept in [`docs/plans/`](docs/plans/) as a record of how the project was planned. The code has moved on since; the guides above describe the current state.

## Disclaimer

The results depend on assumptions about future prices, rents, interest rates and returns. They are an aid to thinking, not financial advice.

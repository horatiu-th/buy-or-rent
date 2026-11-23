# Data

Every default the calculator shows has a source. The sources themselves, and the reasoning behind every estimate, are listed in [`data/SOURCES.md`](../data/SOURCES.md). This guide explains how the data is stored, merged and refreshed.

## Files

| File | Written by | Contents |
|---|---|---|
| `data/overrides.json` | Hand | Most defaults: rates, fees, taxes, long-run assumptions, city prices and rents |
| `data/auto.json` | The pipeline | Values fetched automatically. Currently: the BNR EUR/RON rate. |
| `src/data/defaults.json` | `npm run data:merge` | The two combined. This is what the app bundles. Never edit it by hand. |
| `data/SOURCES.md` | Hand | Source, link, date and reasoning for every value |

**When the same key is in both files, `overrides.json` wins.** So a value you want fetched automatically must not also appear in `overrides.json`.

## Format

Every value is a `SourcedValue`:

```json
"fixedRate": {
  "value": 0.055,
  "unit": "%",
  "source": "BNR, dobânda medie la credite noi pentru locuințe (5,6%)",
  "sourceUrl": "https://…",
  "asOf": "2026-09-30",
  "status": "manual"
}
```

| Field | Meaning |
|---|---|
| `value` | The number. **Rates are decimals**: `0.055` means 5.5%. Money is in lei, except city prices and rents in €/m². |
| `unit` | Shown for reference |
| `source` | Shown to users in the field's info popover, in Romanian. Use `"Estimare"` for estimates. |
| `sourceUrl` | Optional link, shown with the source |
| `asOf` | The date the value applies to, `YYYY-MM-DD` |
| `status` | `manual` (hand-maintained), `ok` (fetched successfully), or `stale` (the last fetch failed, so this is the previous value) |

Values sit under `values` (global, keyed by `Inputs` field name, plus `eurRon`) or under `cities.<id>` (`name`, `priceSqmEurNew`, `priceSqmEurExisting`, `rentSqmEur`).

The merge stops with an error if a required value or a city field is missing. The required keys are listed in `REQUIRED_VALUE_KEYS` in `src/data/schema.ts`.

## How prices and rents are derived

For the chosen city, property type and size:

```
price = €/m² (new or existing) × m² × EUR/RON rate
rent  = rent €/m² × m² × EUR/RON rate
```

Both are rounded to whole lei. Users can override either.

## Automatic updates

### What is fetched

| Value | Source | Why |
|---|---|---|
| `eurRon` | BNR daily reference rate, `https://curs.bnr.ro/nbrfxrates.xml` | Official, machine-readable, stable |

And what deliberately isn't:

| Value | Why not |
|---|---|
| IRCC | BNR publishes it only through an internal website endpoint, not a file. It would break whenever BNR edits the page. |
| Inflation | The default is a long-run assumption (3.5%), not today's CPI. Filling it automatically with the current rate would distort 30-year results. |
| City prices and rents | imobiliare.ro blocks automated access to search pages, and neither portal's terms of use could be confirmed. These are updated by hand from published reports, with attribution. |

### How a run works

`npm run data:fetch` (`pipeline/run.ts`):

1. Runs every fetcher in `pipeline/fetchers/index.ts`.
2. Checks each value: it must be a number, inside the fetcher's plausible range, and within 30% of the previous value.
3. If the value passes, it's written to `data/auto.json` with `status: "ok"`.
4. If the fetch fails or the check fails, the previous value is kept and marked `stale`. The app shows "date vechi" (old data) next to the exchange rate in the footer.
5. Writes a summary table to `pipeline-summary.md` (and to the GitHub job summary when run in Actions).

Then `npm run data:merge` rebuilds `src/data/defaults.json`.

### The weekly workflow

`.github/workflows/update-data.yml` runs every Monday at 06:00 UTC, and can be started by hand from the Actions tab. It fetches, merges and runs the tests, and if anything changed it **opens a pull request** (`data/auto-update`) instead of pushing to `main`. Review and merge it to publish the new values. Merging deploys the site.

## Updating values by hand

1. Edit the value in `data/overrides.json`: update `value`, `source`, `sourceUrl` and `asOf`.
2. Update the matching row in `data/SOURCES.md`.
3. Run `npm run data:merge` and `npm test`.
4. Commit `data/overrides.json`, `data/SOURCES.md` and `src/data/defaults.json` together.

Reference snapshot tests use fixed inputs, not the defaults, so changing data doesn't break them.

### Adding a fetcher

1. Download a real response into `pipeline/fixtures/`.
2. Write a parser and a test against that file (see `pipeline/fetchers/bnrFx.ts`).
3. Export a `Fetcher` with the data path (e.g. `values.ircc`), unit, source, URL and a plausible range. Use `fetchText()` from `pipeline/http.ts` for the request.
4. Add it to `FETCHERS` in `pipeline/fetchers/index.ts`.
5. Remove that key from `data/overrides.json`, so the fetched value is used.
6. Run `npm run data:fetch` and `npm run data:merge`, and commit `data/auto.json` and `src/data/defaults.json`.

Only add sources that publish machine-readable data and allow automated access.

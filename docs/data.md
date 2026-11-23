# Data

Every default the calculator shows has a source. The sources themselves, and the reasoning behind every estimate, are listed in [`data/SOURCES.md`](../data/SOURCES.md). This guide explains how the data is stored, merged and refreshed.

## Files

| File | Written by | Contents |
|---|---|---|
| `data/overrides.json` | Hand | Most defaults: rates, fees, taxes, long-run assumptions, city prices and rents |
| `data/auto.json` | The pipeline | Values fetched automatically (currently the BNR EUR/RON rate), plus any `pending` candidates held back by the jump check |
| `src/data/defaults.json` | `npm run data:merge` | The two combined. This is what the app bundles. Never edit it by hand. |
| `data/SOURCES.md` | Hand | Source, link, date and reasoning for every value |

**When the same key is in both files, `overrides.json` wins.** So a value you want fetched automatically must not also appear in `overrides.json`. The merge prints a warning for every key found in both.

## Format

Every value is a `SourcedValue`:

```json
"fixedRate": {
  "value": 0.056,
  "unit": "%",
  "source": "BNR, dobânda medie la credite noi pentru locuințe în lei, septembrie 2026 (5,6%)",
  "sourceUrl": "https://…",
  "asOf": "2026-09-30",
  "status": "manual"
}
```

| Field | Meaning |
|---|---|
| `value` | The number. **Rates are decimals**: `0.056` means 5.6%. Money is in lei, except city prices and rents in €/m². |
| `unit` | Shown for reference |
| `source` | Shown to users in the field's info popover, in Romanian. Use `"Estimare"` for estimates. |
| `sourceUrl` | Optional link, shown with the source |
| `asOf` | The date the value applies to, `YYYY-MM-DD` |
| `validUntil` | Optional. The last day the value is known to apply, `YYYY-MM-DD`, for values with a scheduled change (IRCC). After that date the merge prints a warning. |
| `status` | `manual` (hand-maintained), `ok` (fetched, and recent), or `stale` (fetched, but `asOf` is older than the fetcher's maximum age) |

Values sit under `values` (global, keyed by `Inputs` field name, plus `eurRon`) or under `cities.<id>`: `name`, `priceSqmEurNew`, `priceSqmEurExisting`, `rentSqmEur`, and optionally `propertyTaxSqm`, which replaces the global `propertyTaxSqm` (lei per m² per year) for that city.

The city `bucuresti` (`DEFAULT_CITY_ID` in `src/data/schema.ts`) must exist: an unknown city id, for example from an old shared link, falls back to it (`resolveCityId()` in `src/data/defaults.ts`).

### What the merge checks

`npm run data:merge` stops with an error listing every problem, each named by its key (e.g. `values.ircc: value 5.57 is outside [0, 0.2]`), if:

- a required value (`REQUIRED_VALUE_KEYS` in `src/data/schema.ts`) or city field is missing, or a key or field is unknown (usually a typo);
- `value` is not a finite number, or falls outside the plausible range for its key in `pipeline/ranges.ts`. The ranges are wide on purpose: they catch unit mistakes such as a percentage written as `5.57` instead of `0.0557`, not unusual values;
- `unit` or `source` is empty, `sourceUrl` is not an http(s) URL, `asOf` or `validUntil` is not a real calendar date, or `status` is not one of the three above.

It prints a warning, without stopping, when a key is in both data files or a `validUntil` date has passed.

## How prices and rents are derived


For the chosen city, property type and size:

```
price = €/m² (new or existing) × m² × EUR/RON rate × (1 − negotiationPct)
rent  = rent €/m² × 55 × (m² / 55)^0.72 × EUR/RON rate
property tax (lei/year) = property tax lei/m² (city, else global) × m²
```

Both are rounded to whole lei. Users can override either.

- **Price:** the indexes report asking prices. `negotiationPct` takes off the typical gap between the last asking price and the price actually paid.
- **Rent:** rent per m² falls as homes get larger. The city figures are averages over flats of about 55 m², so the curve (`rentForSize()` in `src/data/defaults.ts`) matches them at 55 m² and charges less per m² above that size and more below it. The 0.72 exponent fits apartamente.org's room-by-room medians (studio, 2 and 3 rooms) in Cluj, Timișoara, Brașov and Iași.
- **Area** is usable area without balconies, which is what the price indexes use.

Other inputs that depend on the property type: `buyerAgencyPct` comes from `buyerAgencyPct` for existing homes and from `buyerAgencyPctNew` for new builds, which are usually bought from the developer without an agent.

### VAT on new builds (unverified assumption)

The engine treats `price` as the full amount the buyer pays, VAT included. New-build prices come from Storia's average asking prices. Storia's monthly analyses do not say whether the prices they average include VAT; some listings state "TVA inclus", and Storia's own buyer guide tells readers to check whether an offer's price includes VAT. If a large share of new-build listings is net of VAT, the real cost would be up to 21% higher (the standard rate; the transitional 9% rate ended with deliveries by 2026-09-30). Many developers quote prices without VAT, and none of the indexes says how it treats VAT, so the numbers are unchanged and the price field's help text tells users to check. See `data/SOURCES.md`.

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
2. Checks each value. It is **rejected** if its date is invalid or earlier than the stored one, or if it is outside the fetcher's plausible range (`range`). For EUR/RON the range is 4.5–6.5.
3. If it differs from the stored value by more than the fetcher's `maxJump` (5% for EUR/RON), it is **held**: the stored value stays, and the new one is recorded under `pending` in `data/auto.json`. A later run applies it (**confirmed**) if the source then publishes a later value within `maxJump` of the candidate. Re-reading the same publication does not count. Otherwise the newer reading replaces the candidate.
4. A value that passes is written with `status: "ok"`.
5. If the fetch fails, nothing is written. A single failure does not mark anything stale.
6. Staleness comes from age: a value whose `asOf` is older than the fetcher's `maxAgeDays` (10 days for EUR/RON) gets `status: "stale"`, whether or not this run's fetch worked. The app then shows "date vechi" (old data) next to it. When there is no stored value and the fetch fails, the key stays absent, and the merge fails unless `overrides.json` provides it.
7. `data/auto.json` is rewritten only when something actually changed.
8. Writes a summary table to `pipeline-summary.md` (and to the GitHub job summary when run in Actions). Failed, rejected, held and stale values are also printed as warnings (annotations in Actions). The script exits 0 in those cases, so that other values' updates still go through.

Then `npm run data:merge` rebuilds `src/data/defaults.json`.

### The weekly workflow

`.github/workflows/update-data.yml` runs every Monday at 12:00 UTC, and can be started by hand from the Actions tab. It fetches, merges and runs the tests, and only if `data/auto.json` changed does it **open a pull request** (`data/auto-update`) instead of pushing to `main`. Review and merge it to publish the new values. Merging deploys the site. See [Operations](operations.md#the-weekly-data-update) for how the jobs are split and when the run fails.

## Updating values by hand

1. Edit the value in `data/overrides.json`: update `value`, `source`, `sourceUrl` and `asOf`.
2. Update the matching row in `data/SOURCES.md`.
3. Run `npm run data:merge` and `npm test`.
4. Commit `data/overrides.json`, `data/SOURCES.md` and `src/data/defaults.json` together.

Reference snapshot tests use fixed inputs, not the defaults, so changing data doesn't break them. `pipeline/data.test.ts` does check that the committed data files merge cleanly.

For a value with a known end date, add `validUntil`, so the merge warns when it has passed.

### Adding a fetcher

1. Download a real response into `pipeline/fixtures/`.
2. Write a parser and a test against that file (see `pipeline/fetchers/bnrFx.ts`).
3. Export a `Fetcher` with the data path (e.g. `values.ircc`; a typo is a type error), unit, source, URL, a plausible `range`, a `maxJump` (largest believable change between two runs) and a `maxAgeDays` (when the value counts as stale). The parser should reject malformed numbers and invalid dates rather than coerce them. Use `fetchText()` from `pipeline/http.ts` for the request.
4. Add it to `FETCHERS` in `pipeline/fetchers/index.ts`.
5. Remove that key from `data/overrides.json`, so the fetched value is used.
6. Run `npm run data:fetch` and `npm run data:merge`, and commit `data/auto.json` and `src/data/defaults.json`.

Only add sources that publish machine-readable data and allow automated access.

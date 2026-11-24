# Operations

How the site is deployed, how the workflows run, and what needs regular attention.

## Hosting and deploy

The site is a static build hosted on **GitHub Pages**: https://horatiu-th.github.io/buy-or-rent/

**Every push to `main` deploys.** `.github/workflows/deploy.yml`:

1. Installs dependencies with `npm ci --ignore-scripts`, on the Node version in `.nvmrc`. Install scripts are skipped so a compromised dependency can't run code at install time; esbuild and rolldown load their binaries from platform packages and don't need them.
2. Runs the tests. A failing test stops the deploy.
3. Builds with `npm run build`, which also re-merges the data.
4. Publishes `dist/` to Pages.

Only the `deploy` job gets `pages: write` and `id-token: write`; the build job can only read the repository. A deploy that has already started is allowed to finish rather than being cancelled by a newer push. The build uses relative paths (`base: './'` in `vite.config.ts`), so it works under the `/buy-or-rent/` path and on any other static host.

### Releasing a change

```bash
git checkout -b feat/my-change
# … edit, then:
npm test && npm run typecheck && npm run build
git commit -m "feat: Added my change"
git checkout main && git merge --ff-only feat/my-change
git push origin main          # triggers the deploy
```

Then check the run in the repository's Actions tab, or with `gh run list --workflow deploy.yml`.

### Required repository settings

Both are already enabled. If the repository is ever recreated, set them before the first push:

| Setting | Value | Needed by |
|---|---|---|
| Settings → Pages → Source | GitHub Actions | The deploy workflow |
| Settings → Actions → General → Workflow permissions | Allow GitHub Actions to create and approve pull requests | The weekly data workflow |

## The weekly data update

`.github/workflows/update-data.yml` runs every Monday at 12:00 UTC, or on demand from the Actions tab ("Run workflow"). The time is chosen to fall after BNR's daily reference-rate publication, reported by secondary sources as around 13:00 Bucharest time (10:00–11:00 UTC); this was not confirmed on BNR's own site. See [Data](data.md#automatic-updates) for how values are checked.

It has three jobs:

| Job | Permissions | What it does |
|---|---|---|
| `fetch` | read | Installs dependencies, runs `data:fetch`, `data:merge` and the tests. If `data/auto.json` changed, uploads it with `defaults.json` and the summary as an artifact. |
| `pull-request` | `contents: write`, `pull-requests: write` | Runs only when something changed. Downloads the artifact and opens or updates the `data/auto-update` pull request. It runs no npm packages or project code, so only the pinned create-pull-request action ever holds the write token. |
| `stale-alert` | none | Fails the run when a fetched value is past its maximum age (10 days for EUR/RON), so GitHub notifies the owner. |

A failed fetch on its own changes nothing: no pull request opens, the run stays green, and the failure shows as a warning annotation and in the job summary. Only once the stored value is too old does the run fail, and a pull request then flips it to `stale` so the site shows "date vechi".

**What to do with the pull request:** read the summary table in its description, check the new values look plausible, and merge. Merging deploys the site.

- **`held`:** the source moved more than the fetcher allows in one step. Check the source. Merging records the candidate under `pending`, and the next run applies it if the source still agrees. To apply it straight away, set the value in `data/auto.json` by hand, delete its `pending` entry, then run `npm run data:merge`.
- **`stale`:** the source has failed for longer than the maximum age. The previous value stays in use. Fix the fetcher, or temporarily set the value in `data/overrides.json`.

All actions are pinned to full commit SHAs, with the version in a trailing comment. To upgrade one, look up the new tag's commit (`gh api repos/<owner>/<action>/git/ref/tags/<tag>`; if the result's type is `tag`, follow it with `gh api repos/<owner>/<action>/git/tags/<sha>`) and update both the SHA and the comment.

## Regular upkeep

Most defaults are maintained by hand. Follow [Updating values by hand](data.md#updating-values-by-hand) for each change.

| When | What | Where to look |
|---|---|---|
| At the start of each quarter | **IRCC.** The value for quarter T applies from the start of quarter T+2. Update `validUntil` to the last day of the quarter it applies to; `data:merge` warns once that date has passed. | [BNR IRCC page](https://www.bnr.ro/1974-indicele-de-referinta-pentru-creditele-consumatorilor) |
| Every 3 months | Mortgage rates and bank margins | BNR new-loan interest statistics; major banks' product sheets |
| Every 3–6 months | City prices (€/m², new and existing) and rents | Storia, imobiliare.ro and apartamente.org monthly reports |
| Every January | Taxes: property tax, sale tax and investment tax; notary and land-registry fees | Codul fiscal, ANAF, PwC Tax Summaries for Romania |
| Once a year | Long-run assumptions: inflation and the real parts of property growth, rent growth, investment returns and long-run IRCC; upkeep rate | BNR inflation report, Eurostat house price index |
| Once a year | Insurance costs, typical rental deposit | PAD tariffs, insurers, press |
| When announced | Noua Casă terms (a preset was postponed until the 2027 terms are known) | FNGCIMM, Ministry of Finance |

`data/SOURCES.md` has the current value, source and date for each item. When you update a value, update its row there too.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| The `deploy` job fails | Pages source isn't set to GitHub Actions | Set it in Settings → Pages, then re-run the workflow |
| Data workflow fails with "not permitted to create or approve pull requests" | The Actions permission is off | Enable it in Settings → Actions → General |
| Footer shows the exchange rate with "date vechi" | The BNR value is older than 10 days: the fetch has been failing, rejected or held | Check the latest data-update runs' summaries; run `npm run data:fetch` locally to see the error |
| Data workflow fails in `stale-alert` | Same as above | Same as above |
| Summary shows `held` every week | The candidate was never merged, so each run records it again | Merge the data pull request, or apply the value by hand |
| `npm run data:merge` stops with "Missing required value" | A key was removed from both data files, or a fetch failed with no previous value | Add it back to `data/overrides.json` |
| `npm run data:merge` stops with "Invalid data" | A value is malformed or implausible; each line names the key | Fix the entry. Rates are decimals: `0.0557`, not `5.57`. |
| `data:merge` warns "was only valid until" | A `validUntil` date has passed | Update the value from its source and move `validUntil` forward |
| A Vitest module "can't be found" right after creating it | Stale Vitest cache | `npx vitest --clearCache` |
| GitHub warns that actions target Node.js 20 | The pinned actions are on older major versions (newer majors exist) | Harmless for now (GitHub runs them on Node 24). Upgrade them as described in [The weekly data update](#the-weekly-data-update), one at a time. |

## Local environment notes

- Use the Node version in `.nvmrc` (24), e.g. `nvm use`.
- Older npm versions bundled with Node 23 have crashed while installing this project's dependencies. If that happens, use a newer npm: `npx npm@11 ci`.
- `pipeline-summary.md` is generated by the data scripts and is git-ignored.

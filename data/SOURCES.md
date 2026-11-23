# Default values: sources and reasoning

Checked on 2026-11-23. Values live in `data/overrides.json` (hand-maintained) and `data/auto.json` (written by the pipeline; overrides win). Rates are decimals in the JSON (`0.055` = 5.5%).

Every default is a starting point for the user, not a forecast. Values marked **estimate** have no single authoritative source; the reasoning is below.

## Loan and purchase

| Key | Value | Source | Notes |
|---|---|---|---|
| `eurRon` | 5.3485 | [BNR reference rate](https://curs.bnr.ro/nbrfxrates.xml), 2026-11-23 | Refreshed automatically once the pipeline runs. |
| `ircc` | 5.57% | [BNR, IRCC page](https://www.bnr.ro/1974-indicele-de-referinta-pentru-creditele-consumatorilor): quarterly index 2026T2 | The index computed for a quarter applies two quarters later, so 2026T2 applies 2026-10-01 to 2026-12-31. **5.61% applies from 2027-01-01** (reported by [cursbnr.ro](https://www.cursbnr.ro/ircc); not yet on BNR's page on 2026-11-23): update on or after that date. |
| `fixedRate` | 5.5% | BNR average rate on new RON housing loans: 5.6% (Sep 2026), via [Financiarul](https://financiarul.ro/finante-si-banci/costul-anual-mediu-al-creditelor-noi-pentru-locuinte-in-lei-a-scazut-la-6-35-de-la-7-60-acum-un-an/) | Bank offers range 4.65–6.4%; the lowest require salary transfer and other conditions. |
| `fixedYears` | 5 | Common 3–5 year fixed offers ([ipotecare.ro via cursbnr](https://www.cursbnr.ro/dobanda-medie-credite-ipotecare-lei)) | |
| `variableMargin` | 2.5% | Bank margins 1.9–3.5% over IRCC; ipotecare.ro average variable rate (8.05% vs IRCC 5.56%, Aug 2026) implies ~2.5% | |
| `downPaymentPct` | 15% | [BNR Regulation 17/2012](https://www.avocatnet.ro/articol_31655/Regulamentul-BNR-nr-17-2012-unele-conditii-de-creditare.html): LTV cap 85% for RON loans | Banks may ask 25% if the buyer already owns a home. Noua Casă (state-guaranteed) allows 5% up to €70k; not added as a preset because the 2026 guarantee ceiling ends 2026-12-31 and changes are pending in Parliament. |
| `loanTermYears` | 30 | BCR Casa Mea product sheet (2026-09-21) | |
| `lifeInsurancePct` | 0.31%/year | BCR Casa Mea: 0.026% per month of the balance | Other lenders 0.026–0.035%/month (financer.ro). |
| `notaryPct` | 1.2% | Minimum notary fees, Ord. 177/C/2024 (via [notari.pro](https://notari.pro/calculator-taxe-notariale)), incl. 21% VAT | The scale is progressive: about 1.49% at 300k lei, 1.33% at 500k, 1.15% at 800k (with VAT). 1.2% fits typical 450k–1M lei apartments. Notaries may charge above the minimum. |
| `registryPct` | 0.15% | [ANCPI Order 16/2019](https://sj.ancpi.ro/tarife-servicii/) | Individuals; minimum 60 lei. |
| `bankFees` | 2,000 lei | BCR Casa Mea: 900 lei analysis + 590 lei valuation; plus mortgage registration (100 lei + 0.1% of the loan) | Some banks charge 0 for analysis. |

## Ownership and sale

| Key | Value | Source | Notes |
|---|---|---|---|
| `propertyTaxPct` | 0.05% of market value | **Estimate.** Codul fiscal art. 457 (as amended by [Law 239/2025](https://static.anaf.ro/static/10/Anaf/legislatie/L_239_2025.pdf)) | The legal rate is 0.08–0.2% (set by each council; 0.1% in Bucharest), but it applies to a statutory taxable value (m² × a statutory value per m², adjusted for zone and age), well below market price. 0.05% of market value is an approximation; real bills vary by locality and building. |
| `homeInsuranceAnnual` | 400 lei | PAD type A: 130 lei/year ([Pago](https://blog.pago.ro/cat-costa-pad-in-2026-preturi-tipuri-de-locuinta-si-ce-platesti-de-fapt/), padrom.ro) + optional policy ~150–700 lei (press estimate) | |
| `maintenancePct` | 1% | **Estimate.** Common rule of thumb | |
| `saleTaxShortPct` / `saleTaxLongPct` / `saleTaxShortHoldYears` | 3% / 1% / 3 years | Codul fiscal art. 111 ([PwC Tax Summaries](https://taxsummaries.pwc.com/romania/individual/income-determination)) | Applies to the full sale value (or the notary grid value if higher), not the gain. No exempt threshold since 2023. |
| `saleAgencyPct` | 2% | **Estimate.** Typical seller-side agency fee | |

## Renting

| Key | Value | Source | Notes |
|---|---|---|---|
| `depositMonths` | 1 | [Spotmedia, 2026-02-21](https://spotmedia.ro/stiri/casa-si-gradina/cat-costa-de-fapt-sa-inchiriezi-un-apartament-in-2026-taxe-garantii-si-comisioane-ascunse) | Some Bucharest landlords ask 2–3. |
| `renterInsuranceAnnual` | 150 lei | **Estimate.** No published tenant policy prices found | |

## Investing

| Key | Value | Source | Notes |
|---|---|---|---|
| `investReturn` | 6% | **Estimate.** Balanced long-term portfolio, nominal | |
| `investTaxRate` | 10% | Chosen between the 2026 rates ([PwC](https://taxsummaries.pwc.com/romania/individual/income-determination)) | 3% via a Romanian broker for holdings over a year, 6% under a year; 16% via a foreign broker; 16% on dividends. CASS may also apply above income thresholds, not modelled. |
| `savingsRate` | 4% | **Estimate.** | 12-month RON deposits pay ~5.0–5.5% at large banks today (BNR average 5.07%, Sep 2026). Expected to fall as inflation falls; 4% is a long-run figure. |
| `savingsTaxRate` | 10% | Codul fiscal, tax on interest ([PwC](https://taxsummaries.pwc.com/romania/individual/income-determination)) | Withheld by the bank. |

## Long-run assumptions

| Key | Value | Reasoning |
|---|---|---|
| `inflation` | 3.5% | CPI is 6.9% y/y (INS, Oct 2026). BNR forecasts 7.4% at end-2026 and 3.7% at end-2027 (Inflation Report, Nov 2026) and targets 2.5% ±1pp. 3.5% averages a few high years with a long period near target. |
| `propertyGrowth` | 4% | Eurostat house price index for Romania: +5.1%/yr in RON 2015–2025, against 4.8%/yr consumer inflation, i.e. roughly inflation + 0.5pp. Applied to 3.5% inflation. |
| `rentGrowth` | 3.5% | Eurostat HICP actual rentals: +4.6%/yr 2015–2025, close to inflation. Set equal to the inflation default. |

## Cities (€/m², asking prices)

| City | New | Existing | Rent / month |
|---|---|---|---|
| București | 1,982 | 2,260 | 11.0 |
| Cluj-Napoca | 3,340 | 3,286 | 10.3 |
| Timișoara | 2,081 | 2,023 | 8.2 |
| Iași | 1,919 | 2,004 | 8.6 |
| Brașov | 2,331 | 2,344 | 9.4 |
| Constanța | 2,257 | 2,106 | 9.3 |
| Oradea | 2,027 | 1,888 | 7.0 |
| Sibiu | 2,020 | 2,066 | 7.7 |
| National | 2,019 | 2,019 | 8.1 (estimate) |

- Sale prices (new / existing): [Storia analysis, July 2026](https://www.storia.ro/blog/newsroom/analiza-storia-preturile-apartamentelor-au-crescut-in-medie-cu-6-fata-de-anul-trecut-si-s-au-mentinut-relativ-stabile-fata-de-iunie). Average asking prices for 1–3 room flats.
- Rent: [apartamente.org index, November 2026](https://apartamente.org/raport-piata). Median asking rent, deduplicated across portals. The November edition was still being recalculated until 2026-12-01.
- National sale price: imobiliare.ro index, September 2026 (via [Financiarul](https://financiarul.ro/economie/apartamentele-din-romania-au-fost-scoase-la-vanzare-cu-4-5-mai-scump-decat-acum-un-an/)), not split by new/existing, so used for both.
- National rent is an **estimate**: the national price × the average gross rental yield of the eight cities (4.83%/year) ÷ 12.

Known oddities, kept as published:
- București new builds come out cheaper than existing flats, probably because new supply is mostly on the outskirts.
- Cluj rent looks low relative to its prices (3.8% gross yield vs ~5% elsewhere).
- Storia reports averages; imobiliare.ro and apartamente.org report medians. Brașov new builds differ most between sources (2,331 vs ~2,800).
- Asking prices are above transaction prices; the negotiation discount is not published.

## Automated collection

- **BNR exchange rate** (`eurRon`): fetched by the scheduled pipeline from the official XML feed (`curs.bnr.ro/nbrfxrates.xml`).
- **IRCC** (`ircc`): **kept manual.** BNR publishes it only on an HTML page whose tables are loaded by the site's internal CMS endpoint (an undocumented POST with page-specific block ids), with no XML, CSV or other machine-readable file. That endpoint can change whenever the page is edited, so it isn't a stable source to automate. Third-party copies (cursbnr.ro etc.) are not scraped. Update it by hand each quarter: the value for quarter T applies from the start of quarter T+2.
- **Inflation** (`inflation`): **kept manual on purpose.** It is a long-run assumption, not the current CPI, so auto-filling it from INS would be wrong.
- **imobiliare.ro**: robots.txt blocks search pages and most filter parameters; third parties report anti-bot protection. Terms of use could not be read. **Not scraped.**
- **storia.ro**: robots.txt allows most paths (`Content-Signal: ai-train=no`). Terms of use could not be read. **Not scraped.**
- City prices and rents are therefore updated by hand from the published reports above, with attribution.

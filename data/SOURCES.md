# Default values: sources and reasoning

Checked on 2026-11-23 (full audit of every default on that date). Values live in `data/overrides.json` (hand-maintained) and `data/auto.json` (written by the pipeline; overrides win). Rates are decimals in the JSON (`0.055` = 5.5%).

Every default is a starting point for the user, not a forecast. Values marked **estimate** have no single authoritative source; the reasoning is below.

## Loan and purchase

| Key | Value | Source | Notes |
|---|---|---|---|
| `eurRon` | 5.3485 | [BNR reference rate](https://curs.bnr.ro/nbrfxrates.xml), 2026-11-23 | Refreshed automatically once the pipeline runs. |
| `ircc` | 5.57% | [BNR, IRCC page](https://www.bnr.ro/1974-indicele-de-referinta-pentru-creditele-consumatorilor): quarterly index 2026T2 | The index computed for a quarter applies two quarters later, so 2026T2 applies 2026-10-01 to 2026-12-31 (`validUntil: 2026-12-31`; the merge warns after that). **Unverified:** [cursbnr.ro](https://www.cursbnr.ro/ircc), a third-party site, lists 5.61% from 2027-01-01; this was not on BNR's own page on 2026-11-23. Confirm it on the BNR page before updating, on or after that date. |
| `irccLongRun` | 4.5% | **Assumption, not a forecast.** Long-run inflation (3.5%) plus about 1pp; plausible range 3.5–5.5% | No published IRCC or ROBOR forecast goes past 2027. BNR forecasts inflation of 3.7% at end-2027 and 2.5% from Q3 2028 ([Inflation Report, Nov 2026](https://www.economica.net/?p=995886)); EC autumn 2026: HICP 4.4% (2027), 3.8% (2028); CNSP: 3.0% at end-2028. Policy rate 6.50%, deposit facility 5.50%; RON bonds 6.55% (21 months) to 7.11% (10 years), 2026-11-02. IRCC history 5.55–6.06% in 2023–2026. The engine moves IRCC from `ircc` to this level over three years. |
| `fixedRate` | 5.9% | 5-year fixed rate for a typical buyer (15% down, energy class B/C, salary paid into the bank, life insurance), Nov 2026: BT 5.45, Raiffeisen 5.70, BCR 5.79–5.99 ([own product sheet](https://www.bcr.ro/content/dam/ro/bcr/www_bcr_ro/Persoane-fizice/Credite/casa-mea/CASA-MEA-BCR-RON.pdf), 2026-10-01), ING 5.89, UniCredit 5.90, Patria 5.99, Garanti 6.45; median about 5.9% ([ifink.ro](https://ifink.ro/top-dobanzi-credite-ipotecare/), which matched BCR's own sheet) | Headline rates on comparison sites need conditions most buyers miss: BCR's 5.79% needs its Max tier (income ≥ 10k lei); ING's 5.29% needs a loan over 400k, over 40% down and class A. BT's page couldn't be read, and ifink's BT row contradicts itself about class A. The BNR average for new loans (5.6%, Sep 2026) is not a good proxy: it mixes in 3-year promotional fixes and green loans. |
| `fixedYears` | 5 | Common 3–5 year fixed offers ([ipotecare.ro via cursbnr](https://www.cursbnr.ro/dobanda-medie-credite-ipotecare-lei)) | |
| `variableMargin` | 2.4% | Margin after the fixed period for a typical buyer with salary transfer, Nov 2026: BT 2.20, BCR 2.30 (own sheet), Raiffeisen 2.35, UniCredit 2.40, Garanti 2.40, ING 2.49, Patria 2.50; median about 2.4% | Without salary transfer about 3.5% (BCR sheet: 3.50%). 2.2% is the best case (BT, or class A). |
| `downPaymentPct` | 15% | [BNR Regulation 17/2012](https://www.avocatnet.ro/articol_31655/Regulamentul-BNR-nr-17-2012-unele-conditii-de-creditare.html): LTV cap 85% for RON loans | Banks may ask 25% if the buyer already owns a home. Noua Casă (state-guaranteed) allows 5% up to €70k; not added as a preset because the 2026 guarantee ceiling ends 2026-12-31 and changes are pending in Parliament. |
| `loanTermYears` | 30 | BCR Casa Mea product sheet (2026-09-21) | |
| `lifeInsurancePct` | 0.31%/year | BCR Casa Mea: 0.026% per month of the balance | Other lenders 0.026–0.035%/month (financer.ro). |
| `notaryPct` | 1.2% | Minimum notary fees, Ord. 177/C/2024 (via [notari.pro](https://notari.pro/calculator-taxe-notariale)), incl. 21% VAT | The scale is progressive: about 1.49% at 300k lei, 1.33% at 500k, 1.15% at 800k (with VAT). 1.2% fits typical 450k–1M lei apartments. Notaries may charge above the minimum. |
| `registryPct` | 0.15% | [ANCPI Order 16/2019](https://sj.ancpi.ro/tarife-servicii/) | Individuals; minimum 60 lei. |
| `buyerAgencyPct` | 2.42% | Typical buyer commission 2% + 21% VAT ([Financiarul](https://financiarul.ro/constructii/comisioanele-imobiliare-ajung-la-4-plus-tva-de-21-ce-costuri-trebuie/)) | Existing homes. Commissions run 2–3% + VAT per side; about 1.5% is negotiable above €250k. Set it to 0 for a direct purchase. |
| `buyerAgencyPctNew` | 0% | **Estimate.** New builds are usually bought from the developer, without an agent | |
| `negotiationPct` | 3.75% | imobiliare.ro negotiation margin (last asking price vs declared transaction price), Q4 2025: Bucharest 3.6%, Cluj 4.5%, Brașov 3.9%, Timișoara 3.7%, Constanța 3.6%, Iași 3.6% (Știri pe surse, 2026-02-10); Q2 2025: 2.5–4.8% ([Economedia](https://economedia.ro/analiza-imobiliara-apartamentele-s-au-vandut-mai-rapid-in-trimestrul-ii-dar-preturile-s-au-negociat-mai-mult.html)) | The only measured source; no 2026 quarter found. It compares the last asking price with the sale price of the same flat, so it misses listings that never sell; that extra gap can't be measured from public data. Transaction prices (Eurostat HPI, +12.1% y/y in Q2 2026 in lei) rose at least as fast as asking prices (+5.7–6% in euros), so the gap isn't widening. |
| `bankFees` | 1,800 lei | BCR and ING: 900 lei analysis + 590–803 lei valuation + 100 lei fixed mortgage registration + RNPM 88.40 lei ([ING](https://ing.ro/persoane-fizice/credite/ipotecar), BCR sheet) | Some banks charge 0 for analysis. The engine adds two loan-based fees on top (`mortgageSetupCosts()`): ANCPI registration of 0.1% of the loan, and the notary's minimum fee for the mortgage contract under OMJ 177/C/2024, 750 lei for loans up to 500k lei and 1,500 lei above, plus 21% VAT (as reported by economica.net; the order's text wasn't checked). A 450k loan comes to about 3,100 lei in total. |

## Ownership and sale

| Key | Value | Source | Notes |
|---|---|---|---|
| `propertyTaxSqm` | 8.8 lei/m²/year (București 9.2, Iași 7.0) | Codul fiscal art. 457 as amended by [Law 239/2025](https://static.anaf.ro/static/10/Anaf/legislatie/L_239_2025.pdf): usable m² × 1.4 × 2,677 lei × zone coefficient × local rate | Zone coefficients: București (rank 0) A 2.6 / D 2.3; rank I cities A 2.5 / D 2.2; the default uses the midpoint. Local rate 0.1% (Timișoara HCLMT 719/2025; Cluj and Brașov bills fit it exactly; București from the press), 0.08% in Iași (inferred from published bills). Oradea and Sibiu use the default, unverified. Check against bills: București 60 m², zone A, 578 lei (default gives 552); Cluj 55 m², zone A, 515 lei (default 484). The tax depends on area and zone, not on price, and the engine indexes it with inflation each year (Codul fiscal art. 491; not re-checked after Law 239/2025). A 10% discount for paying by 31 March isn't modelled. |
| `homeInsuranceAnnual` | 130 lei | PAD type A (concrete/brick), [padrom.ro](https://www.padrom.ro/) | Mandatory. |
| `homeInsurancePct` | 0.07% of value/year | ING: optional policy at 0.10% of the insured sum per year ([ING](https://ing.ro/persoane-fizice/credite/ipotecar)); market range 150–700 lei/year for an apartment (Playtech, 2026-01-05) | The insured sum is usually the rebuild cost or the loan balance, below market value, so 0.10% of market value overstates it. Banks require the policy, assigned to them, for the life of the loan. |
| `maintenancePct` | 0.75% | **Estimate**, including refitting the flat every 15–25 years | Eurostat national accounts: Romanian households spent €1.66bn on minor dwelling repairs in 2022 (CP043), roughly 0.2–0.3% of the housing stock's value; major repairs count as investment and are excluded. Law 196/2018 requires a building repair fund but sets no amount. Land and location are roughly 40–60% of an apartment's value, so 0.75% of the total is about 1.5% of the structure per year. |
| `saleTaxShortPct` / `saleTaxLongPct` / `saleTaxShortHoldYears` | 3% / 1% / 3 years | Codul fiscal art. 111 ([PwC Tax Summaries](https://taxsummaries.pwc.com/romania/individual/income-determination)) | Applies to the full sale value (or the notary grid value if higher), not the gain. No exempt threshold since 2023. |
| `saleAgencyPct` | 2% | **Estimate.** Typical seller-side agency fee | |

## Renting

| Key | Value | Source | Notes |
|---|---|---|---|
| `depositMonths` | 1 | [Spotmedia, 2026-02-21](https://spotmedia.ro/stiri/casa-si-gradina/cat-costa-de-fapt-sa-inchiriezi-un-apartament-in-2026-taxe-garantii-si-comisioane-ascunse) | Some Bucharest landlords ask 2–3. |
| `rentAgencyPct` | 50% of a month's rent | Common agency fee for tenants (listings; [Spotmedia](https://spotmedia.ro/stiri/casa-si-gradina/cat-costa-de-fapt-sa-inchiriezi-un-apartament-in-2026-taxe-garantii-si-comisioane-ascunse)) | Paid once, not refunded. 0 when renting directly from the owner; 100% also occurs. |
| `renterInsuranceAnnual` | 150 lei | **Estimate.** No published tenant policy prices found | |

## Investing

| Key | Value | Source | Notes |
|---|---|---|---|
| `investReturn` | 7% | **Estimate.** Global equity ETF, nominal, in lei | JPM 2027 LTCMA: global equity 7.5%/yr in USD over 10–15 years ([JPM](https://am.jpmorgan.com/us/en/asset-management/institutional/about-us/media/press-releases/jp-morgan-releases-2027-long-term-capital-market-assumptions/)); Vanguard (2026-09-30, USD): developed ex-US 5.3–7.3%, US 4.8–6.8%; Amundi (Apr 2026): dynamic portfolio 6.4–6.9% for EUR investors. EUR/RON rose 1.7%/yr 2005–2025 (Eurostat). MSCI ACWI in EUR returned 12.2%/yr over 10 years and 6.6%/yr since Dec 2000 (factsheet, 2026-10-30); the recent decade rode rising valuations (P/E 20.8). Less ~0.15–0.2% fund costs. A balanced or cautious portfolio would be 5–6%. |
| `investTaxRate` | 3% | [Law 239/2025](https://static.anaf.ro/static/10/Anaf/legislatie/L_239_2025.pdf), art. 97(8¹): gains via a Romanian broker on holdings over 365 days, withheld at source, final | 6% for holdings under a year; 16% of the net annual gain via a foreign broker (art. 123(1²)); 16% on dividends from 2026 (Law 141/2025). CASS (a stepped amount capped at 9,720 lei/yr above 6 minimum wages of investment income) is not modelled. |

## Long-run assumptions

| Key | Value | Reasoning |
|---|---|---|
| `inflation` | 3.5% | CPI is 6.9% y/y (INS, Oct 2026). BNR forecasts 7.4% at end-2026 and 3.7% at end-2027 (Inflation Report, Nov 2026) and targets 2.5% ±1pp. 3.5% averages a few high years with a long period near target. |
| `propertyGrowth` | 4% | Eurostat house price index for Romania: +5.1%/yr in RON 2015–2025, against 4.8%/yr consumer inflation, i.e. roughly inflation + 0.5pp. Applied to 3.5% inflation. From the 2009 peak, prices fell 25% nominal by 2014 and remain about 34% lower in real terms in 2025, so a long horizon also carries crash risk the fixed rate doesn't show. |
| `rentGrowth` | 3.5% | Eurostat HICP actual rentals: +4.58%/yr 2015–2025 against +4.81%/yr CPI, i.e. about inflation. Set equal to the inflation default. Don't use HICP rents for 2026 onward: the index jumped 33.5% in April 2026 when state-housing rents (about 26% of its weight) were raised by HG 193/2026, while private asking rents moved −3% to +8% ([Economedia](https://economedia.ro/analiza-anomalia-din-statistica-oficiala-cum-au-ajuns-chiriile-sa-creasca-cu-33-intr-o-singura-luna-dupa-ce-locuintele-statului-au-primit-o-pondere-de-26-in-indice.html)). |

## Cities (€/m², asking prices)

| City | New | Existing | Rent / month |
|---|---|---|---|
| București | 2,636 | 2,259 | 11.0 |
| Cluj-Napoca | 3,316 | 3,316 | 10.3 |
| Timișoara | 1,984 | 1,984 | 8.2 |
| Iași | 2,000 | 2,000 | 8.6 |
| Brașov | 2,724 | 2,246 | 9.4 |
| Constanța | 2,020 | 2,020 | 9.3 |
| Oradea | 1,885 | 1,885 | 7.0 |
| Sibiu | 2,034 | 2,034 | 7.7 |
| National | 2,019 | 2,019 | 8.1 (estimate) |

- Sale prices: **imobiliare.ro** throughout, so every city uses one source and one method (median asking price per m² of usable area, top and bottom 2.5% trimmed).
  - București and Brașov: the new/existing split from imobiliare.ro, early summer 2026 (via [HotNews, 2026-07-01](https://hotnews.ro/?p=2289192)). "New" means blocks finished in the last five years. These are the only cities with an exact published split.
  - Every other city: the all-apartment median for September 2026 (via [Revista Biz](https://www.revistabiz.ro/bucurestiul-devanseaza-brasovul-in-topul-preturilor-la-apartamente-clujul-ramane-cel-mai-scump/) and [AGERPRES](https://agerpres.ro/english/2026/10/29/apartment-prices-in-romania-register-5pct-increase-on-average-in-2026-analysis--1608028)), used for both types. No newer split by city was found; imobiliare.ro's own site couldn't be read.
- Rent: [apartamente.org index, November 2026](https://apartamente.org/raport-piata). Median asking rent, deduplicated across portals. **Provisional:** the figures were read on 2026-11-23 (their `asOf`), while the November edition was still being recalculated until 2026-12-01. Re-check them after that date; the final figures may differ.
- National sale price: imobiliare.ro index, September 2026 (via [Financiarul](https://financiarul.ro/economie/apartamentele-din-romania-au-fost-scoase-la-vanzare-cu-4-5-mai-scump-decat-acum-un-an/)), not split by new/existing, so used for both.
- National rent is an **estimate**: the national price × the average gross rental yield of the eight cities (4.83%/year) ÷ 12.

How the price sources compare (all are asking prices; no public source gives transaction €/m² by city):

| Source | Method | Verdict |
|---|---|---|
| imobiliare.ro | Median, trimmed, usable area stated explicitly, all cities | Used. Most consistent. |
| Storia | Average, one portal; usable area typed by sellers and not checked; doesn't disclose deduplication, the definition of "new", or VAT | Existing flats 0–5% above imobiliare.ro. New builds far below it in București (1,982 vs 2,636) and Brașov (2,331 vs 2,724), likely from a wider "new" definition, prices without VAT and balconies counted in the area. Not used. |
| apartamente.org | Median, 16 portals, duplicates removed, public corrections log; mixes built and usable area | Prices within 1–4% of imobiliare.ro. Used for rents. |
| INS / Eurostat HPI | Notarised transactions, hedonic | Index only, no €/m²; only București vs the rest. Useful to roll levels forward. |
| Deloitte Property Index | Derived from imobiliare.ro, a year old | Not independent. |
| Notary grids, Numbeo | Lagging minimums; crowd-sourced | Not usable. |

How the rent sources compare (all asking rents; no public source of signed rents, and ANAF publishes no averages from registered leases):

| City | App (apartamente.org) | Others (apartamente.org 2-room, Storia, imobiliare.ro, Deloitte) |
|---|---|---|
| București | 11.0 | 10.6–11.5 |
| Cluj | 10.3 | 10.3–11.2 |
| Timișoara | 8.2 | 8.2–8.5 |
| Iași | 8.6 | 8.3–8.7 |
| Brașov | 9.4 | 9.3–10.0 |
| Constanța | 9.3 | 9.6 |
| Oradea | 7.0 | 7.7 (Storia only) |
| Sibiu | 7.7 | 7.7 |

The figures in the second column assume 52 m² for a 2-room flat. In November, 15.7% of rental listings cut their price within 30 days (median cut 7.5%), so signed rents are probably a few percent below asking; the app applies no discount and says so in the rent help text. November is near the seasonal low after the September student peak (about ±4%).

Known oddities, kept as published:
- Cluj rent looks low relative to its prices (3.8% gross yield vs ~5% elsewhere); Storia's July 2026 2-room average (€599) suggests ~10.9–11.5 €/m², about 5–10% above the apartamente.org median. Kept as published. Storia reports similar yields (Bucharest 6.2%, Cluj 3.9%, June 2026).
- Prices (imobiliare.ro) and rents (apartamente.org) come from different sources. Mixing sources can shift yields by a few tenths of a percentage point (Storia prices with apartamente.org rents lowered them by 0.15–0.37pp); apartamente.org's own prices are within 1–4% of imobiliare.ro, so the bias here should be small.
- All prices are per m² of **usable** area without balconies; the size field says so. Built area is commonly 15–30% larger, so typing it would overstate the price.
- Asking prices are above transaction prices; `negotiationPct` (3.75%) is subtracted from the default price.
- Rents are scaled to the chosen size with a 0.72 power around 55 m² (fitted to apartamente.org room-by-room medians in Cluj, Timișoara, Brașov and Iași: 0.61–0.76) (see `docs/data.md`), since rent per m² falls for larger flats.

### VAT on new builds (unverified)

The calculator treats every price as the total the buyer pays, VAT included. Whether that holds for the new-build figures is **not verified**:

- Storia's [July 2026 analysis](https://www.storia.ro/blog/newsroom/analiza-storia-preturile-apartamentelor-au-crescut-in-medie-cu-6-fata-de-anul-trecut-si-s-au-mentinut-relativ-stabile-fata-de-iunie) says only that it uses "prețurile medii solicitate de vânzători în anunțurile publicate pe Storia". It does not mention VAT.
- Storia's [guide to new-home costs](https://www.storia.ro/blog/uncategorized/costurile-unei-locuinte-noi) (October 2026) tells buyers to "verifică dacă prețul din ofertă include TVA", so listings evidently differ. Some listings state "TVA inclus".
- Standard VAT on new homes is 21%. The transitional 9% rate ended with deliveries by 2026-09-30 (Law 161/2026, as reported by [StartupCafe](https://startupcafe.ro/termenul-pentru-tva-de-9-la-locuinte-prelungit-oficial-descarca-legea-161-2026-ce-aduce-nou-si-cine-poate-cere-restituirea-diferentei-de-tva-104534) on 2026-08-04 and cabinetexpert.ro on 2026-08-25; not checked against the law's text), so every new contract now carries 21%.
- Buyer guides say many developers advertise prices without VAT. Neither Storia, imobiliare.ro nor apartamente.org says how its index treats VAT. SVN, which tracks developer prices in one submarket, quotes them without VAT.

If a large share of new-build listings is net of VAT, new-build prices here are too low by up to 21%. The values are kept as published; the price field's help text tells users to check whether an offer includes VAT. Existing homes sold by individuals are generally outside VAT, so their prices should be unaffected.

## Automated collection

- **BNR exchange rate** (`eurRon`): fetched by the scheduled pipeline from the official XML feed (`curs.bnr.ro/nbrfxrates.xml`).
- **IRCC** (`ircc`): **kept manual.** BNR publishes it only on an HTML page whose tables are loaded by the site's internal CMS endpoint (an undocumented POST with page-specific block ids), with no XML, CSV or other machine-readable file. That endpoint can change whenever the page is edited, so it isn't a stable source to automate. Third-party copies (cursbnr.ro etc.) are not scraped. Update it by hand each quarter: the value for quarter T applies from the start of quarter T+2.
- **Inflation** (`inflation`): **kept manual on purpose.** It is a long-run assumption, not the current CPI, so auto-filling it from INS would be wrong.
- **imobiliare.ro**: robots.txt blocks search pages and most filter parameters; third parties report anti-bot protection. Terms of use could not be read. **Not scraped.**
- **storia.ro**: robots.txt allows most paths (`Content-Signal: ai-train=no`). Terms of use could not be read. **Not scraped.**
- City prices and rents are therefore updated by hand from the published reports above, with attribution.

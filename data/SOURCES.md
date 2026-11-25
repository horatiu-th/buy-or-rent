# Default values: sources and reasoning

Checked on 2026-11-23 (full audit of every default on that date) and revised on 2026-11-24 after a second audit; the revision is summarised under [Changes after the second audit](#changes-after-the-second-audit). On 2026-11-25 the new/existing split was dropped in favour of one all-apartment price per city; see [One price per city](#one-price-per-city). Values live in `data/overrides.json` (hand-maintained) and `data/auto.json` (written by the pipeline; overrides win). Rates are decimals in the JSON (`0.055` = 5.5%).

Every default is a starting point for the user, not a forecast. Values marked **estimate** have no single authoritative source; the reasoning is below.

## Loan and purchase

| Key | Value | Source | Notes |
|---|---|---|---|
| `eurRon` | 5.3485 | [BNR reference rate](https://curs.bnr.ro/nbrfxrates.xml), 2026-11-23 | Refreshed automatically once the pipeline runs. |
| `ircc` | 5.57% | [BNR, IRCC page](https://www.bnr.ro/1974-indicele-de-referinta-pentru-creditele-consumatorilor): quarterly index 2026T2 | The index computed for a quarter applies two quarters later, so 2026T2 applies 2026-10-01 to 2026-12-31 (`validUntil: 2026-12-31`; the merge warns after that). **Unverified:** [cursbnr.ro](https://www.cursbnr.ro/ircc), a third-party site, lists 5.61% from 2027-01-01; this was not on BNR's own page on 2026-11-23. Confirm it on the BNR page before updating, on or after that date. |
| `irccLongRunSpread` | +1 pp over inflation (4.5% at the 3.5% default) | **Assumption, not a forecast.** Long-run IRCC = inflation plus about 1 pp; plausible range 3.5–5.5% at today's inflation default | Linked to inflation, so changing inflation moves it (unless edited). No published IRCC or ROBOR forecast goes past 2027. BNR forecasts inflation of 3.7% at end-2027 and 2.5% from Q3 2028 ([Inflation Report, Nov 2026](https://www.economica.net/?p=995886)); EC autumn 2026: HICP 4.4% (2027), 3.8% (2028); CNSP: 3.0% at end-2028. Policy rate 6.50%, deposit facility 5.50%; RON bonds 6.55% (21 months) to 7.11% (10 years), 2026-11-02: the bond market prices higher rates than this, which the IRCC row of the sensitivity table shows. IRCC history 5.55–6.06% in 2023–2026. The engine moves IRCC from `ircc` to this level over three years. |
| `fixedRate` | 5.9% | 5-year fixed rate for a typical buyer (15% down, energy class B/C, salary paid into the bank, life insurance), Nov 2026: BT 5.45, Raiffeisen 5.70, BCR 5.79–5.99 ([own product sheet](https://www.bcr.ro/content/dam/ro/bcr/www_bcr_ro/Persoane-fizice/Credite/casa-mea/CASA-MEA-BCR-RON.pdf), 2026-10-01), ING 5.89, UniCredit 5.90, Patria 5.99, Garanti 6.45; median about 5.9% ([ifink.ro](https://ifink.ro/top-dobanzi-credite-ipotecare/), which matched BCR's own sheet) | Headline rates on comparison sites need conditions most buyers miss: BCR's 5.79% needs its Max tier (income ≥ 10k lei); ING's 5.29% needs a loan over 400k, over 40% down and class A. BT's page couldn't be read, and ifink's BT row contradicts itself about class A. The BNR average for new loans (5.6%, Sep 2026) is not a good proxy: it mixes in 3-year promotional fixes and green loans. |
| `fixedYears` | 5 | Common 3–5 year fixed offers ([ipotecare.ro via cursbnr](https://www.cursbnr.ro/dobanda-medie-credite-ipotecare-lei)) | |
| `variableMargin` | 2.4% | Margin after the fixed period for a typical buyer with salary transfer, Nov 2026: BT 2.20, BCR 2.30 (own sheet), Raiffeisen 2.35, UniCredit 2.40, Garanti 2.40, ING 2.49, Patria 2.50; median about 2.4% | Without salary transfer about 3.5% (BCR sheet: 3.50%). 2.2% is the best case (BT, or class A). |
| `downPaymentPct` | 15% | [BNR Regulation 17/2012](https://www.avocatnet.ro/articol_31655/Regulamentul-BNR-nr-17-2012-unele-conditii-de-creditare.html): LTV cap 85% for RON loans | Banks may ask 25% if the buyer already owns a home. Noua Casă (state-guaranteed) allows 5% up to €70k; not added as a preset because the 2026 guarantee ceiling ends 2026-12-31 and changes are pending in Parliament. |
| `loanTermYears` | 30 | BCR Casa Mea product sheet (2026-09-21) | |
| `lifeInsurancePct` | 0.31%/year | BCR Casa Mea: 0.026% per month of the balance | Other lenders 0.026–0.035%/month (financer.ro). |
| `notaryPct` | 1.2% | Minimum notary fees, Ord. 177/C/2024 (via [notari.pro](https://notari.pro/calculator-taxe-notariale)), incl. 21% VAT | The scale is progressive: about 1.49% at 300k lei, 1.33% at 500k, 1.15% at 800k (with VAT). 1.2% fits typical 450k–1M lei apartments. Notaries may charge above the minimum. |
| `registryPct` | 0.15% | [ANCPI Order 16/2019](https://sj.ancpi.ro/tarife-servicii/) | Individuals; minimum 60 lei. |
| `buyerAgencyPct` | 2.42% | Typical buyer commission 2% + 21% VAT ([Financiarul](https://financiarul.ro/constructii/comisioanele-imobiliare-ajung-la-4-plus-tva-de-21-ce-costuri-trebuie/)) | Applies to every purchase by default. Commissions run 2–3% + VAT per side; about 1.5% is negotiable above €250k. Set it to 0 for a direct purchase. |
| `fitOutCost` | 0 lei | No data on the share of rentals that are furnished | Rental listings often say "mobilat și utilat", but no portal publishes the share. Furnishing a 2-room flat in 2026: 20,000–30,000 lei basic, 35,000–55,000 medium, 60,000–90,000+ high, appliances 3,000–8,000 lei extra ([Club Antreprenor, 2026-04-14](https://www.clubantreprenor.ro/2026/04/14/cat-costa-sa-mobilezi-un-apartament-cu-2-camere-in-2026-buget-real-piesa-cu-piesa/)); 35,000–45,000 lei for a decent complete fit-out ([Ziarul Profit, 2026-04-10](https://www.ziarulprofit.ro/cat-te-costa-de-fapt-sa-te-muti-intr-un-apartament-cu-2-camere-in-2026-sumele-care-iti-golesc-contul-bancar/)). Set it when the rented comparable is furnished and the home you'd buy isn't. |
| `negotiationPct` | 3.75% | imobiliare.ro negotiation margin (last asking price vs declared transaction price), Q4 2025: Bucharest 3.6%, Cluj 4.5%, Brașov 3.9%, Timișoara 3.7%, Constanța 3.6%, Iași 3.6% (Știri pe surse, 2026-02-10); Q2 2025: 2.5–4.8% ([Economedia](https://economedia.ro/analiza-imobiliara-apartamentele-s-au-vandut-mai-rapid-in-trimestrul-ii-dar-preturile-s-au-negociat-mai-mult.html)) | The only measured source; no 2026 quarter found. It compares the last asking price with the sale price of the same flat, so it misses listings that never sell; that extra gap can't be measured from public data. Transaction prices (Eurostat HPI, +12.1% y/y in Q2 2026 in lei) rose at least as fast as asking prices (+5.7–6% in euros), so the gap isn't widening. |
| `bankFees` | 1,800 lei | BCR and ING: 900 lei analysis + 590–803 lei valuation + 100 lei fixed mortgage registration + RNPM 88.40 lei ([ING](https://ing.ro/persoane-fizice/credite/ipotecar), BCR sheet) | Charged only with a loan. Some banks charge 0 for analysis. The engine adds two loan-based fees on top (`mortgageSetupCosts()`): ANCPI registration of 0.1% of the loan, and the notary's minimum fee for the mortgage contract plus 21% VAT. That fee is the progressive scale for guarantee contracts in Order 177/C/2024, annex 2, point V (art. 15(2)(a)), on the amount secured: 0.85% up to 50,000 lei (min. 150), 425 + 0.5% above 50,000, 750 + 0.46% above 100,000, 1,209 + 0.19% above 200,000, 1,778 + 0.1% above 500,000 lei (text read from [the order as published in MO 70/2024](https://legeaz.net/monitorul-oficial-70-2024/ordin-mj-177-c-2024)). The flat 750 / 1,500 lei amounts used before are annex 1, points 24–25: later contracts securing the same debt, and Prima Casă or other state social programmes ([economica.net](https://www.economica.net/?p=721622) quotes 1,500 lei for Prima Casă). A 543,664 lei loan comes to about 1,822 lei + VAT for the notary. |

## Ownership and sale

| Key | Value | Source | Notes |
|---|---|---|---|
| `propertyTaxSqm` | 8.8 lei/m²/year (București 9.2, Iași 7.0) | Codul fiscal art. 457 as amended by [Law 239/2025](https://static.anaf.ro/static/10/Anaf/legislatie/L_239_2025.pdf): usable m² × 1.4 × 2,677 lei × zone coefficient × local rate | Zone coefficients: București (rank 0) A 2.6 / D 2.3; rank I cities A 2.5 / D 2.2; the default uses the midpoint. Local rate 0.1% (Timișoara HCLMT 719/2025; Cluj and Brașov bills fit it exactly; București from the press), 0.08% in Iași (inferred from published bills). Oradea and Sibiu use the default, unverified. Check against bills: București 60 m², zone A, 578 lei (default gives 552); Cluj 55 m², zone A, 515 lei (default 484). The tax depends on area and zone, not on price, and the engine indexes it with inflation each year (Codul fiscal art. 491; not re-checked after Law 239/2025). A 10% discount for paying by 31 March isn't modelled. |
| `homeInsuranceAnnual` | 130 lei | PAD type A (concrete/brick), [padrom.ro](https://www.padrom.ro/) | Mandatory. |
| `homeInsurancePct` | 0.07% of value/year | ING: optional policy at 0.10% of the insured sum per year ([ING](https://ing.ro/persoane-fizice/credite/ipotecar)); market range 150–700 lei/year for an apartment (Playtech, 2026-01-05) | The insured sum is usually the rebuild cost or the loan balance, below market value, so 0.10% of market value overstates it. Banks require the policy, assigned to them, for the life of the loan. |
| `maintenancePct` | 1% of value/year | **Choice**: the common 1%-a-year rule, including a full renovation about every 20 years | Cross-check against renovation costs per m² in 2026: national standard average 2,300 lei/m² (Ghid Amenajări, via [Financiarul, 2026-09-05](https://financiarul.ro/constructii/renovarea-unui-apartament-cu-doua-camere-costa-pana-la-3-400-ron-mp/), an article written with AI assistance) and 1,400–2,400 lei/m² standard ([Animo Regis](https://animoregis.com/renovare-bloc/cat-costa-renovarea-apartament-bloc-vechi), a design firm); București 2,600–3,500 all-in. One renovation every 20 years comes to about 1.0% a year of the national average price, 1.3% in București and 0.9% in Cluj, where land makes up more of the price. Eurostat national accounts put minor repairs alone at roughly 0.2–0.3% of the housing stock's value (2022). A share of value grows with house prices and charges more in expensive areas, where land rather than the flat drives the price; the sensitivity table shows ±25%. |
| `saleTaxShortPct` / `saleTaxLongPct` / `saleTaxShortHoldYears` | 3% / 1% / 3 years | Codul fiscal art. 111 ([PwC Tax Summaries](https://taxsummaries.pwc.com/romania/individual/income-determination)) | Applies to the full sale value (or the notary grid value if higher), not the gain. No exempt threshold since 2023. |
| `saleAgencyPct` | 2% | **Estimate.** Typical seller-side agency fee | |

## Renting

| Key | Value | Source | Notes |
|---|---|---|---|
| `depositMonths` | 1 | [Spotmedia, 2026-02-21](https://spotmedia.ro/stiri/casa-si-gradina/cat-costa-de-fapt-sa-inchiriezi-un-apartament-in-2026-taxe-garantii-si-comisioane-ascunse) | Some Bucharest landlords ask 2–3. |
| `rentAgencyPct` | 50% of a month's rent | Common agency fee for tenants (listings; [Spotmedia](https://spotmedia.ro/stiri/casa-si-gradina/cat-costa-de-fapt-sa-inchiriezi-un-apartament-in-2026-taxe-garantii-si-comisioane-ascunse)) | Paid once, not refunded. 0 when renting directly from the owner; 100% also occurs. |
| `renterInsuranceAnnual` | 150 lei | **Estimate.** No published tenant policy prices found | |
| `moveEveryYears` | 0 (never) | No published data on how long Romanian tenants stay | Leases are usually 12 months, sometimes 6 or 24 ([Storia](https://www.storia.ro/blog/ghid-chirie/chirias/contract-inchiriere-locuinta-anaf)); student lets in Iași reportedly last 6–9 months (local, not national). When set, each move charges a new agency fee and `moveCost` and resets the deposit. |
| `moveCost` | 0 lei | No published moving-company price found | Enter your own when using moves. |

## Investing

| Key | Value | Source | Notes |
|---|---|---|---|
| `investRealReturn` | 3.5% over inflation, after fund costs (7.12% nominal at 3.5% inflation) | **Estimate.** Global equity ETF, net of fund costs, before tax | J.P. Morgan 2027 LTCMA (2026-10-19): global equities 7.5% (USD, 10–15 years), global inflation 2.6% → ~4.8% real ([JPM](https://am.jpmorgan.com/us/en/asset-management/institutional/about-us/media/press-releases/jp-morgan-releases-2027-long-term-capital-market-assumptions/)). Vanguard (model run of 2025-12-31): US equities 4.0–5.0%, ex-US 4.9–6.9% (USD) ([Vanguard](https://corporate.vanguard.com/content/corporatesite/us/en/corp/vemo/2026-outlook-economic-upside-stock-market-downside.html)); weighted ~60/40 about 5.1% nominal, ~2.4% real after JPM's 2.6% inflation (Vanguard's own inflation figure wasn't checked). Average ~3.6% real; less TER 0.14–0.20% (VWRA 0.14, SPYI 0.17, ISAC 0.20, [justETF](https://www.justetf.com/en/etf-profile.html?isin=IE00BK5BQT80)) → 3.5%. Expressing it as a real return and adding Romanian inflation keeps it consistent with the other rates; at purchasing-power parity, the leu's expected depreciation is the inflation gap, so no separate currency term is added. Not deducted: withholding tax on US dividends inside Irish funds (unverified here), and the gap between fund and investor returns. A balanced or cautious portfolio would be lower. |
| `investTaxRate` | 3% | [Law 239/2025](https://static.anaf.ro/static/10/Anaf/legislatie/L_239_2025.pdf), art. 97(8¹): gains via a Romanian broker on holdings over 365 days, withheld at source, final | 6% for holdings under a year; 16% of the net annual gain via a foreign broker (art. 123(1²)); 16% on dividends from 2026 (Law 141/2025). CASS (a stepped amount capped at 9,720 lei/yr above 6 minimum wages of investment income) is not modelled. |
| `savingsRealReturn` | 0% over inflation (deposit rate = inflation) | **Assumption.** Term deposit in lei, for the renter who doesn't invest | Over long periods deposit rates in lei have stayed around inflation or below it. BNR's average rate on new household term deposits in lei was 5.07% in September 2026 ([Financiarul](https://financiarul.ro/finante-si-banci/dobanzile-medii-la-creditele-noi-in-lei-au-scazut-la-7-70-iar-cele-la-depozitele-noi-in-lei-au-urcat-la-5-31-sub-inflatie/)), below current inflation according to the article. Neither figure was checked against the BNR or INS series directly. |
| `savingsTaxRate` | 10% | [Fiscal Code art. 97](https://www.noulcodfiscal.ro/titlu-4/capitol-5/articol-97.html): interest on deposits, withheld at source by the bank | Secondary sources agree the rate stayed at 10% in 2026; one unconfirmed report mentions 16% above €100,000. CASS above income thresholds is not modelled. |

## Long-run assumptions

| Key | Value | Source | Notes |
|---|---|---|---|
| `inflation` | 3.5% | **Estimate** | CPI is 6.9% y/y (INS, Oct 2026). BNR forecasts 7.4% at end-2026 and 3.7% at end-2027 (Inflation Report, Nov 2026) and targets 2.5% ±1pp. 3.5% averages a few high years with a long period near target. Property growth, rent growth, the investment return and the long-run IRCC default to inflation plus their real parts, so changing inflation moves them too. |
| `propertyRealGrowth` | 0% (so property growth = inflation) | Real house prices were flat: BIS residential property prices for Romania, CPI-deflated, −0.09%/yr from 2015 to 2025 (annual averages; nominal +5.12%/yr) ([FRED: QROR628BIS](https://fred.stlouisfed.org/series/QROR628BIS), [QRON628BIS](https://fred.stlouisfed.org/series/QRON628BIS)); with Eurostat HICP as deflator +0.29%/yr. The real index averaged 36.9% below its 2009 level in 2025. | The old default (inflation + 0.5 pp) came from 2015–2025 nominal growth, a window that starts after the crash; it also assumed one ageing flat keeps pace with the market. The BIS series starts in 2009, so the 2008 peak isn't in it. Its deflator is not HICP (it rises ~5.2%/yr vs 4.8%), probably the national CPI. A long horizon also carries crash risk the fixed rate doesn't show. |
| `rentRealGrowth` | 0% (so rent growth = inflation) | Eurostat HICP actual rentals: +4.58%/yr 2015–2025 against +4.82%/yr all-items HICP ([FRED: CP0410ROM086NEST](https://fred.stlouisfed.org/series/CP0410ROM086NEST), [CP0000ROM086NEST](https://fred.stlouisfed.org/series/CP0000ROM086NEST)), i.e. about inflation. | Don't use HICP rents for 2026 onward: the index jumped 33.5% in April 2026 (104.92 → 140.08) when state-housing rents (about 26% of its weight) were raised by HG 193/2026, while private asking rents moved −3% to +8% ([Economedia](https://economedia.ro/analiza-anomalia-din-statistica-oficiala-cum-au-ajuns-chiriile-sa-creasca-cu-33-intr-o-singura-luna-dupa-ce-locuintele-statului-au-primit-o-pondere-de-26-in-indice.html)). Private asking rents rose faster than HICP rents in 2020–2025 in some cities; the rent-growth row of the sensitivity table shows ±1 pp. |

## Cities (€/m², asking prices)

| City | Price (all apartments) | Rent index: rent / month | Rent index: sale price | Gross yield (rent index) |
|---|---|---|---|---|
| București | 2,312 | 11.0 | 2,229 | 5.92% |
| Cluj-Napoca | 3,316 | 10.3 | 3,177 | 3.89% |
| Timișoara | 1,984 | 8.2 | 1,984 | 4.96% |
| Iași | 2,000 | 8.6 | 1,911 | 5.40% |
| Brașov | 2,309 | 9.4 | 2,265 | 4.98% |
| Constanța | 2,020 | 9.3 | 1,967 | 5.67% |
| Oradea | 1,885 | 7.0 | 1,873 | 4.48% |
| Sibiu | 2,034 | 7.7 | 2,037 | 4.54% |
| National | 2,019 | 7.7 | 2,010.5 | 4.60% |

The rent the calculator uses is the yield from the rent index applied to the price in the first column (`rentSqmFor()`), so price and rent describe the same market even though the price comes from another source.

- Sale prices: **imobiliare.ro** throughout, so every city uses one source and one method (median asking price per m² of usable area, top and bottom 2.5% trimmed): the all-apartment median for September 2026, old and new together (via [Revista Biz, 2026-10-13](https://www.revistabiz.ro/bucurestiul-devanseaza-brasovul-in-topul-preturilor-la-apartamente-clujul-ramane-cel-mai-scump/) and [AGERPRES](https://agerpres.ro/english/2026/10/29/apartment-prices-in-romania-register-5pct-increase-on-average-in-2026-analysis--1608028)). These figures are quoted by the press; imobiliare.ro's own report pages couldn't be read.
- Rent and the rent-index sale price: [apartamente.org index, November 2026](https://apartamente.org/raport-piata/2026-11), measured 2026-11-23. Median asking rent and median asking sale price, each deduplicated across portals (one asking price per distinct apartment). Both are re-checked against the index on 2026-11-24. **Provisional:** the figures were read on 2026-11-23 (their `asOf`), while the November edition was still being recalculated until 2026-12-01. Re-check them after that date; the final figures may differ.
- National sale price: imobiliare.ro index, September 2026 (via [Financiarul](https://financiarul.ro/economie/apartamentele-din-romania-au-fost-scoase-la-vanzare-cu-4-5-mai-scump-decat-acum-un-an/)), not split by new/existing, so used for both.
- National rent: apartamente.org's national median rent, 7.7 €/m², which it computes as the median of the cities it tracks. The paired sale price, 2,010.5 €/m², is the median of the eight cities' sale medians (computed here the same way, since the index doesn't publish one).

How the price sources compare (all are asking prices; no public source gives transaction €/m² by city):

| Source | Method | Verdict |
|---|---|---|
| imobiliare.ro | Median, trimmed, usable area stated explicitly, all cities | Used. Most consistent. |
| Storia | Average, one portal; usable area typed by sellers and not checked; doesn't disclose deduplication, the definition of "new", or VAT | Existing flats 0–5% above imobiliare.ro. New builds far below imobiliare.ro's new-build figures in București (1,982 vs 2,636) and Brașov (2,331 vs 2,724), likely from a wider "new" definition, prices without VAT and balconies counted in the area. Not used. |
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

The figures in the second column assume 52 m² for a 2-room flat. In November, 15.7% of rental listings that stayed online 30 days cut their price (median cut 7.5%, average change −1.19%), against 11.2% of sale listings (median cut 3.7%, average −0.23%). There is no measure of signed rents, so the app applies no discount and says so in the rent help text. November is near the seasonal low after the September student peak (about ±4%).

Known oddities, kept as published:
- Cluj rent looks low relative to its prices (3.9% gross yield on the rent index's own prices vs ~5% elsewhere); Storia's July 2026 2-room average (€599) suggests ~10.9–11.5 €/m², about 5–10% above the apartamente.org median, but apartamente.org's own November 2-room median is 10.4 €/m². Kept as published. Storia reports similar yields (Bucharest 6.2%, Cluj 3.9%, June 2026).
- Prices (imobiliare.ro) and rents (apartamente.org) come from different sources, so the rent is set from apartamente.org's own rent-to-price ratio rather than from its rent alone. Mixing sources directly shifted yields by a few tenths of a percentage point; this removes that, at the cost of assuming the two indexes' price levels differ only in level, not in which flats they cover.
- All prices are per m² of **usable** area without balconies; the size field says so. Built area is commonly 15–30% larger, so typing it would overstate the price.
- Asking prices are above transaction prices; `negotiationPct` (3.75%) is subtracted from the default price.
- Rents are scaled to the chosen size with a 0.72 power around 55 m² (fitted to apartamente.org room-by-room medians in Cluj, Timișoara, Brașov and Iași: 0.61–0.76) (see `docs/data.md`), since rent per m² falls for larger flats.

### VAT on new builds (unverified)

The calculator treats every price as the total the buyer pays, VAT included. Whether that holds for the new-build figures is **not verified**:

- Storia's [July 2026 analysis](https://www.storia.ro/blog/newsroom/analiza-storia-preturile-apartamentelor-au-crescut-in-medie-cu-6-fata-de-anul-trecut-si-s-au-mentinut-relativ-stabile-fata-de-iunie) says only that it uses "prețurile medii solicitate de vânzători în anunțurile publicate pe Storia". It does not mention VAT.
- Storia's [guide to new-home costs](https://www.storia.ro/blog/uncategorized/costurile-unei-locuinte-noi) (October 2026) tells buyers to "verifică dacă prețul din ofertă include TVA", so listings evidently differ. Some listings state "TVA inclus".
- Standard VAT on new homes is 21%. The transitional 9% rate ended with deliveries by 2026-09-30 (Law 161/2026, as reported by [StartupCafe](https://startupcafe.ro/termenul-pentru-tva-de-9-la-locuinte-prelungit-oficial-descarca-legea-161-2026-ce-aduce-nou-si-cine-poate-cere-restituirea-diferentei-de-tva-104534) on 2026-08-04 and cabinetexpert.ro on 2026-08-25; not checked against the law's text), so every new contract now carries 21%.
- Buyer guides say many developers advertise prices without VAT. Neither Storia, imobiliare.ro nor apartamente.org says how its index treats VAT. SVN, which tracks developer prices in one submarket, quotes them without VAT.

The city prices include new builds. If a large share of new-build listings is net of VAT, the cost of a new flat is understated by up to 21%, and the all-apartment median by less, depending on the share of new builds among the listings. The values are kept as published; the price field's help text tells users to check whether an offer includes VAT. Existing homes sold by individuals are generally outside VAT, so their prices should be unaffected.

## Automated collection

- **BNR exchange rate** (`eurRon`): fetched by the scheduled pipeline from the official XML feed (`curs.bnr.ro/nbrfxrates.xml`).
- **IRCC** (`ircc`): **kept manual.** BNR publishes it only on an HTML page whose tables are loaded by the site's internal CMS endpoint (an undocumented POST with page-specific block ids), with no XML, CSV or other machine-readable file. That endpoint can change whenever the page is edited, so it isn't a stable source to automate. Third-party copies (cursbnr.ro etc.) are not scraped. Update it by hand each quarter: the value for quarter T applies from the start of quarter T+2.
- **Inflation** (`inflation`): **kept manual on purpose.** It is a long-run assumption, not the current CPI, so auto-filling it from INS would be wrong.
- **imobiliare.ro**: robots.txt blocks search pages and most filter parameters; third parties report anti-bot protection. Terms of use could not be read. **Not scraped.**
- **storia.ro**: robots.txt allows most paths (`Content-Signal: ai-train=no`). Terms of use could not be read. **Not scraped.**
- City prices and rents are therefore updated by hand from the published reports above, with attribution.

## Changes after the second audit

On 2026-11-24 three independent reviews of the model and its defaults were run, and every figure they questioned was checked against its source before changing anything. What changed:

| Change | Why | Effect on the default (București, existing, 55 m², 30 years, today's lei) |
|---|---|---|
| Upkeep 1% of value (was 0.75%) | Renovation every ~20 years at 2026 costs per m² comes to about 1% a year of the average price | Buyer's lead −82k |
| Property growth = inflation (was inflation + 0.5 pp) | BIS real house prices flat 2015–2025 | −74k |
| Investment return = inflation + 3.5% real (7.12%, was 7%) | Tied to inflation; JPM and Vanguard averaged | −12k |
| Rent from the rent index's own yield | Price and rent from one set of listings | +26k (rent 3,279 lei, was 3,236) |
| Mortgage notary fee on the guarantee-contract scale; no bank fees for a cash purchase | The 750 / 1,500 lei fees are for state programmes and later contracts | ~0.5k |
| Fit-out and renter moves added as inputs, default 0 | No data on furnished share or tenancy length | 0 |

The buyer's lead fell from 570k to 422k lei; the break-even rent rose from 2,282 to 2,586 lei a month. Two points raised in the audits didn't survive checking: the 7% return was not clearly too low once Vanguard's lower forecasts are included, and the existing-home price is only about 2% below imobiliare.ro's all-flat price in București, so pairing it with an all-flat rent was a small mismatch, not a large one.

## One price per city

On 2026-11-25 the new/existing switch was removed and every city now uses one price: imobiliare.ro's all-apartment median for September 2026.

Why: the published split by building age is patchy. HotNews (2026-07-01, imobiliare.ro data, early summer 2026) gives both sides only for București (new 2,636 / old 2,259) and Brașov (2,724 / 2,246); for Constanța only new (2,071), for Timișoara, Cluj-Napoca and Iași only old (1,918; 3,300, placed after the Cluj paragraph; 1,978). Revista Biz (2026-10-13) gives Timișoara new "over 2,200" and old 1,940, and only approximate or no figures elsewhere. No index publishes rents by building age, so the switch only scaled price and rent together and changed the default agency fee. Mixing an early-summer split in two cities with September medians elsewhere also put cities on different dates.

Effect on the default (București, 55 m²): the price rises from 2,259 to 2,312 €/m² (about €119,600 to €122,400 after negotiation) and the rent from about €613 to €628 a month; Brașov from 2,246 to 2,309 €/m². The `buyerAgencyPctNew` default (0%) is gone; buying from a developer means setting the agency fee to 0.


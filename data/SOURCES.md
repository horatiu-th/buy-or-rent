# Default values: sources and reasoning

Checked on 2026-11-23 (full audit of every default on that date). Values live in `data/overrides.json` (hand-maintained) and `data/auto.json` (written by the pipeline; overrides win). Rates are decimals in the JSON (`0.055` = 5.5%).

Every default is a starting point for the user, not a forecast. Values marked **estimate** have no single authoritative source; the reasoning is below.

## Loan and purchase

| Key | Value | Source | Notes |
|---|---|---|---|
| `eurRon` | 5.3485 | [BNR reference rate](https://curs.bnr.ro/nbrfxrates.xml), 2026-11-23 | Refreshed automatically once the pipeline runs. |
| `ircc` | 5.57% | [BNR, IRCC page](https://www.bnr.ro/1974-indicele-de-referinta-pentru-creditele-consumatorilor): quarterly index 2026T2 | The index computed for a quarter applies two quarters later, so 2026T2 applies 2026-10-01 to 2026-12-31 (`validUntil: 2026-12-31`; the merge warns after that). **Unverified:** [cursbnr.ro](https://www.cursbnr.ro/ircc), a third-party site, lists 5.61% from 2027-01-01; this was not on BNR's own page on 2026-11-23. Confirm it on the BNR page before updating, on or after that date. |
| `irccLongRun` | 4.5% | **Estimate.** Long-run inflation (3.5%) plus about 1pp | IRCC is the trailing average of interbank deposit rates, which sit near the BNR deposit facility (5.50% with the policy rate at 6.50%, Nov 2026). BNR forecasts inflation of 3.7% at end-2027 and 2.5% from Q3 2028 ([Inflation Report, Nov 2026](https://www.economica.net/?p=995886)); analysts expect the first cuts in 2027. The engine moves IRCC from `ircc` to this level over three years. History: 5.55–6.06% in 2023–2026. |
| `fixedRate` | 5.9% | 5-year fixed offers with salary transfer, Nov 2026 ([ifink.ro](https://ifink.ro/top-dobanzi-credite-ipotecare/), bank pages): ING 5.89%, UniCredit 5.90%, BT 5.35–5.45% and BCR 5.59% for energy class A only, Garanti 6.15% | The BNR average for new RON housing loans (5.6%, Sep 2026) was used before; it mixes in 3-year promotional fixed rates (4.7–5.1%) and green loans, so it understates a standard 5-year fixed rate. |
| `fixedYears` | 5 | Common 3–5 year fixed offers ([ipotecare.ro via cursbnr](https://www.cursbnr.ro/dobanda-medie-credite-ipotecare-lei)) | |
| `variableMargin` | 2.2% | Margins after the fixed period with salary transfer, Nov 2026: BCR 2.10–2.30%, BT 2.20%, BRD 2.10%, UniCredit 2.20–2.40%, Raiffeisen 2.10–2.50%, ING 1.89–2.49% ([ifink.ro](https://ifink.ro/top-dobanzi-credite-ipotecare/)) | Without salary transfer, 3.3–3.5% (BCR). |
| `downPaymentPct` | 15% | [BNR Regulation 17/2012](https://www.avocatnet.ro/articol_31655/Regulamentul-BNR-nr-17-2012-unele-conditii-de-creditare.html): LTV cap 85% for RON loans | Banks may ask 25% if the buyer already owns a home. Noua Casă (state-guaranteed) allows 5% up to €70k; not added as a preset because the 2026 guarantee ceiling ends 2026-12-31 and changes are pending in Parliament. |
| `loanTermYears` | 30 | BCR Casa Mea product sheet (2026-09-21) | |
| `lifeInsurancePct` | 0.31%/year | BCR Casa Mea: 0.026% per month of the balance | Other lenders 0.026–0.035%/month (financer.ro). |
| `notaryPct` | 1.2% | Minimum notary fees, Ord. 177/C/2024 (via [notari.pro](https://notari.pro/calculator-taxe-notariale)), incl. 21% VAT | The scale is progressive: about 1.49% at 300k lei, 1.33% at 500k, 1.15% at 800k (with VAT). 1.2% fits typical 450k–1M lei apartments. Notaries may charge above the minimum. |
| `registryPct` | 0.15% | [ANCPI Order 16/2019](https://sj.ancpi.ro/tarife-servicii/) | Individuals; minimum 60 lei. |
| `buyerAgencyPct` | 2.42% | Typical buyer commission 2% + 21% VAT ([Financiarul](https://financiarul.ro/constructii/comisioanele-imobiliare-ajung-la-4-plus-tva-de-21-ce-costuri-trebuie/)) | Existing homes. Commissions run 2–3% + VAT per side; about 1.5% is negotiable above €250k. Set it to 0 for a direct purchase. |
| `buyerAgencyPctNew` | 0% | **Estimate.** New builds are usually bought from the developer, without an agent | |
| `negotiationPct` | 3.5% | imobiliare.ro negotiation margin (last asking price vs declared transaction price), Q2 2025: Bucharest 4.1%, Cluj 4.8%, Brașov 3.1%, Timișoara 2.5%; historically 3.4–4.4% ([Economedia](https://economedia.ro/analiza-imobiliara-apartamentele-s-au-vandut-mai-rapid-in-trimestrul-ii-dar-preturile-s-au-negociat-mai-mult.html)) | Subtracted from the asking price to get the default price. No 2026 figure found. |
| `bankFees` | 3,000 lei | BCR and ING: 900 lei analysis + 590–803 lei valuation; ANCPI mortgage registration 100 lei + 0.1% of the loan; RNPM 88.40 lei ([ING](https://ing.ro/persoane-fizice/credite/ipotecar)) | Includes about 1,000 lei for the notary on the mortgage contract (**estimate**; quotes range 500–1,800 lei). Some banks charge 0 for analysis. |

## Ownership and sale

| Key | Value | Source | Notes |
|---|---|---|---|
| `propertyTaxPct` | 0.08% of market value (Cluj 0.055%) | Codul fiscal art. 457 as amended by [Law 239/2025](https://static.anaf.ro/static/10/Anaf/legislatie/L_239_2025.pdf): 0.08–0.2% of a statutory taxable value (2,677 lei/m² for concrete or brick with utilities, × zone/rank coefficient); age reductions repealed | Actual 2026 bills, as reported in the press: 578 lei for 60 m² in Bucharest, zone A (≈0.08% of market value); 515 lei for 55 m² in Cluj, zone A (≈0.055%, because Cluj prices are higher). Paying by 31 March gives a 10% discount, not modelled. |
| `homeInsuranceAnnual` | 130 lei | PAD type A (concrete/brick), [padrom.ro](https://www.padrom.ro/) | Mandatory. |
| `homeInsurancePct` | 0.1% of value/year | Optional property policy, ~0.10% of the insured value per year (ING example) | Banks require it, assigned to the bank, for the life of the loan. Charged on the current property value. |
| `maintenancePct` | 0.75% | **Estimate.** | Law 196/2018 requires a building repair fund but sets no amount; contributions are usually small. Refitting the flat every 15–25 years is the main cost. Land and location are roughly 40–60% of an apartment's value, so 0.75% of the total is about 1.5% of the structure per year. |
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
| `investReturn` | 7% | **Estimate.** Global equity ETF, nominal, in lei | JPM 2027 LTCMA: ACWI 7.5%/yr in USD over 10–15 years ([JPM](https://am.jpmorgan.com/us/en/asset-management/institutional/about-us/media/press-releases/jp-morgan-releases-2027-long-term-capital-market-assumptions/)); Vanguard developed ex-US 5.3–7.3% in USD. EUR/RON rose 1.7%/yr 2005–2025 (Eurostat), which adds to returns in lei. Less ~0.2–0.5% fund costs. A balanced or cautious portfolio would be 5–6%. |
| `investTaxRate` | 3% | [Law 239/2025](https://static.anaf.ro/static/10/Anaf/legislatie/L_239_2025.pdf), art. 97(8¹): gains via a Romanian broker on holdings over 365 days, withheld at source, final | 6% for holdings under a year; 16% of the net annual gain via a foreign broker (art. 123(1²)); 16% on dividends from 2026 (Law 141/2025). CASS (a stepped amount capped at 9,720 lei/yr above 6 minimum wages of investment income) is not modelled. |
| `savingsRate` | 4% | **Estimate.** | 12-month RON deposits pay ~5.0–5.5% at large banks today (BNR average 5.07%, Sep 2026). Expected to fall as inflation falls; 4% is a long-run figure. |
| `savingsTaxRate` | 10% | Codul fiscal, tax on interest ([PwC](https://taxsummaries.pwc.com/romania/individual/income-determination)) | Withheld by the bank. Neither Law 141/2025 nor Law 239/2025 changed it. |

## Long-run assumptions

| Key | Value | Reasoning |
|---|---|---|
| `inflation` | 3.5% | CPI is 6.9% y/y (INS, Oct 2026). BNR forecasts 7.4% at end-2026 and 3.7% at end-2027 (Inflation Report, Nov 2026) and targets 2.5% ±1pp. 3.5% averages a few high years with a long period near target. |
| `propertyGrowth` | 4% | Eurostat house price index for Romania: +5.1%/yr in RON 2015–2025, against 4.8%/yr consumer inflation, i.e. roughly inflation + 0.5pp. Applied to 3.5% inflation. From the 2009 peak, prices fell 25% nominal by 2014 and remain about 34% lower in real terms in 2025, so a long horizon also carries crash risk the fixed rate doesn't show. |
| `rentGrowth` | 3.5% | Eurostat HICP actual rentals: +4.58%/yr 2015–2025 against +4.81%/yr CPI, i.e. about inflation. Set equal to the inflation default. Don't use HICP rents for 2026 onward: the index jumped 33.5% in April 2026 when state-housing rents (about 26% of its weight) were raised by HG 193/2026, while private asking rents moved −3% to +8% ([Economedia](https://economedia.ro/analiza-anomalia-din-statistica-oficiala-cum-au-ajuns-chiriile-sa-creasca-cu-33-intr-o-singura-luna-dupa-ce-locuintele-statului-au-primit-o-pondere-de-26-in-indice.html)). |

## Cities (€/m², asking prices)

| City | New | Existing | Rent / month |
|---|---|---|---|
| București | 2,312 | 2,260 | 11.0 |
| Cluj-Napoca | 3,340 | 3,286 | 10.3 |
| Timișoara | 2,081 | 2,023 | 8.2 |
| Iași | 1,919 | 2,004 | 8.6 |
| Brașov | 2,331 | 2,344 | 9.4 |
| Constanța | 2,020 | 2,106 | 9.3 |
| Oradea | 2,027 | 1,888 | 7.0 |
| Sibiu | 2,020 | 2,066 | 7.7 |
| National | 2,019 | 2,019 | 8.1 (estimate) |

- Sale prices (new / existing): [Storia analysis, July 2026](https://www.storia.ro/blog/newsroom/analiza-storia-preturile-apartamentelor-au-crescut-in-medie-cu-6-fata-de-anul-trecut-si-s-au-mentinut-relativ-stabile-fata-de-iunie). Average asking prices for 1–3 room flats. Where a Storia figure differs by more than 10% from both imobiliare.ro (Sep 2026) and apartamente.org (Nov 2026), the imobiliare.ro city average replaces it: București new builds (Storia 1,982 vs 2,312 and 2,229) and Constanța new builds (Storia 2,257 vs 2,020 and 1,967). imobiliare.ro city figures via [AGERPRES](https://agerpres.ro/english/2026/10/29/apartment-prices-in-romania-register-5pct-increase-on-average-in-2026-analysis--1608028) and [Revista Biz](https://www.revistabiz.ro/bucurestiul-devanseaza-brasovul-in-topul-preturilor-la-apartamente-clujul-ramane-cel-mai-scump/); they are not split by new/existing.
- Rent: [apartamente.org index, November 2026](https://apartamente.org/raport-piata). Median asking rent, deduplicated across portals. **Provisional:** the figures were read on 2026-11-23 (their `asOf`), while the November edition was still being recalculated until 2026-12-01. Re-check them after that date; the final figures may differ.
- National sale price: imobiliare.ro index, September 2026 (via [Financiarul](https://financiarul.ro/economie/apartamentele-din-romania-au-fost-scoase-la-vanzare-cu-4-5-mai-scump-decat-acum-un-an/)), not split by new/existing, so used for both.
- National rent is an **estimate**: the national price × the average gross rental yield of the eight cities (4.83%/year) ÷ 12.

Known oddities, kept as published:
- Cluj rent looks low relative to its prices (3.8% gross yield vs ~5% elsewhere); Storia's July 2026 2-room average (€599) suggests ~10.9–11.5 €/m², about 5–10% above the apartamente.org median. Kept as published. Storia reports similar yields (Bucharest 6.2%, Cluj 3.9%, June 2026).
- Storia reports averages; imobiliare.ro and apartamente.org report medians. Brașov new builds differ most between sources (2,331 vs ~2,800).
- Asking prices are above transaction prices; `negotiationPct` (3.5%) is subtracted from the default price.
- Rents are scaled to the chosen size with a 0.8 power around 55 m² (see `docs/data.md`), since rent per m² falls for larger flats.

### VAT on new builds (unverified)

The calculator treats every price as the total the buyer pays, VAT included. Whether that holds for the new-build figures is **not verified**:

- Storia's [July 2026 analysis](https://www.storia.ro/blog/newsroom/analiza-storia-preturile-apartamentelor-au-crescut-in-medie-cu-6-fata-de-anul-trecut-si-s-au-mentinut-relativ-stabile-fata-de-iunie) says only that it uses "prețurile medii solicitate de vânzători în anunțurile publicate pe Storia". It does not mention VAT.
- Storia's [guide to new-home costs](https://www.storia.ro/blog/uncategorized/costurile-unei-locuinte-noi) (October 2026) tells buyers to "verifică dacă prețul din ofertă include TVA", so listings evidently differ. Some listings state "TVA inclus".
- Standard VAT on new homes is 21%. The transitional 9% rate ended with deliveries by 2026-09-30 (Law 161/2026, as reported by [StartupCafe](https://startupcafe.ro/termenul-pentru-tva-de-9-la-locuinte-prelungit-oficial-descarca-legea-161-2026-ce-aduce-nou-si-cine-poate-cere-restituirea-diferentei-de-tva-104534) on 2026-08-04 and cabinetexpert.ro on 2026-08-25; not checked against the law's text), so every new contract now carries 21%.
- Buyer guides say many developers advertise prices without VAT. Neither Storia, imobiliare.ro nor apartamente.org says how its index treats VAT.

If a large share of new-build listings is net of VAT, new-build prices here are too low by up to 21%. The values are kept as published; the price field's help text tells users to check whether an offer includes VAT. Existing homes sold by individuals are generally outside VAT, so their prices should be unaffected.

## Automated collection

- **BNR exchange rate** (`eurRon`): fetched by the scheduled pipeline from the official XML feed (`curs.bnr.ro/nbrfxrates.xml`).
- **IRCC** (`ircc`): **kept manual.** BNR publishes it only on an HTML page whose tables are loaded by the site's internal CMS endpoint (an undocumented POST with page-specific block ids), with no XML, CSV or other machine-readable file. That endpoint can change whenever the page is edited, so it isn't a stable source to automate. Third-party copies (cursbnr.ro etc.) are not scraped. Update it by hand each quarter: the value for quarter T applies from the start of quarter T+2.
- **Inflation** (`inflation`): **kept manual on purpose.** It is a long-run assumption, not the current CPI, so auto-filling it from INS would be wrong.
- **imobiliare.ro**: robots.txt blocks search pages and most filter parameters; third parties report anti-bot protection. Terms of use could not be read. **Not scraped.**
- **storia.ro**: robots.txt allows most paths (`Content-Signal: ai-train=no`). Terms of use could not be read. **Not scraped.**
- City prices and rents are therefore updated by hand from the published reports above, with attribution.

import type { Inputs } from '../engine';
import type { Money } from '../ui/money';

type FieldText = { label: string; help: string };

type DurationUnit = 'year' | 'month';
const UNIT_WORDS: Record<DurationUnit, [one: string, many: string]> = { year: ['an', 'ani'], month: ['lună', 'luni'] };

/**
 * The word that follows n: "1 an", "2 ani", "20 de ani". Romanian puts "de" between a number and its
 * noun when the number's last two digits are 00 or 20–99 (so "101 ani" but "120 de ani").
 */
function unitWord(n: number, unit: DurationUnit): string {
  const [one, many] = UNIT_WORDS[unit];
  if (n === 1) return one;
  const lastTwo = Math.abs(n) % 100;
  const de = lastTwo >= 20 || (lastTwo === 0 && n !== 0);
  return `${de ? 'de ' : ''}${many}`;
}

const count = (n: number, unit: DurationUnit) => `${n} ${unitWord(n, unit)}`;

/** "2 ani și 3 luni", rounded to whole months. */
function duration(months: number): string {
  const total = Math.round(months);
  // Defensive: callers pass positive durations, but an empty string would leave a sentence dangling.
  if (!(total > 0)) return count(0, 'month');
  const y = Math.floor(total / 12);
  const m = total % 12;
  return [y && count(y, 'year'), m && count(m, 'month')].filter(Boolean).join(' și ');
}

export const ro = {
  /** BCP 47 tag for number formatting: decimal comma, dot for thousands. */
  numberLocale: 'ro-RO',
  unitWord,
  count,
  duration,
  /** Short scale words for chart axes: "900 mii", "1,5 mil.". */
  axisUnits: { thousand: 'mii', million: 'mil.' },
  title: 'Cumpăr sau închiriez?',
  subtitle: 'Cât valorează, peste ani, o locuință cumpărată față de una închiriată în România.',
  city: 'Oraș',
  sqm: 'Suprafață utilă (m², fără balcon)',
  resetAll: 'Resetează tot',
  themes: {
    label: 'Temă',
    system: 'Ca sistemul',
    light: 'Luminoasă',
    dark: 'Întunecată',
    sand: 'Nisip',
    midnight: 'Miezul nopții',
    graphite: 'Grafit',
    contrast: 'Contrast ridicat',
  },
  reset: 'Revino la valoarea implicită',
  help: 'Ajutor',
  presets: { label: 'Tip dobândă', fixed5: 'Fix 5 ani', variable: 'Variabilă' },
  currency: 'Monedă',
  scale: {
    label: 'Ajustează chiria',
    rentWins: 'Închirierea câștigă',
    buyWins: 'Cumpărarea câștigă',
    yourRent: 'Chiria ta',
    threshold: 'Prag',
  },
  atHorizon: (after: string, real: boolean, money: Money) => {
    const basis = money.isBase ? 'în lei de azi' : `în lei de azi, convertiți în ${money.symbol}`;
    return `Avere netă după ${after}, ${real ? basis : 'în valori nominale'}`;
  },
  tabsLabel: 'Grafice',
  footer: {
    rate: (rate: string, date: string) => `Curs BNR: ${rate} lei/€, din ${date.split('-').reverse().join('.')}.`,
    sources: 'Surse și ipoteze pentru valorile implicite',
    newTab: '(se deschide într-o filă nouă)',
  },
  resultsLabel: 'Rezultate',
  breakEvenMark: 'Cumpărarea trece în față',
  // Values are divided by Romanian inflation; euro amounts are then converted at today's fixed rate,
  // so "euro of today" would wrongly suggest euro-area inflation.
  realValues: (money: Money) =>
    money.isBase
      ? 'Ajustat cu inflația din România'
      : `Ajustat cu inflația din România, ${money.symbol} la cursul de azi`,
  nominalNote: 'Valori nominale: aici sumele nu sunt ajustate cu inflația.',
  realHint: 'O valoare care crește cât inflația apare ca linie orizontală.',
  howWeCompare: {
    title: 'Cum comparăm',
    paragraphs: [
      'Două gospodării pornesc cu aceiași bani și plătesc lunar aceeași sumă: una cumpără cu credit, cealaltă stă în chirie. Cine are cheltuieli mai mici cu locuința investește diferența. La fel la început: cine cheltuiește mai puțin investește restul, de obicei chiriașul, care nu plătește avansul și costurile de cumpărare.',
      'Averea netă e ce ar avea fiecare dacă ar vinde totul în luna respectivă: locuința minus creditul și costurile de vânzare, plus investițiile după impozit. De aceea cumpărătorul pornește de obicei în urmă: taxele de cumpărare sunt deja plătite.',
      'Verdictul compară cele două gospodării care investesc, la orizontul ales. Liniile punctate din grafic arată aceleași gospodării cu economiile ținute în depozit bancar și nu schimbă verdictul.',
    ],
  },
  keyAssumptions: {
    lead: (property: string, matchesInflation: boolean, invest: string) =>
      `Verdictul depinde mai ales de două ipoteze: locuința se scumpește cu ${property} pe an${matchesInflation ? ', cât inflația' : ''}, iar investițiile aduc ${invest} pe an. Vezi în tab-ul `,
    link: 'Sensibilitate',
    tail: ' cât schimbă rezultatul.',
  },
  source: 'sursa',
  stale: 'date vechi',
  toCheck: 'de verificat',
  assumptions: 'Valorile implicite sunt ipoteze, nu prognoze. Verifică-le pentru situația ta.',
  buyer: 'Cumpărător',
  renter: 'Chiriaș',
  buyerInvesting: 'Cumpărător care investește',
  renterInvesting: 'Chiriaș care investește',
  buyerNoInvest: 'Cumpărător care nu investește',
  renterNoInvest: 'Chiriaș care nu investește',
  investing: 'investește',
  notInvesting: 'nu investește',
  chartStart: 'La început',
  afterTime: (d: string) => `După ${d}`,
  monthN: (n: number) => `Luna ${n}`,
  charts: {
    netWorth: 'Grafic: averea netă în timp',
    monthly: 'Grafic: costurile lunare în timp',
    breakdown: 'Grafic: unde se duc banii',
    legend: 'Serii afișate în grafic',
    netWorthSummary: (span: string, buyer: string, renter: string, buyerNoInvest: string, renterNoInvest: string) =>
      `Averea netă lună de lună, pe ${span}. La final: cumpărător care investește ${buyer}, chiriaș care investește ${renter}, cumpărător care nu investește ${buyerNoInvest}, chiriaș care nu investește ${renterNoInvest}.`,
    breakEvenSummary: (after: string) => `Cumpărarea trece în față după ${after} și rămâne în față până la finalul orizontului ales.`,
    monthlySummary: (firstBuyer: string, firstRenter: string, lastBuyer: string, lastRenter: string) =>
      `Costul lunar în prima lună: cumpărător ${firstBuyer}, chiriaș ${firstRenter}. În ultima lună: cumpărător ${lastBuyer}, chiriaș ${lastRenter}.`,
    noInvestNote: 'Liniile punctate: aceleași gospodării, cu aceiași bani economisiți, dar ținuți într-un depozit bancar în loc să fie investiți. Diferența față de linia plină de aceeași culoare e ce aduce investiția în plus față de depozit.',
    lastSeries: 'Cel puțin o serie rămâne afișată.',
    breakdownSummary: (items: string) => `Totaluri pe tot orizontul, în valori nominale. ${items}.`,
  },
  headlineValue: (after: string, rent: string) =>
    `După ${after}, cumpărătorul are o avere netă mai mare decât chiriașul care investește dacă chiria lunară depășește ${rent}.`,
  headlineAlwaysBuy: (after: string) =>
    `După ${after}, cumpărătorul are cel puțin aceeași avere netă ca chiriașul care investește, chiar și la chirie zero.`,
  headlineAlwaysRent: (after: string) =>
    `După ${after}, chiriașul care investește are cel puțin aceeași avere netă ca proprietarul la orice chirie analizată.`,
  verdictBuy: (after: string) =>
    `Pentru cifrele tale, cumpărarea trece în față după ${after} și rămâne în față până la final.`,
  verdictBuyFromStart: 'Pentru cifrele tale, cumpărarea e în față de la început și rămâne în față până la final.',
  verdictRent: 'Pentru cifrele tale, închirierea rămâne mai avantajoasă pe tot orizontul.',
  verdictRentAtEnd: 'Pentru cifrele tale, închirierea e mai avantajoasă la final, deși cumpărarea a fost în față o vreme.',
  headlineInvalid: 'Verifică valorile introduse: calculul nu poate fi făcut cu ele.',
  headlineNoThreshold: (after: string) =>
    `După ${after}, cumpărătorul câștigă la chirie mică, dar pierde la chirie mare: cu aceste valori nu există o chirie peste care cumpărarea câștigă.`,
  saleTaxNote: (after: string) =>
    `Averea cumpărătorului presupune vânzarea în luna respectivă. Impozitul la vânzare scade după ${after}, ceea ce poate muta momentul în care cumpărarea devine avantajoasă.`,
  tabs: {
    netWorth: 'Avere netă',
    monthly: 'Costuri lunare',
    breakdown: 'Unde se duc banii',
    sensitivity: 'Sensibilitate',
  },
  breakdown: {
    rent: {
      label: 'Chirie',
      help: 'Suma chiriilor lunare pe perioada aleasă. La fiecare an nou de simulare, chiria se modifică în funcție de rata de creștere introdusă.',
    },
    interest: {
      label: 'Dobândă',
      help: 'Partea din fiecare rată care acoperă dobânda la soldul creditului. Totalul adună dobânda plătită în perioada analizată.',
    },
    maintenance: {
      label: 'Întreținere',
      help: 'Bugetul pentru întreținere și reparații. Se calculează lunar, aplicând o doisprezecime din procentul anual la valoarea estimată a locuinței în luna respectivă.',
    },
    saleAgencyFee: {
      label: 'Comision la vânzare',
      help: 'Comisionul agenției se calculează ca procent din valoarea estimată a locuinței la final. Se aplică doar dacă incluzi costurile de vânzare.',
    },
    acquisitionCosts: {
      label: 'Costuri inițiale',
      help: 'Cumpărătorul plătește notarul, intabularea, comisionul de agenție și amenajarea, dacă ai introdus-o. Dacă ia credit, se adaugă comisioanele bancare și costurile ipotecii. Pentru chiriaș se adună comisioanele agenției la închiriere și costul mutărilor, dacă se mută.',
    },
    insurance: {
      label: 'Asigurări',
      help: 'Pentru cumpărător se adună primele pentru PAD, asigurarea facultativă a locuinței și asigurarea de viață. Pentru chiriaș se adună primele pentru asigurarea de chiriaș.',
    },
    taxes: {
      label: 'Impozite',
      help: 'Cumpărătorul plătește impozitul anual pe clădire, indexat cu inflația. Pentru ambele variante se adaugă impozitul pe câștigul din investiții la final. Dacă incluzi costurile de vânzare, cumpărătorul plătește și impozitul la vânzarea locuinței. Cota depinde de durata deținerii.',
    },
  },
  sensitivityHelp:
    'Diferența de avere netă la final dintre cumpărător și chiriașul care investește, dacă creșterea prețului locuinței sau randamentul investițiilor diferă cu ±2 puncte procentuale. În centru sunt valorile tale.',
  sensitivityBuyWins: 'cumpărarea câștigă',
  sensitivityRentWins: 'închirierea câștigă',
  sensitivityBase: 'valorile tale',
  sensitivityTie: 'la egalitate',
  sensitivityRows: 'Creștere preț locuință',
  sensitivityCols: 'Randament investiții',
  swingsHelp:
    'Diferența de avere netă la final dintre cumpărător și chiriașul care investește, când o singură altă ipoteză e mai mică sau mai mare, restul rămânând la valorile tale.',
  swingsAssumption: 'Ipoteză',
  swingsDown: 'Mai mică',
  swingsBase: 'Valorile tale',
  swingsUp: 'Mai mare',
  swingLabels: {
    rent: 'Chirie lunară (±10%)',
    rentGrowth: 'Creștere chirie (±1 pp)',
    irccLongRun: 'IRCC pe termen lung (±1 pp)',
    maintenancePct: 'Întreținere și reparații (±25%)',
  },
  horizons: {
    title: 'Pe alte orizonturi',
    help: 'Același calcul dacă vinzi sau te oprești din închiriat mai devreme. Durata creditului nu spune cât locuiești acolo.',
    after: 'După',
    threshold: 'Prag de chirie',
    gap: (real: boolean) => `Cine e în câștig și cu cât (${real ? 'lei de azi' : 'valori nominale'})`,
    yours: 'orizontul tău',
    alwaysBuy: 'cumpărarea câștigă la orice chirie',
    alwaysRent: 'închirierea câștigă la orice chirie',
    none: '—',
  },
  groups: {
    buying: 'Cumpărare',
    renting: 'Închiriere',
  },
  topics: {
    home: 'Locuința',
    loan: 'Creditul',
    purchaseCosts: 'Costuri de achiziție',
    ownershipCosts: 'Costuri de proprietar',
    sale: 'Vânzare la final',
  },
  buyingMore: 'Costuri de achiziție, de proprietar și de vânzare',
  editedCount: (n: number) => (n === 1 ? '1 valoare modificată' : `${n} valori modificate`),
  fields: {
    price: { label: 'Preț locuință', help: 'Prețul total plătit, cu TVA inclus pentru construcțiile noi. Valoarea implicită e prețul median cerut în oraș pentru toate apartamentele, vechi și noi, minus marja obișnuită de negociere. Unii dezvoltatori afișează prețul fără TVA (21%): verifică oferta.' },
    rent: { label: 'Chirie lunară', help: 'Chiria pentru o locuință comparabilă. Valoarea implicită pornește de la chiria cerută în anunțuri și de la prețul cerut în aceleași anunțuri, ca să compare aceeași piață; chiria negociată poate fi cu câteva procente mai mică.' },
    downPaymentPct: { label: 'Avans', help: 'Procent din preț plătit din economii.' },
    fixedRate: { label: 'Dobândă fixă', help: 'Dobânda anuală în perioada cu dobândă fixă.' },
    fixedYears: { label: 'Perioadă dobândă fixă', help: '0 = dobândă variabilă de la început.' },
    ircc: { label: 'IRCC actual', help: 'Indicele de referință publicat de BNR, valabil în trimestrul curent.' },
    irccLongRun: { label: 'IRCC pe termen lung', help: 'Ipoteză, nu prognoză: nivelul spre care presupunem că ajunge IRCC în 3 ani. Implicit: inflația plus 1 punct procentual, deci se mișcă odată cu inflația. Nicio prognoză publicată nu merge dincolo de 2028; un interval plauzibil e 3,5–5,5%. Dobânda variabilă urmează acest drum după perioada fixă.' },
    variableMargin: { label: 'Marja băncii', help: 'Se adaugă la IRCC după perioada fixă. Cu salariul la bancă, de obicei 2,2–2,5%; fără, în jur de 3,5%.' },
    loanTermYears: { label: 'Durata creditului', help: 'Numărul de ani în care rambursezi creditul.' },
    horizonYears: { label: 'Orizont de analiză', help: 'Peste câți ani compari cele două variante.' },
    notaryPct: { label: 'Onorariu notar', help: 'Procent aproximativ din preț.' },
    registryPct: { label: 'Intabulare (ANCPI)', help: 'Taxa de înscriere în cartea funciară.' },
    bankFees: { label: 'Comisioane bancă', help: 'Analiză dosar, evaluare, taxa fixă de înscriere a ipotecii și RNPM, plătite doar dacă iei credit. Taxa ANCPI de 0,1% din credit și onorariul notarului pentru contractul de ipotecă se adaugă automat.' },
    buyerAgencyPct: { label: 'Comision agenție la cumpărare', help: 'Procent din preț, cu TVA. De obicei 2% + TVA când cumperi prin agenție; 0 dacă cumperi direct de la dezvoltator sau proprietar.' },
    fitOutCost: { label: 'Amenajare la cumpărare', help: 'Plătită o dată, la cumpărare: mobilă, electrocasnice sau lucrări pe care locuința închiriată comparabilă le are deja. Implicit 0, pentru că nu există date despre câte chirii sunt mobilate. Mobilarea unui apartament cu 2 camere costă în jur de 35.000–55.000 lei la nivel mediu, fără electrocasnice (2026).' },
    propertyTaxAnnual: { label: 'Impozit pe clădire', help: 'Pe an, azi. Se calculează după suprafață și zona din oraș, nu după prețul locuinței, și se indexează anual cu inflația. Valoarea implicită e pentru o zonă medie; verifică pe site-ul primăriei.' },
    homeInsuranceAnnual: { label: 'Asigurare PAD', help: 'Asigurarea obligatorie a locuinței, pe an.' },
    homeInsurancePct: { label: 'Asigurare facultativă', help: 'Polița cerută de bancă la credit, procent anual din valoarea locuinței.' },
    lifeInsurancePct: { label: 'Asigurare de viață', help: 'Procent anual din soldul creditului, dacă banca o cere.' },
    maintenancePct: { label: 'Întreținere și reparații', help: 'Procent anual din valoarea locuinței, inclusiv o renovare completă a apartamentului la circa 20 de ani. Implicit 1%, regula uzuală; o renovare standard la 20 de ani costă cam 1% pe an din prețul mediu național (2026).' },
    propertyGrowth: { label: 'Creștere preț locuință', help: 'Creștere anuală presupusă, nominală. Implicit egală cu inflația: în 2015–2025 prețurile locuințelor au crescut cam cât inflația, iar în termeni reali sunt încă cu peste o treime sub nivelul din 2009.' },
    rentGrowth: { label: 'Creștere chirie', help: 'Creștere anuală presupusă, nominală. Implicit egală cu inflația, cum au crescut chiriile în 2015–2025.' },
    inflation: { label: 'Inflație', help: 'Inflația anuală din România, pe termen lung. Creșterea prețurilor și a chiriilor, randamentul investițiilor, dobânda la depozit și IRCC pe termen lung pornesc implicit de la ea și se mișcă odată cu ea, dacă nu le-ai modificat. Indexează impozitul și costul mutărilor și e folosită pentru afișarea în lei de azi: sumele viitoare sunt readuse la puterea de cumpărare de azi, iar în € sunt apoi convertite la cursul de azi.' },
    investReturn: { label: 'Randament investiții', help: 'Randament anual nominal, în lei, al banilor neinvestiți în locuință, după costurile fondului și înainte de impozit. Implicit: un ETF global de acțiuni, cu 3,5% peste inflație. Pentru un portofoliu mai prudent, folosește o valoare mai mică.' },
    investTaxRate: { label: 'Impozit pe câștig', help: 'Aplicat câștigului din investiții la final. În 2026: 3% prin broker românesc pentru dețineri de peste un an, 16% prin broker străin. CASS, datorat peste anumite praguri de venit, nu e inclus.' },
    savingsRate: { label: 'Dobândă depozit bancar', help: 'Dobânda anuală brută la un depozit la termen în lei. Folosită pentru gospodăriile care nu investesc: banii economisiți, la început și lunar, stau într-un depozit în loc să fie investiți. Implicit egală cu inflația: pe termen lung, dobânzile la depozite au stat în jurul inflației sau sub ea. În septembrie 2026, dobânda medie la depozitele noi ale populației era 5,07% (BNR).' },
    savingsTaxRate: { label: 'Impozit pe dobândă', help: 'Reținut de bancă la plata dobânzii. În 2026: 10%.' },
    renterInsuranceAnnual: { label: 'Asigurare chiriaș', help: 'Pe an.' },
    depositMonths: { label: 'Garanție chirie', help: 'Număr de chirii lunare date ca garanție, returnată la final.' },
    rentAgencyPct: { label: 'Comision agenție la închiriere', help: 'Procent dintr-o chirie lunară, plătit la început și la fiecare mutare. Adesea 50%; 0 dacă închiriezi direct de la proprietar.' },
    moveEveryYears: { label: 'Mutare la fiecare', help: '0 = chiriașul nu se mută. Altfel, se mută la începutul fiecărei perioade de atâția ani: plătește din nou comisionul de agenție și costul mutării, iar garanția se reface la chiria de atunci. Implicit 0: nu există date despre cât stau chiriașii într-o locuință.' },
    moveCost: { label: 'Cost mutare', help: 'Transport, curățenie și altele, pe mutare, azi; se indexează cu inflația. Comisionul de agenție și garanția se adaugă separat.' },
    includeSaleCosts: { label: 'Include costurile de vânzare', help: 'Compară averea lichidă, ca și cum ai vinde la final.' },
    saleAgencyPct: { label: 'Comision agenție', help: 'Procent din prețul de vânzare.' },
    saleTaxShortPct: { label: 'Impozit vânzare (deținere scurtă)', help: 'Procent din prețul de vânzare.' },
    saleTaxLongPct: { label: 'Impozit vânzare (deținere lungă)', help: 'Procent din prețul de vânzare.' },
    saleTaxShortHoldYears: { label: 'Prag deținere scurtă', help: 'Ani până la care se aplică impozitul mai mare.' },
  } satisfies Record<keyof Inputs, FieldText>,
};

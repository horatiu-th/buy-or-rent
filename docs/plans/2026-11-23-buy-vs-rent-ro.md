# Buy vs Rent Calculator (Romania) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** A static, Romanian-language web app that compares buying vs renting a home in Romania via a month-by-month net-worth simulation, with sourced, auto-refreshed defaults.

**Architecture:** A pure TypeScript engine (`src/engine`) turns an `Inputs` object into a monthly timeline, break-even month and equivalent rent. A React UI holds scenario state in the URL and renders Recharts charts. Defaults live in `data/auto.json` (written by a scheduled pipeline) and `data/overrides.json` (hand-edited, wins), merged into `src/data/defaults.json` which the app imports statically.

**Tech Stack:** Vite, React, TypeScript, Recharts, Vitest, Testing Library, tsx (pipeline scripts), GitHub Actions.

**Design doc:** `docs/plans/2026-11-23-buy-vs-rent-ro-design.md`

**Conventions:**
- Commit messages are a single line, e.g. `feat: Added mortgage amortization`. No body, no co-author line.
- All money in the engine is lei (RON). Rates are decimals (`0.05` = 5%). Currency conversion happens only in the UI.
- Comments explain non-obvious *why*, never incidents or ticket numbers.

**Deviations from the design (deliberate, small):**
- No separate VAT input: city price/m² already includes VAT; the price help text says so.
- "Other city" is a data entry (`ro`, national average) rather than special-case code.

---

## Phase 1 — Project setup and engine

### Task 1: Scaffold the project

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/test/setup.ts`, `src/smoke.test.ts`
- Modify: `.gitignore`

**Step 1: Create `package.json`**

```json
{
  "name": "buy-or-rent",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "npm run data:merge && tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "data:merge": "tsx pipeline/merge.ts",
    "data:fetch": "tsx pipeline/run.ts"
  }
}
```

**Step 2: Install dependencies**

Run:
```bash
npm i react react-dom recharts
npm i -D vite @vitejs/plugin-react typescript @types/react @types/react-dom @types/node vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event tsx
```
Expected: installs without errors; `package-lock.json` created.

**Step 3: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "skipLibCheck": true,
    "types": ["vitest/globals", "@testing-library/jest-dom", "node"]
  },
  "include": ["src", "pipeline", "vite.config.ts"]
}
```

**Step 4: Create `vite.config.ts`**

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Relative base so the build works on any static host path (e.g. GitHub Pages project URL).
  base: './',
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
```

**Step 5: Create `index.html`, `src/main.tsx`, `src/App.tsx`, `src/test/setup.ts`**

`index.html`:
```html
<!doctype html>
<html lang="ro">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Cumpăr sau închiriez?</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`src/main.tsx`:
```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

`src/App.tsx` (temporary, replaced in Task 12):
```tsx
export default function App() {
  return <h1>Cumpăr sau închiriez?</h1>;
}
```

`src/test/setup.ts`:
```ts
import '@testing-library/jest-dom/vitest';
```

**Step 6: Add a smoke test** — `src/smoke.test.ts`:
```ts
it('runs tests', () => {
  expect(1 + 1).toBe(2);
});
```

**Step 7: Update `.gitignore`** to:
```
.worktrees/
node_modules/
dist/
pipeline-summary.md
```

**Step 8: Verify**

Run: `npm test && npm run typecheck`
Expected: 1 test passed; typecheck exits 0.

**Step 9: Delete `src/smoke.test.ts` and commit**

```bash
rm src/smoke.test.ts
git add -A
git commit -m "chore: Scaffolded Vite React TypeScript project"
```

---

### Task 2: Engine types

**Files:**
- Create: `src/engine/types.ts`

**Step 1: Write the types**

```ts
export interface Inputs {
  // Property and purchase
  price: number; // lei, VAT included
  downPaymentPct: number;
  notaryPct: number; // of price
  registryPct: number; // ANCPI registration, of price
  bankFees: number; // lei, valuation + loan fees

  // Loan
  loanTermYears: number;
  fixedRate: number; // annual, during the fixed period
  fixedYears: number; // 0 = variable from the start
  ircc: number; // annual, assumed for the whole variable period
  variableMargin: number; // bank margin over IRCC

  // Ownership
  propertyTaxPct: number; // annual, of property value
  homeInsuranceAnnual: number; // lei/year, PAD + optional home policy
  lifeInsurancePct: number; // annual, of outstanding loan balance
  maintenancePct: number; // annual, of property value
  propertyGrowth: number; // annual

  // Renting
  rent: number; // lei/month at start
  rentGrowth: number; // annual, applied once per year
  renterInsuranceAnnual: number; // lei/year
  depositMonths: number;

  // Investing
  investReturn: number; // annual, gross
  investTaxRate: number; // on gains, applied at liquidation

  // Sale at horizon
  includeSaleCosts: boolean;
  saleAgencyPct: number;
  saleTaxShortPct: number; // of sale value, when held <= saleTaxShortHoldYears
  saleTaxLongPct: number;
  saleTaxShortHoldYears: number;

  // Analysis
  horizonYears: number;
  inflation: number; // annual, used only for real-value display
}

export interface MonthRow {
  month: number;
  propertyValue: number;
  loanBalance: number;
  buyerMonthlyCost: number;
  renterMonthlyCost: number;
  buyerNetWorth: number;
  renterNetWorth: number;
  /** Divide a nominal value by this to get today's lei. */
  deflator: number;
}

export interface BuyerTotals {
  downPayment: number;
  acquisitionCosts: number;
  interest: number;
  principal: number;
  propertyTax: number;
  insurance: number;
  maintenance: number;
  saleCosts: number;
  investmentTax: number;
  cashOut: number;
}

export interface RenterTotals {
  rent: number;
  insurance: number;
  investmentTax: number;
  cashOut: number;
}

export interface Result {
  rows: MonthRow[];
  buyer: BuyerTotals;
  renter: RenterTotals;
  /** First month from which the buyer stays ahead through the horizon; null if never. */
  breakEvenMonth: number | null;
}
```

**Step 2: Typecheck and commit**

Run: `npm run typecheck` → exit 0.
```bash
git add src/engine/types.ts
git commit -m "feat: Added engine types"
```

---

### Task 3: Test fixture for inputs

**Files:**
- Create: `src/engine/fixtures.ts`

**Step 1: Write a baseline input used across tests**

```ts
import type { Inputs } from './types';

export const baseInputs: Inputs = {
  price: 500_000,
  downPaymentPct: 0.15,
  notaryPct: 0.01,
  registryPct: 0.0015,
  bankFees: 1_500,
  loanTermYears: 30,
  fixedRate: 0.055,
  fixedYears: 5,
  ircc: 0.055,
  variableMargin: 0.025,
  propertyTaxPct: 0.001,
  homeInsuranceAnnual: 400,
  lifeInsurancePct: 0.0025,
  maintenancePct: 0.01,
  propertyGrowth: 0.03,
  rent: 2_500,
  rentGrowth: 0.04,
  renterInsuranceAnnual: 150,
  depositMonths: 2,
  investReturn: 0.06,
  investTaxRate: 0.1,
  includeSaleCosts: true,
  saleAgencyPct: 0.02,
  saleTaxShortPct: 0.03,
  saleTaxLongPct: 0.01,
  saleTaxShortHoldYears: 3,
  horizonYears: 30,
  inflation: 0.04,
};

/** A world with no growth, returns, running costs or fees, for invariant tests. */
export const flatWorld: Inputs = {
  ...baseInputs,
  notaryPct: 0,
  registryPct: 0,
  bankFees: 0,
  propertyTaxPct: 0,
  homeInsuranceAnnual: 0,
  lifeInsurancePct: 0,
  maintenancePct: 0,
  propertyGrowth: 0,
  rentGrowth: 0,
  renterInsuranceAnnual: 0,
  depositMonths: 0,
  investReturn: 0,
  includeSaleCosts: false,
  inflation: 0,
};
```

**Step 2: Commit**

```bash
git add src/engine/fixtures.ts
git commit -m "test: Added engine input fixtures"
```

---

### Task 4: Mortgage — annuity payment

**Files:**
- Create: `src/engine/mortgage.ts`
- Test: `src/engine/mortgage.test.ts`

**Step 1: Write the failing test**

```ts
import { annuityPayment } from './mortgage';

describe('annuityPayment', () => {
  it('matches the standard 30-year amortization value', () => {
    // 100,000 at 6% over 360 months is a textbook 599.55/month.
    expect(annuityPayment(300_000, 0.06, 360)).toBeCloseTo(1798.65, 2);
  });

  it('splits principal evenly at a zero rate', () => {
    expect(annuityPayment(120_000, 0, 120)).toBe(1000);
  });

  it('returns 0 for no principal or no months', () => {
    expect(annuityPayment(0, 0.05, 360)).toBe(0);
    expect(annuityPayment(100_000, 0.05, 0)).toBe(0);
  });
});
```

**Step 2: Run it to make sure it fails**

Run: `npx vitest run src/engine/mortgage.test.ts`
Expected: FAIL — cannot resolve `./mortgage`.

**Step 3: Implement**

```ts
export function annuityPayment(principal: number, annualRate: number, months: number): number {
  if (principal <= 0 || months <= 0) return 0;
  const r = annualRate / 12;
  if (r === 0) return principal / months;
  return (principal * r) / (1 - Math.pow(1 + r, -months));
}
```

**Step 4: Run tests** — `npx vitest run src/engine/mortgage.test.ts` → PASS.

**Step 5: Commit**

```bash
git add src/engine/mortgage.ts src/engine/mortgage.test.ts
git commit -m "feat: Added annuity payment calculation"
```

---

### Task 5: Mortgage — amortization with fixed→variable switch

**Files:**
- Modify: `src/engine/mortgage.ts`
- Test: `src/engine/mortgage.test.ts`

**Step 1: Add failing tests**

```ts
import { amortize, annuityPayment } from './mortgage';

describe('amortize', () => {
  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

  it('repays exactly the principal and ends at zero', () => {
    const s = amortize({ principal: 300_000, termMonths: 360, fixedRate: 0.06, fixedMonths: 360, variableRate: 0.08 });
    expect(s).toHaveLength(360);
    expect(sum(s.map((m) => m.principal))).toBeCloseTo(300_000, 6);
    expect(s[359].balance).toBe(0);
  });

  it('keeps a constant payment while fixed', () => {
    const s = amortize({ principal: 300_000, termMonths: 360, fixedRate: 0.06, fixedMonths: 360, variableRate: 0.08 });
    expect(s[0].payment).toBeCloseTo(1798.65, 2);
    expect(s[200].payment).toBeCloseTo(1798.65, 2);
  });

  it('recalculates the payment on the remaining balance after the fixed period', () => {
    const s = amortize({ principal: 300_000, termMonths: 360, fixedRate: 0.05, fixedMonths: 60, variableRate: 0.07 });
    const expected = annuityPayment(s[59].balance, 0.07, 300);
    expect(s[60].payment).toBeCloseTo(expected, 6);
    expect(s[60].interest).toBeCloseTo(s[59].balance * 0.07 / 12, 6);
  });

  it('uses the variable rate from the start when fixedMonths is 0', () => {
    const s = amortize({ principal: 100_000, termMonths: 120, fixedRate: 0.03, fixedMonths: 0, variableRate: 0.07 });
    expect(s[0].payment).toBeCloseTo(annuityPayment(100_000, 0.07, 120), 6);
  });

  it('returns all-zero months for a zero loan', () => {
    const s = amortize({ principal: 0, termMonths: 12, fixedRate: 0.05, fixedMonths: 12, variableRate: 0.05 });
    expect(s.every((m) => m.payment === 0 && m.balance === 0)).toBe(true);
  });
});
```

**Step 2: Run** — `npx vitest run src/engine/mortgage.test.ts` → FAIL (`amortize` not exported).

**Step 3: Implement** — append to `src/engine/mortgage.ts`:

```ts
export interface LoanParams {
  principal: number;
  termMonths: number;
  fixedRate: number;
  fixedMonths: number;
  variableRate: number;
}

export interface LoanMonth {
  payment: number;
  interest: number;
  principal: number;
  balance: number; // after this month's payment
}

export function amortize(p: LoanParams): LoanMonth[] {
  const schedule: LoanMonth[] = [];
  let balance = p.principal;
  let rate = p.fixedMonths > 0 ? p.fixedRate : p.variableRate;
  let payment = annuityPayment(balance, rate, p.termMonths);

  for (let m = 1; m <= p.termMonths; m++) {
    if (p.fixedMonths > 0 && m === p.fixedMonths + 1) {
      rate = p.variableRate;
      payment = annuityPayment(balance, rate, p.termMonths - p.fixedMonths);
    }
    const interest = (balance * rate) / 12;
    // The last payment absorbs floating-point drift so the loan closes at exactly zero.
    const principal = m === p.termMonths ? balance : payment - interest;
    balance = m === p.termMonths ? 0 : balance - principal;
    schedule.push({ payment: interest + principal, interest, principal, balance });
  }
  return schedule;
}
```

**Step 4: Run** → PASS.

**Step 5: Commit**

```bash
git add src/engine/mortgage.ts src/engine/mortgage.test.ts
git commit -m "feat: Added mortgage amortization with fixed to variable switch"
```

---

### Task 6: Acquisition and sale costs

**Files:**
- Create: `src/engine/costs.ts`
- Test: `src/engine/costs.test.ts`

**Step 1: Failing test**

```ts
import { acquisitionCosts, saleCosts } from './costs';
import { baseInputs } from './fixtures';

describe('acquisitionCosts', () => {
  it('adds percentage fees on price plus fixed bank fees', () => {
    // 500,000 × (1% + 0.15%) + 1,500
    expect(acquisitionCosts(baseInputs)).toBeCloseTo(7_250, 6);
  });
});

describe('saleCosts', () => {
  it('uses the short-hold tax rate up to the threshold', () => {
    expect(saleCosts(600_000, 36, baseInputs)).toBeCloseTo(600_000 * (0.02 + 0.03), 6);
  });

  it('uses the long-hold tax rate after the threshold', () => {
    expect(saleCosts(600_000, 37, baseInputs)).toBeCloseTo(600_000 * (0.02 + 0.01), 6);
  });

  it('is zero when sale costs are excluded', () => {
    expect(saleCosts(600_000, 120, { ...baseInputs, includeSaleCosts: false })).toBe(0);
  });
});
```

**Step 2: Run** → FAIL.

**Step 3: Implement**

```ts
import type { Inputs } from './types';

export function acquisitionCosts(i: Inputs): number {
  return i.price * (i.notaryPct + i.registryPct) + i.bankFees;
}

export function saleCosts(value: number, monthsHeld: number, i: Inputs): number {
  if (!i.includeSaleCosts) return 0;
  const taxPct = monthsHeld <= i.saleTaxShortHoldYears * 12 ? i.saleTaxShortPct : i.saleTaxLongPct;
  return value * (i.saleAgencyPct + taxPct);
}
```

**Step 4: Run** → PASS.

**Step 5: Commit**

```bash
git add src/engine/costs.ts src/engine/costs.test.ts
git commit -m "feat: Added acquisition and sale cost calculations"
```

---

### Task 7: Simulation

**Files:**
- Create: `src/engine/simulate.ts`
- Test: `src/engine/simulate.test.ts`

**Step 1: Failing tests (invariants)**

```ts
import { simulate } from './simulate';
import { acquisitionCosts } from './costs';
import { baseInputs, flatWorld } from './fixtures';

const last = <T,>(xs: T[]) => xs[xs.length - 1];

describe('simulate', () => {
  it('produces one row per month plus month 0', () => {
    expect(simulate(baseInputs).rows).toHaveLength(30 * 12 + 1);
  });

  it('starts the renter ahead by exactly the sunk acquisition costs', () => {
    const i = { ...baseInputs, includeSaleCosts: false };
    const r0 = simulate(i).rows[0];
    expect(r0.renterNetWorth - r0.buyerNetWorth).toBeCloseTo(acquisitionCosts(i), 6);
  });

  it('spends the same total cash on both sides', () => {
    const { buyer, renter } = simulate(baseInputs);
    expect(buyer.cashOut).toBeCloseTo(renter.cashOut, 4);
  });

  it('in a flat world with a cash purchase and free rent, the gap is only the fees', () => {
    const i = { ...flatWorld, downPaymentPct: 1, rent: 0, notaryPct: 0.01 };
    const end = last(simulate(i).rows);
    expect(end.buyerNetWorth).toBeCloseTo(i.price, 6);
    expect(end.renterNetWorth - end.buyerNetWorth).toBeCloseTo(i.price * 0.01, 6);
  });

  it('pays off the loan by the end of the term', () => {
    const { rows } = simulate(baseInputs);
    expect(rows[360].loanBalance).toBe(0);
  });

  it('favours renting when rent is tiny and buying when rent is huge', () => {
    const cheap = last(simulate({ ...baseInputs, rent: 100 }).rows);
    const pricey = last(simulate({ ...baseInputs, rent: 10_000 }).rows);
    expect(cheap.renterNetWorth).toBeGreaterThan(cheap.buyerNetWorth);
    expect(pricey.buyerNetWorth).toBeGreaterThan(pricey.renterNetWorth);
  });

  it('raises rent once per year', () => {
    const { rows } = simulate({ ...flatWorld, rentGrowth: 0.1 });
    expect(rows[12].renterMonthlyCost).toBeCloseTo(2_500, 6);
    expect(rows[13].renterMonthlyCost).toBeCloseTo(2_750, 6);
  });

  it('exposes a deflator that grows with inflation', () => {
    const { rows } = simulate({ ...baseInputs, inflation: 0.05 });
    expect(rows[12].deflator).toBeCloseTo(1.05, 6);
  });

  it('reports a break-even month only when the buyer stays ahead', () => {
    const r = simulate({ ...baseInputs, rent: 10_000 });
    expect(r.breakEvenMonth).not.toBeNull();
    const after = r.rows.filter((row) => row.month >= r.breakEvenMonth!);
    expect(after.every((row) => row.buyerNetWorth >= row.renterNetWorth)).toBe(true);
    expect(simulate({ ...baseInputs, rent: 100 }).breakEvenMonth).toBeNull();
  });
});
```

**Step 2: Run** → FAIL.

**Step 3: Implement**

```ts
import { amortize } from './mortgage';
import { acquisitionCosts, saleCosts } from './costs';
import type { BuyerTotals, Inputs, MonthRow, RenterTotals, Result } from './types';

interface Portfolio {
  value: number;
  basis: number; // contributions, so only gains are taxed at liquidation
}

const monthlyRate = (annual: number) => Math.pow(1 + annual, 1 / 12) - 1;

function liquidate(p: Portfolio, taxRate: number) {
  const tax = Math.max(0, p.value - p.basis) * taxRate;
  return { net: p.value - tax, tax };
}

function contribute(p: Portfolio, amount: number) {
  p.value += amount;
  p.basis += amount;
}

export function breakEven(rows: MonthRow[]): number | null {
  // Counted from the last month the buyer is behind, so an early, temporary lead doesn't count.
  let lastBehind = 0;
  for (const r of rows) if (r.month > 0 && r.buyerNetWorth < r.renterNetWorth) lastBehind = r.month;
  const end = rows[rows.length - 1].month;
  return lastBehind === end ? null : lastBehind + 1;
}

export function simulate(i: Inputs): Result {
  const months = Math.round(i.horizonYears * 12);
  const loanAmount = i.price * (1 - i.downPaymentPct);
  const downPayment = i.price - loanAmount;
  const acq = acquisitionCosts(i);
  const upfront = downPayment + acq;
  const deposit = i.rent * i.depositMonths;

  const schedule = amortize({
    principal: loanAmount,
    termMonths: Math.round(i.loanTermYears * 12),
    fixedRate: i.fixedRate,
    fixedMonths: Math.round(i.fixedYears * 12),
    variableRate: i.ircc + i.variableMargin,
  });

  // Both households start with the same cash; whoever spends less upfront invests the difference.
  const startGap = upfront - deposit;
  const buyerPf: Portfolio = { value: 0, basis: 0 };
  const renterPf: Portfolio = { value: 0, basis: 0 };
  contribute(startGap > 0 ? renterPf : buyerPf, Math.abs(startGap));

  const buyer: BuyerTotals = {
    downPayment, acquisitionCosts: acq, interest: 0, principal: 0, propertyTax: 0,
    insurance: 0, maintenance: 0, saleCosts: 0, investmentTax: 0, cashOut: upfront + buyerPf.basis,
  };
  const renter: RenterTotals = { rent: 0, insurance: 0, investmentTax: 0, cashOut: deposit + renterPf.basis };

  const gProp = monthlyRate(i.propertyGrowth);
  const gInv = monthlyRate(i.investReturn);
  const gInf = monthlyRate(i.inflation);
  let value = i.price;
  let balance = loanAmount;

  const snapshot = (month: number, buyerCost: number, renterCost: number): MonthRow => ({
    month,
    propertyValue: value,
    loanBalance: balance,
    buyerMonthlyCost: buyerCost,
    renterMonthlyCost: renterCost,
    buyerNetWorth: value - balance - saleCosts(value, month, i) + liquidate(buyerPf, i.investTaxRate).net,
    renterNetWorth: liquidate(renterPf, i.investTaxRate).net + deposit,
    deflator: Math.pow(1 + gInf, month),
  });

  const rows: MonthRow[] = [snapshot(0, 0, 0)];

  for (let m = 1; m <= months; m++) {
    const loanMonth = schedule[m - 1];
    const balanceBefore = balance;
    value *= 1 + gProp;

    let payment = 0;
    if (loanMonth) {
      payment = loanMonth.payment;
      buyer.interest += loanMonth.interest;
      buyer.principal += loanMonth.principal;
      balance = loanMonth.balance;
    }
    const propertyTax = (value * i.propertyTaxPct) / 12;
    const insurance = i.homeInsuranceAnnual / 12 + (balanceBefore * i.lifeInsurancePct) / 12;
    const maintenance = (value * i.maintenancePct) / 12;
    const buyerCost = payment + propertyTax + insurance + maintenance;
    buyer.propertyTax += propertyTax;
    buyer.insurance += insurance;
    buyer.maintenance += maintenance;

    const rent = i.rent * Math.pow(1 + i.rentGrowth, Math.floor((m - 1) / 12));
    const renterInsurance = i.renterInsuranceAnnual / 12;
    const renterCost = rent + renterInsurance;
    renter.rent += rent;
    renter.insurance += renterInsurance;

    buyerPf.value *= 1 + gInv;
    renterPf.value *= 1 + gInv;
    const diff = buyerCost - renterCost;
    contribute(diff > 0 ? renterPf : buyerPf, Math.abs(diff));
    buyer.cashOut += buyerCost + Math.max(0, -diff);
    renter.cashOut += renterCost + Math.max(0, diff);

    rows.push(snapshot(m, buyerCost, renterCost));
  }

  buyer.saleCosts = saleCosts(value, months, i);
  buyer.investmentTax = liquidate(buyerPf, i.investTaxRate).tax;
  renter.investmentTax = liquidate(renterPf, i.investTaxRate).tax;

  return { rows, buyer, renter, breakEvenMonth: breakEven(rows) };
}
```

**Step 4: Run** — `npx vitest run src/engine` → all PASS. If "favours buying when rent is huge" fails, print the final row and check signs before changing the test.

**Step 5: Commit**

```bash
git add src/engine/simulate.ts src/engine/simulate.test.ts
git commit -m "feat: Added month by month buy vs rent simulation"
```

---

### Task 8: Equivalent rent and sensitivity

**Files:**
- Create: `src/engine/solve.ts`, `src/engine/index.ts`
- Test: `src/engine/solve.test.ts`

**Step 1: Failing tests**

```ts
import { equivalentRent, finalGap, sensitivity } from './solve';
import { baseInputs } from './fixtures';

describe('equivalentRent', () => {
  it('finds the rent at which both sides end equal', () => {
    const r = equivalentRent(baseInputs);
    expect(r.kind).toBe('value');
    if (r.kind !== 'value') return;
    expect(Math.abs(finalGap({ ...baseInputs, rent: r.rent }))).toBeLessThan(1);
  });

  it('reports alwaysBuy when buying wins even at zero rent', () => {
    expect(equivalentRent({ ...baseInputs, propertyGrowth: 0.2 }).kind).toBe('alwaysBuy');
  });

  it('reports alwaysRent when renting wins at any plausible rent', () => {
    expect(equivalentRent({ ...baseInputs, propertyGrowth: -0.1, investReturn: 0.15 }).kind).toBe('alwaysRent');
  });
});

describe('sensitivity', () => {
  it('returns a 3×3 grid whose centre is the base case', () => {
    const g = sensitivity(baseInputs);
    expect(g).toHaveLength(3);
    expect(g[1][1]).toBeCloseTo(finalGap(baseInputs), 6);
    // Higher property growth helps the buyer.
    expect(g[2][1]).toBeGreaterThan(g[0][1]);
  });
});
```

**Step 2: Run** → FAIL.

**Step 3: Implement** `src/engine/solve.ts`:

```ts
import { simulate } from './simulate';
import type { Inputs } from './types';

export type EquivalentRent =
  | { kind: 'value'; rent: number }
  | { kind: 'alwaysBuy' }
  | { kind: 'alwaysRent' };

/** Buyer net worth minus renter net worth at the horizon. */
export function finalGap(i: Inputs): number {
  const rows = simulate(i).rows;
  const last = rows[rows.length - 1];
  return last.buyerNetWorth - last.renterNetWorth;
}

export function equivalentRent(i: Inputs): EquivalentRent {
  const gapAt = (rent: number) => finalGap({ ...i, rent });
  let lo = 0;
  // 2% of the price per month is far above any realistic rent, so it bounds the search.
  let hi = i.price * 0.02;
  if (gapAt(lo) >= 0) return { kind: 'alwaysBuy' };
  if (gapAt(hi) <= 0) return { kind: 'alwaysRent' };
  for (let k = 0; k < 40; k++) {
    const mid = (lo + hi) / 2;
    if (gapAt(mid) < 0) lo = mid;
    else hi = mid;
  }
  return { kind: 'value', rent: (lo + hi) / 2 };
}

export const SENSITIVITY_STEPS = [-0.02, 0, 0.02];

/** Rows vary property growth, columns vary investment return. Cells are finalGap. */
export function sensitivity(i: Inputs): number[][] {
  return SENSITIVITY_STEPS.map((dp) =>
    SENSITIVITY_STEPS.map((dr) =>
      finalGap({ ...i, propertyGrowth: i.propertyGrowth + dp, investReturn: i.investReturn + dr }),
    ),
  );
}
```

`src/engine/index.ts`:
```ts
export * from './types';
export { simulate } from './simulate';
export { equivalentRent, finalGap, sensitivity, SENSITIVITY_STEPS } from './solve';
export type { EquivalentRent } from './solve';
```

**Step 4: Run** → PASS. If an `alwaysBuy`/`alwaysRent` test fails because the chosen extremes aren't extreme enough, push the parameters further rather than loosening the solver.

**Step 5: Commit**

```bash
git add src/engine
git commit -m "feat: Added equivalent rent solver and sensitivity grid"
```

---

### Task 9: Reference scenario snapshots

**Files:**
- Test: `src/engine/scenarios.test.ts`

**Step 1: Write snapshot tests**

```ts
import { simulate, equivalentRent } from './index';
import { baseInputs } from './fixtures';

const summarize = (i: typeof baseInputs) => {
  const r = simulate(i);
  const end = r.rows[r.rows.length - 1];
  const round = (x: number) => Math.round(x);
  return {
    buyer: round(end.buyerNetWorth),
    renter: round(end.renterNetWorth),
    breakEvenMonth: r.breakEvenMonth,
    equivalentRent: equivalentRent(i),
  };
};

it('2-room flat, existing build', () => {
  expect(summarize({ ...baseInputs, price: 450_000, rent: 2_300 })).toMatchSnapshot();
});

it('3-room flat, new build', () => {
  expect(summarize({ ...baseInputs, price: 750_000, rent: 3_500 })).toMatchSnapshot();
});

it('cash purchase, short horizon', () => {
  expect(summarize({ ...baseInputs, downPaymentPct: 1, horizonYears: 5 })).toMatchSnapshot();
});
```

**Step 2: Run** — `npx vitest run src/engine/scenarios.test.ts` → snapshots written. Read them in `src/engine/__snapshots__/` and sanity-check (e.g. the 5-year cash scenario should favour renting because of fees and sale tax).

**Step 3: Commit**

```bash
git add src/engine/scenarios.test.ts src/engine/__snapshots__
git commit -m "test: Added reference scenario snapshots"
```

---

## Phase 2 — Data model and defaults

### Task 10: Data schema, merge and placeholder overrides

**Files:**
- Create: `src/data/schema.ts`, `pipeline/mergeData.ts`, `pipeline/merge.ts`, `data/overrides.json`, `data/auto.json`
- Generated: `src/data/defaults.json`
- Test: `pipeline/mergeData.test.ts`

**Step 1: Schema** — `src/data/schema.ts`:

```ts
export type Status = 'ok' | 'stale' | 'manual';

export interface SourcedValue {
  value: number;
  unit: string;
  source: string;
  sourceUrl?: string;
  asOf: string; // YYYY-MM-DD
  status: Status;
}

export interface CityData {
  name: string;
  priceSqmEurNew: SourcedValue;
  priceSqmEurExisting: SourcedValue;
  rentSqmEur: SourcedValue;
  propertyTaxPct?: SourcedValue;
}

export interface DataFile {
  values: Record<string, SourcedValue>;
  cities: Record<string, CityData>;
}

export interface PartialDataFile {
  values?: Record<string, SourcedValue>;
  cities?: Record<string, Partial<CityData>>;
}

/** Global defaults every merged file must contain. */
export const REQUIRED_VALUE_KEYS = [
  'eurRon', 'downPaymentPct', 'notaryPct', 'registryPct', 'bankFees', 'loanTermYears',
  'fixedRate', 'fixedYears', 'ircc', 'variableMargin', 'propertyTaxPct', 'homeInsuranceAnnual',
  'lifeInsurancePct', 'maintenancePct', 'propertyGrowth', 'rentGrowth', 'renterInsuranceAnnual',
  'depositMonths', 'investReturn', 'investTaxRate', 'saleAgencyPct', 'saleTaxShortPct',
  'saleTaxLongPct', 'saleTaxShortHoldYears', 'horizonYears', 'inflation',
] as const;

export const REQUIRED_CITY_KEYS = ['name', 'priceSqmEurNew', 'priceSqmEurExisting', 'rentSqmEur'] as const;
```

**Step 2: Failing test** — `pipeline/mergeData.test.ts`:

```ts
import { mergeData } from './mergeData';
import { REQUIRED_VALUE_KEYS, type SourcedValue } from '../src/data/schema';

const sv = (value: number, source = 'x'): SourcedValue => ({ value, unit: '', source, asOf: '2026-01-01', status: 'ok' });
const allValues = Object.fromEntries(REQUIRED_VALUE_KEYS.map((k) => [k, sv(1)]));
const city = { name: 'Cluj', priceSqmEurNew: sv(3000), priceSqmEurExisting: sv(2800), rentSqmEur: sv(15) };

describe('mergeData', () => {
  it('lets overrides win over auto values', () => {
    const out = mergeData(
      { values: { ...allValues, ircc: sv(0.06, 'auto') }, cities: { cluj: city } },
      { values: { ircc: sv(0.05, 'manual') } },
    );
    expect(out.values.ircc.value).toBe(0.05);
  });

  it('merges cities field by field', () => {
    const out = mergeData(
      { values: allValues, cities: { cluj: city } },
      { cities: { cluj: { rentSqmEur: sv(16) } } },
    );
    expect(out.cities.cluj.rentSqmEur.value).toBe(16);
    expect(out.cities.cluj.priceSqmEurNew.value).toBe(3000);
  });

  it('throws when a required value is missing', () => {
    expect(() => mergeData({ values: {}, cities: { cluj: city } }, {})).toThrow(/eurRon/);
  });

  it('throws when a city is incomplete', () => {
    expect(() => mergeData({ values: allValues, cities: { cluj: { name: 'Cluj' } } }, {})).toThrow(/cluj/);
  });
});
```

**Step 3: Run** — `npx vitest run pipeline` → FAIL.

**Step 4: Implement** `pipeline/mergeData.ts`:

```ts
import {
  REQUIRED_CITY_KEYS, REQUIRED_VALUE_KEYS,
  type CityData, type DataFile, type PartialDataFile,
} from '../src/data/schema';

export function mergeData(auto: PartialDataFile, overrides: PartialDataFile): DataFile {
  const values = { ...auto.values, ...overrides.values };
  for (const k of REQUIRED_VALUE_KEYS) {
    if (!values[k]) throw new Error(`Missing required value: ${k}`);
  }

  const cityIds = new Set([...Object.keys(auto.cities ?? {}), ...Object.keys(overrides.cities ?? {})]);
  const cities: Record<string, CityData> = {};
  for (const id of cityIds) {
    const merged = { ...auto.cities?.[id], ...overrides.cities?.[id] };
    for (const k of REQUIRED_CITY_KEYS) {
      if (!merged[k]) throw new Error(`City ${id} is missing ${k}`);
    }
    cities[id] = merged as CityData;
  }
  if (cityIds.size === 0) throw new Error('No cities defined');
  return { values, cities };
}
```

`pipeline/merge.ts` (CLI):
```ts
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { mergeData } from './mergeData';

const read = (path: string) => (existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : {});
const out = mergeData(read('data/auto.json'), read('data/overrides.json'));
writeFileSync('src/data/defaults.json', JSON.stringify(out, null, 2) + '\n');
console.log(`Merged ${Object.keys(out.values).length} values and ${Object.keys(out.cities).length} cities.`);
```

**Step 5: Create `data/auto.json`** with `{}`.

**Step 6: Create `data/overrides.json` with placeholder values.**

Every value below is a **placeholder, not verified**. It is marked `"source": "Placeholder – de verificat"` and `"status": "manual"` so the UI shows it honestly until Task 19 replaces it. Write each `SourcedValue` on one line:

```json
{
  "values": {
    "eurRon":               { "value": 5.1,    "unit": "lei/€", "source": "Placeholder – de verificat", "asOf": "2026-11-23", "status": "manual" },
    "downPaymentPct":       { "value": 0.15,   "unit": "%",     "source": "Placeholder – de verificat", "asOf": "2026-11-23", "status": "manual" },
    "notaryPct":            { "value": 0.01,   "unit": "%",     "source": "Placeholder – de verificat", "asOf": "2026-11-23", "status": "manual" },
    "registryPct":          { "value": 0.0015, "unit": "%",     "source": "Placeholder – de verificat", "asOf": "2026-11-23", "status": "manual" },
    "bankFees":             { "value": 1500,   "unit": "lei",   "source": "Placeholder – de verificat", "asOf": "2026-11-23", "status": "manual" },
    "loanTermYears":        { "value": 30,     "unit": "ani",   "source": "Placeholder – de verificat", "asOf": "2026-11-23", "status": "manual" },
    "fixedRate":            { "value": 0.055,  "unit": "%",     "source": "Placeholder – de verificat", "asOf": "2026-11-23", "status": "manual" },
    "fixedYears":           { "value": 5,      "unit": "ani",   "source": "Placeholder – de verificat", "asOf": "2026-11-23", "status": "manual" },
    "ircc":                 { "value": 0.055,  "unit": "%",     "source": "Placeholder – de verificat", "asOf": "2026-11-23", "status": "manual" },
    "variableMargin":       { "value": 0.025,  "unit": "%",     "source": "Placeholder – de verificat", "asOf": "2026-11-23", "status": "manual" },
    "propertyTaxPct":       { "value": 0.001,  "unit": "%",     "source": "Placeholder – de verificat", "asOf": "2026-11-23", "status": "manual" },
    "homeInsuranceAnnual":  { "value": 400,    "unit": "lei",   "source": "Placeholder – de verificat", "asOf": "2026-11-23", "status": "manual" },
    "lifeInsurancePct":     { "value": 0.0025, "unit": "%",     "source": "Placeholder – de verificat", "asOf": "2026-11-23", "status": "manual" },
    "maintenancePct":       { "value": 0.01,   "unit": "%",     "source": "Placeholder – de verificat", "asOf": "2026-11-23", "status": "manual" },
    "propertyGrowth":       { "value": 0.03,   "unit": "%",     "source": "Placeholder – de verificat", "asOf": "2026-11-23", "status": "manual" },
    "rentGrowth":           { "value": 0.04,   "unit": "%",     "source": "Placeholder – de verificat", "asOf": "2026-11-23", "status": "manual" },
    "renterInsuranceAnnual":{ "value": 150,    "unit": "lei",   "source": "Placeholder – de verificat", "asOf": "2026-11-23", "status": "manual" },
    "depositMonths":        { "value": 2,      "unit": "luni",  "source": "Placeholder – de verificat", "asOf": "2026-11-23", "status": "manual" },
    "investReturn":         { "value": 0.06,   "unit": "%",     "source": "Placeholder – de verificat", "asOf": "2026-11-23", "status": "manual" },
    "investTaxRate":        { "value": 0.1,    "unit": "%",     "source": "Placeholder – de verificat", "asOf": "2026-11-23", "status": "manual" },
    "saleAgencyPct":        { "value": 0.02,   "unit": "%",     "source": "Placeholder – de verificat", "asOf": "2026-11-23", "status": "manual" },
    "saleTaxShortPct":      { "value": 0.03,   "unit": "%",     "source": "Placeholder – de verificat", "asOf": "2026-11-23", "status": "manual" },
    "saleTaxLongPct":       { "value": 0.01,   "unit": "%",     "source": "Placeholder – de verificat", "asOf": "2026-11-23", "status": "manual" },
    "saleTaxShortHoldYears":{ "value": 3,      "unit": "ani",   "source": "Placeholder – de verificat", "asOf": "2026-11-23", "status": "manual" },
    "horizonYears":         { "value": 30,     "unit": "ani",   "source": "Placeholder – de verificat", "asOf": "2026-11-23", "status": "manual" },
    "inflation":            { "value": 0.04,   "unit": "%",     "source": "Placeholder – de verificat", "asOf": "2026-11-23", "status": "manual" }
  },
  "cities": {
    "bucuresti":   { "name": "București",       "priceSqmEurNew": {...}, "priceSqmEurExisting": {...}, "rentSqmEur": {...} },
    "cluj":        { "name": "Cluj-Napoca",     ... },
    "timisoara":   { "name": "Timișoara",       ... },
    "iasi":        { "name": "Iași",            ... },
    "brasov":      { "name": "Brașov",          ... },
    "constanta":   { "name": "Constanța",       ... },
    "oradea":      { "name": "Oradea",          ... },
    "sibiu":       { "name": "Sibiu",           ... },
    "ro":          { "name": "Alt oraș (medie națională)", ... }
  }
}
```

For each city, fill the three `SourcedValue` objects with the same placeholder source/status/date and these rough placeholder numbers (€/m²: new / existing / rent):

| id | new | existing | rent |
|---|---|---|---|
| bucuresti | 2200 | 2000 | 13 |
| cluj | 3000 | 2800 | 15 |
| timisoara | 1900 | 1700 | 11 |
| iasi | 1800 | 1600 | 10 |
| brasov | 2300 | 2100 | 11 |
| constanta | 1900 | 1800 | 10 |
| oradea | 1700 | 1500 | 9 |
| sibiu | 2000 | 1800 | 10 |
| ro | 1700 | 1500 | 9 |

Units: `"€/m²"` for prices, `"€/m²/lună"` for rent.

**Step 7: Run merge and tests**

Run: `npm run data:merge && npx vitest run pipeline`
Expected: `Merged 26 values and 9 cities.`; tests PASS; `src/data/defaults.json` exists.

**Step 8: Commit** (the generated file is committed so `npm run dev` works without a merge step)

```bash
git add src/data/schema.ts pipeline data src/data/defaults.json
git commit -m "feat: Added data schema, merge script and placeholder defaults"
```

---

### Task 11: Build inputs from defaults

**Files:**
- Create: `src/data/defaults.ts`
- Test: `src/data/defaults.test.ts`

**Step 1: Failing test**

```ts
import { buildInputs, sourceFor, loadDefaults } from './defaults';

const data = loadDefaults();

describe('buildInputs', () => {
  it('derives price and rent from city €/m², size and the exchange rate', () => {
    const i = buildInputs(data, 'cluj', 'new', 50);
    const c = data.cities.cluj;
    const eur = data.values.eurRon.value;
    expect(i.price).toBe(Math.round(c.priceSqmEurNew.value * 50 * eur));
    expect(i.rent).toBe(Math.round(c.rentSqmEur.value * 50 * eur));
  });

  it('uses existing-build prices for existing properties', () => {
    expect(buildInputs(data, 'cluj', 'existing', 50).price).toBeLessThan(buildInputs(data, 'cluj', 'new', 50).price);
  });

  it('falls back to the first city for an unknown id', () => {
    expect(buildInputs(data, 'nope', 'new', 50)).toEqual(buildInputs(data, Object.keys(data.cities)[0], 'new', 50));
  });
});

describe('sourceFor', () => {
  it('returns the city rent source for rent', () => {
    expect(sourceFor(data, 'cluj', 'new', 'rent')).toBe(data.cities.cluj.rentSqmEur);
  });
  it('returns global values for other keys', () => {
    expect(sourceFor(data, 'cluj', 'new', 'ircc')).toBe(data.values.ircc);
  });
});
```

**Step 2: Run** → FAIL.

**Step 3: Implement** `src/data/defaults.ts`:

```ts
import raw from './defaults.json';
import type { DataFile, SourcedValue } from './schema';
import type { Inputs } from '../engine';

export type PropertyType = 'new' | 'existing';

export function loadDefaults(): DataFile {
  return raw as DataFile;
}

function cityOf(data: DataFile, cityId: string) {
  return data.cities[cityId] ?? Object.values(data.cities)[0];
}

export function buildInputs(data: DataFile, cityId: string, type: PropertyType, sqm: number): Inputs {
  const v = (k: string) => {
    const x = data.values[k];
    if (!x) throw new Error(`Missing default: ${k}`);
    return x.value;
  };
  const city = cityOf(data, cityId);
  const eur = v('eurRon');
  const priceSqm = type === 'new' ? city.priceSqmEurNew.value : city.priceSqmEurExisting.value;

  return {
    price: Math.round(priceSqm * sqm * eur),
    rent: Math.round(city.rentSqmEur.value * sqm * eur),
    propertyTaxPct: city.propertyTaxPct?.value ?? v('propertyTaxPct'),
    includeSaleCosts: true,
    downPaymentPct: v('downPaymentPct'),
    notaryPct: v('notaryPct'),
    registryPct: v('registryPct'),
    bankFees: v('bankFees'),
    loanTermYears: v('loanTermYears'),
    fixedRate: v('fixedRate'),
    fixedYears: v('fixedYears'),
    ircc: v('ircc'),
    variableMargin: v('variableMargin'),
    homeInsuranceAnnual: v('homeInsuranceAnnual'),
    lifeInsurancePct: v('lifeInsurancePct'),
    maintenancePct: v('maintenancePct'),
    propertyGrowth: v('propertyGrowth'),
    rentGrowth: v('rentGrowth'),
    renterInsuranceAnnual: v('renterInsuranceAnnual'),
    depositMonths: v('depositMonths'),
    investReturn: v('investReturn'),
    investTaxRate: v('investTaxRate'),
    saleAgencyPct: v('saleAgencyPct'),
    saleTaxShortPct: v('saleTaxShortPct'),
    saleTaxLongPct: v('saleTaxLongPct'),
    saleTaxShortHoldYears: v('saleTaxShortHoldYears'),
    horizonYears: v('horizonYears'),
    inflation: v('inflation'),
  };
}

/** Where a field's default came from, for the source tag next to each input. */
export function sourceFor(data: DataFile, cityId: string, type: PropertyType, key: keyof Inputs): SourcedValue | undefined {
  const city = cityOf(data, cityId);
  if (key === 'price') return type === 'new' ? city.priceSqmEurNew : city.priceSqmEurExisting;
  if (key === 'rent') return city.rentSqmEur;
  if (key === 'propertyTaxPct') return city.propertyTaxPct ?? data.values.propertyTaxPct;
  return data.values[key];
}
```

**Step 4: Run** → PASS. **Step 5: Commit**

```bash
git add src/data/defaults.ts src/data/defaults.test.ts
git commit -m "feat: Added inputs builder from city defaults"
```

---

## Phase 3 — UI

### Task 12: Romanian strings and field definitions

**Files:**
- Create: `src/i18n/ro.ts`, `src/ui/fields.ts`, `src/ui/format.ts`
- Test: `src/ui/format.test.ts`

**Step 1: Failing test for formatters**

```ts
import { formatMoney, formatDuration } from './format';

describe('formatMoney', () => {
  it('formats lei with Romanian grouping', () => {
    expect(formatMoney(1234567, 'RON', 1)).toBe('1.234.567 lei');
  });
  it('converts to euro', () => {
    expect(formatMoney(5100, 'EUR', 5.1)).toBe('1.000 €');
  });
});

describe('formatDuration', () => {
  it('formats months as years and months', () => {
    expect(formatDuration(1)).toBe('1 lună');
    expect(formatDuration(12)).toBe('1 an');
    expect(formatDuration(27)).toBe('2 ani și 3 luni');
  });
});
```

**Step 2: Run** → FAIL.

**Step 3: Implement** `src/ui/format.ts`:

```ts
export type Currency = 'RON' | 'EUR';

const intFmt = new Intl.NumberFormat('ro-RO', { maximumFractionDigits: 0 });

export function formatMoney(lei: number, currency: Currency, eurRon: number): string {
  const amount = currency === 'EUR' ? lei / eurRon : lei;
  return `${intFmt.format(Math.round(amount))} ${currency === 'EUR' ? '€' : 'lei'}`;
}

export function formatDuration(months: number): string {
  const y = Math.floor(months / 12);
  const m = months % 12;
  const years = y === 0 ? '' : y === 1 ? '1 an' : `${y} ani`;
  const mons = m === 0 ? '' : m === 1 ? '1 lună' : `${m} luni`;
  return [years, mons].filter(Boolean).join(' și ');
}
```

Note: if `Intl` in Node/jsdom formats `1234567` with a different separator than `.`, check `new Intl.NumberFormat('ro-RO').format(1234567)` in `node -e` and adjust the test expectation to the real output — don't hand-roll grouping.

**Step 4: Write `src/ui/fields.ts`**

```ts
import type { Inputs } from '../engine';

export type Unit = 'money' | 'pct' | 'years' | 'months' | 'bool';
export type Group = 'key' | 'acquisition' | 'ownership' | 'growth' | 'investing' | 'sale';

export interface FieldDef {
  key: keyof Inputs;
  unit: Unit;
  group: Group;
  min?: number;
  max?: number;
  step?: number;
}

export const FIELDS: FieldDef[] = [
  { key: 'price', unit: 'money', group: 'key', min: 0, step: 1000 },
  { key: 'rent', unit: 'money', group: 'key', min: 0, step: 50 },
  { key: 'downPaymentPct', unit: 'pct', group: 'key', min: 0, max: 1, step: 0.01 },
  { key: 'fixedRate', unit: 'pct', group: 'key', min: 0, max: 0.3, step: 0.001 },
  { key: 'fixedYears', unit: 'years', group: 'key', min: 0, max: 30, step: 1 },
  { key: 'ircc', unit: 'pct', group: 'key', min: 0, max: 0.3, step: 0.001 },
  { key: 'variableMargin', unit: 'pct', group: 'key', min: 0, max: 0.1, step: 0.001 },
  { key: 'loanTermYears', unit: 'years', group: 'key', min: 1, max: 35, step: 1 },
  { key: 'horizonYears', unit: 'years', group: 'key', min: 1, max: 50, step: 1 },

  { key: 'notaryPct', unit: 'pct', group: 'acquisition', min: 0, max: 0.1, step: 0.001 },
  { key: 'registryPct', unit: 'pct', group: 'acquisition', min: 0, max: 0.05, step: 0.0005 },
  { key: 'bankFees', unit: 'money', group: 'acquisition', min: 0, step: 100 },

  { key: 'propertyTaxPct', unit: 'pct', group: 'ownership', min: 0, max: 0.05, step: 0.0005 },
  { key: 'homeInsuranceAnnual', unit: 'money', group: 'ownership', min: 0, step: 50 },
  { key: 'lifeInsurancePct', unit: 'pct', group: 'ownership', min: 0, max: 0.05, step: 0.0005 },
  { key: 'maintenancePct', unit: 'pct', group: 'ownership', min: 0, max: 0.1, step: 0.001 },

  { key: 'propertyGrowth', unit: 'pct', group: 'growth', min: -0.2, max: 0.3, step: 0.005 },
  { key: 'rentGrowth', unit: 'pct', group: 'growth', min: -0.2, max: 0.3, step: 0.005 },
  { key: 'inflation', unit: 'pct', group: 'growth', min: -0.1, max: 0.5, step: 0.005 },

  { key: 'investReturn', unit: 'pct', group: 'investing', min: -0.2, max: 0.3, step: 0.005 },
  { key: 'investTaxRate', unit: 'pct', group: 'investing', min: 0, max: 0.5, step: 0.01 },
  { key: 'renterInsuranceAnnual', unit: 'money', group: 'investing', min: 0, step: 50 },
  { key: 'depositMonths', unit: 'months', group: 'investing', min: 0, max: 12, step: 1 },

  { key: 'includeSaleCosts', unit: 'bool', group: 'sale' },
  { key: 'saleAgencyPct', unit: 'pct', group: 'sale', min: 0, max: 0.1, step: 0.005 },
  { key: 'saleTaxShortPct', unit: 'pct', group: 'sale', min: 0, max: 0.2, step: 0.005 },
  { key: 'saleTaxLongPct', unit: 'pct', group: 'sale', min: 0, max: 0.2, step: 0.005 },
  { key: 'saleTaxShortHoldYears', unit: 'years', group: 'sale', min: 0, max: 20, step: 1 },
];
```

Note: `renterInsuranceAnnual` and `depositMonths` sit under "investing" only for brevity; if the UI looks odd, add a `renting` group — it's a one-line change in `Group` and `ro.groups`.

**Step 5: Write `src/i18n/ro.ts`**

```ts
import type { Inputs } from '../engine';

type FieldText = { label: string; help: string };

export const ro = {
  title: 'Cumpăr sau închiriez?',
  subtitle: 'Calculator pentru România',
  city: 'Oraș',
  propertyType: 'Tip locuință',
  newBuild: 'Construcție nouă',
  existing: 'Construcție veche',
  sqm: 'Suprafață (m²)',
  advanced: 'Setări avansate',
  resetAll: 'Resetează tot',
  reset: 'Revino la valoarea implicită',
  currency: 'Monedă',
  realValues: 'Ajustat cu inflația (lei de azi)',
  source: 'sursa',
  stale: 'date vechi',
  placeholder: 'valoare provizorie',
  assumptions: 'Valorile implicite sunt ipoteze, nu prognoze. Verifică-le pentru situația ta.',
  buyer: 'Cumpărător',
  renter: 'Chiriaș',
  year: 'An',
  headlineValue: (rent: string) => `Cumpărarea merită dacă o chirie similară e peste ${rent}/lună.`,
  headlineAlwaysBuy: 'Cu aceste ipoteze, cumpărarea câștigă chiar și la chirie zero.',
  headlineAlwaysRent: 'Cu aceste ipoteze, închirierea câștigă la orice chirie realistă.',
  verdictBuy: (after: string) => `Pentru cifrele tale, cumpărarea câștigă după ${after}.`,
  verdictRent: 'Pentru cifrele tale, închirierea rămâne mai avantajoasă pe tot orizontul.',
  tabs: {
    netWorth: 'Avere netă',
    monthly: 'Costuri lunare',
    breakdown: 'Unde se duc banii',
    sensitivity: 'Sensibilitate',
  },
  breakdown: {
    downPayment: 'Avans', acquisitionCosts: 'Costuri achiziție', interest: 'Dobândă',
    propertyTax: 'Impozit', insurance: 'Asigurări', maintenance: 'Întreținere',
    saleCosts: 'Costuri vânzare', investmentTax: 'Impozit investiții', rent: 'Chirie',
  },
  sensitivityHelp:
    'Diferența de avere netă la final (cumpărător − chiriaș) dacă creșterea prețului locuinței sau randamentul investițiilor diferă cu ±2 puncte procentuale.',
  sensitivityRows: 'Creștere preț locuință',
  sensitivityCols: 'Randament investiții',
  groups: {
    key: 'Principale',
    acquisition: 'Costuri de achiziție',
    ownership: 'Costuri de proprietar',
    growth: 'Creșteri anuale',
    investing: 'Chirie și investiții',
    sale: 'Vânzare la final',
  },
  fields: {
    price: { label: 'Preț locuință', help: 'Prețul total, cu TVA inclus pentru construcțiile noi.' },
    rent: { label: 'Chirie lunară', help: 'Chiria pentru o locuință comparabilă.' },
    downPaymentPct: { label: 'Avans', help: 'Procent din preț plătit din economii.' },
    fixedRate: { label: 'Dobândă fixă', help: 'Dobânda anuală în perioada cu dobândă fixă.' },
    fixedYears: { label: 'Perioadă dobândă fixă', help: '0 = dobândă variabilă de la început.' },
    ircc: { label: 'IRCC', help: 'Indicele de referință publicat de BNR, presupus constant după perioada fixă.' },
    variableMargin: { label: 'Marja băncii', help: 'Se adaugă la IRCC după perioada fixă.' },
    loanTermYears: { label: 'Durata creditului', help: 'Numărul de ani în care rambursezi creditul.' },
    horizonYears: { label: 'Orizont de analiză', help: 'Peste câți ani compari cele două variante.' },
    notaryPct: { label: 'Onorariu notar', help: 'Procent aproximativ din preț.' },
    registryPct: { label: 'Intabulare (ANCPI)', help: 'Taxa de înscriere în cartea funciară.' },
    bankFees: { label: 'Comisioane bancă', help: 'Evaluare, analiză dosar și alte comisioane inițiale.' },
    propertyTaxPct: { label: 'Impozit pe clădire', help: 'Procent anual, aproximat față de valoarea locuinței.' },
    homeInsuranceAnnual: { label: 'Asigurare locuință', help: 'PAD obligatorie plus poliță facultativă, pe an.' },
    lifeInsurancePct: { label: 'Asigurare de viață', help: 'Procent anual din soldul creditului, dacă banca o cere.' },
    maintenancePct: { label: 'Întreținere și reparații', help: 'Procent anual din valoarea locuinței.' },
    propertyGrowth: { label: 'Creștere preț locuință', help: 'Creștere anuală presupusă.' },
    rentGrowth: { label: 'Creștere chirie', help: 'Creștere anuală presupusă.' },
    inflation: { label: 'Inflație', help: 'Folosită doar pentru afișarea în lei de azi.' },
    investReturn: { label: 'Randament investiții', help: 'Randament anual brut al banilor neinvestiți în locuință.' },
    investTaxRate: { label: 'Impozit pe câștig', help: 'Aplicat câștigului la final.' },
    renterInsuranceAnnual: { label: 'Asigurare chiriaș', help: 'Pe an.' },
    depositMonths: { label: 'Garanție chirie', help: 'Număr de chirii lunare date ca garanție, returnată la final.' },
    includeSaleCosts: { label: 'Include costurile de vânzare', help: 'Compară averea lichidă, ca și cum ai vinde la final.' },
    saleAgencyPct: { label: 'Comision agenție', help: 'Procent din prețul de vânzare.' },
    saleTaxShortPct: { label: 'Impozit vânzare (deținere scurtă)', help: 'Procent din prețul de vânzare.' },
    saleTaxLongPct: { label: 'Impozit vânzare (deținere lungă)', help: 'Procent din prețul de vânzare.' },
    saleTaxShortHoldYears: { label: 'Prag deținere scurtă', help: 'Ani până la care se aplică impozitul mai mare.' },
  } satisfies Record<keyof Inputs, FieldText>,
};
```

**Step 6: Run tests + typecheck** → PASS.

**Step 7: Commit**

```bash
git add src/i18n src/ui
git commit -m "feat: Added Romanian strings, field definitions and formatters"
```

---

### Task 13: Scenario state in the URL

**Files:**
- Create: `src/state/scenario.ts`, `src/state/useScenario.ts`
- Test: `src/state/scenario.test.ts`

**Step 1: Failing test**

```ts
import { decodeScenario, encodeScenario, DEFAULT_SCENARIO } from './scenario';

describe('scenario URL encoding', () => {
  it('round-trips city, type, size and overrides', () => {
    const s = { ...DEFAULT_SCENARIO, cityId: 'iasi', propertyType: 'existing' as const, sqm: 65, overrides: { rent: 2000, includeSaleCosts: false } };
    expect(decodeScenario(encodeScenario(s))).toEqual(s);
  });

  it('omits default values from the URL', () => {
    expect(encodeScenario(DEFAULT_SCENARIO).toString()).toBe('');
  });

  it('ignores unknown and non-numeric params', () => {
    const s = decodeScenario(new URLSearchParams('foo=1&rent=abc&price=400000'));
    expect(s.overrides).toEqual({ price: 400000 });
  });
});
```

**Step 2: Run** → FAIL.

**Step 3: Implement** `src/state/scenario.ts`:

```ts
import type { Inputs } from '../engine';
import type { PropertyType } from '../data/defaults';
import type { Currency } from '../ui/format';
import { FIELDS } from '../ui/fields';

export interface Scenario {
  cityId: string;
  propertyType: PropertyType;
  sqm: number;
  currency: Currency;
  real: boolean;
  overrides: Partial<Inputs>;
}

export const DEFAULT_SCENARIO: Scenario = {
  cityId: 'bucuresti',
  propertyType: 'existing',
  sqm: 55,
  currency: 'RON',
  real: false,
  overrides: {},
};

const FIELD_UNITS = new Map(FIELDS.map((f) => [f.key, f.unit]));

export function encodeScenario(s: Scenario): URLSearchParams {
  const p = new URLSearchParams();
  const d = DEFAULT_SCENARIO;
  if (s.cityId !== d.cityId) p.set('oras', s.cityId);
  if (s.propertyType !== d.propertyType) p.set('tip', s.propertyType);
  if (s.sqm !== d.sqm) p.set('mp', String(s.sqm));
  if (s.currency !== d.currency) p.set('moneda', s.currency);
  if (s.real !== d.real) p.set('real', '1');
  for (const [k, v] of Object.entries(s.overrides)) {
    p.set(k, typeof v === 'boolean' ? (v ? '1' : '0') : String(v));
  }
  return p;
}

export function decodeScenario(p: URLSearchParams): Scenario {
  const d = DEFAULT_SCENARIO;
  const sqm = Number(p.get('mp'));
  const overrides: Partial<Inputs> = {};
  for (const [k, raw] of p.entries()) {
    const unit = FIELD_UNITS.get(k as keyof Inputs);
    if (!unit) continue;
    if (unit === 'bool') {
      (overrides as Record<string, boolean>)[k] = raw === '1';
    } else {
      const n = Number(raw);
      if (raw !== '' && Number.isFinite(n)) (overrides as Record<string, number>)[k] = n;
    }
  }
  return {
    cityId: p.get('oras') ?? d.cityId,
    propertyType: p.get('tip') === 'new' ? 'new' : p.get('tip') === 'existing' ? 'existing' : d.propertyType,
    sqm: Number.isFinite(sqm) && sqm > 0 ? sqm : d.sqm,
    currency: p.get('moneda') === 'EUR' ? 'EUR' : d.currency,
    real: p.get('real') === '1',
    overrides,
  };
}
```

`src/state/useScenario.ts`:

```ts
import { useCallback, useEffect, useState } from 'react';
import type { Inputs } from '../engine';
import { decodeScenario, encodeScenario, DEFAULT_SCENARIO, type Scenario } from './scenario';

export function useScenario() {
  const [scenario, setScenario] = useState<Scenario>(() => decodeScenario(new URLSearchParams(window.location.search)));

  useEffect(() => {
    const qs = encodeScenario(scenario).toString();
    // replaceState, not pushState: every keystroke would otherwise flood the back button.
    window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname);
  }, [scenario]);

  const update = useCallback((patch: Partial<Omit<Scenario, 'overrides'>>) => {
    setScenario((s) => ({ ...s, ...patch }));
  }, []);

  const setField = useCallback(<K extends keyof Inputs>(key: K, value: Inputs[K]) => {
    setScenario((s) => ({ ...s, overrides: { ...s.overrides, [key]: value } }));
  }, []);

  const resetField = useCallback((key: keyof Inputs) => {
    setScenario((s) => {
      const { [key]: _removed, ...rest } = s.overrides;
      return { ...s, overrides: rest };
    });
  }, []);

  const resetAll = useCallback(() => setScenario(DEFAULT_SCENARIO), []);

  return { scenario, update, setField, resetField, resetAll };
}
```

Note: changing city keeps price/rent overrides on purpose; "Resetează tot" clears them. If `noUnusedLocals` complains about `_removed`, delete the key from a copy instead.

**Step 4: Run** → PASS. **Step 5: Commit**

```bash
git add src/state
git commit -m "feat: Added URL backed scenario state"
```

---

### Task 14: Input components

**Files:**
- Create: `src/ui/InputField.tsx`, `src/ui/InputsPanel.tsx`, `src/ui/CityPicker.tsx`

**Step 1: `src/ui/InputField.tsx`**

```tsx
import { useEffect, useId, useState } from 'react';
import type { SourcedValue } from '../data/schema';
import { ro } from '../i18n/ro';
import type { FieldDef } from './fields';
import type { Currency } from './format';

interface Props {
  def: FieldDef;
  value: number | boolean;
  isOverridden: boolean;
  source?: SourcedValue;
  currency: Currency;
  eurRon: number;
  onChange: (v: number | boolean) => void;
  onReset: () => void;
}

function toDisplay(def: FieldDef, v: number, currency: Currency, eurRon: number) {
  if (def.unit === 'pct') return +(v * 100).toFixed(4);
  if (def.unit === 'money' && currency === 'EUR') return Math.round(v / eurRon);
  return v;
}

function fromDisplay(def: FieldDef, v: number, currency: Currency, eurRon: number) {
  if (def.unit === 'pct') return v / 100;
  if (def.unit === 'money' && currency === 'EUR') return v * eurRon;
  return v;
}

const suffix = (def: FieldDef, currency: Currency) =>
  ({ pct: '%', money: currency === 'EUR' ? '€' : 'lei', years: 'ani', months: 'luni', bool: '' })[def.unit];

export function InputField({ def, value, isOverridden, source, currency, eurRon, onChange, onReset }: Props) {
  const id = useId();
  const text = ro.fields[def.key];
  const [draft, setDraft] = useState('');
  const [focused, setFocused] = useState(false);

  // Keep the draft as a string while typing so "0." or "" aren't clobbered mid-edit.
  useEffect(() => {
    if (!focused && typeof value === 'number') setDraft(String(toDisplay(def, value, currency, eurRon)));
  }, [value, focused, def, currency, eurRon]);

  const sourceTag = source && !isOverridden && (
    <small className={`source source-${source.status}`}>
      {ro.source}: {source.sourceUrl ? <a href={source.sourceUrl} target="_blank" rel="noreferrer">{source.source}</a> : source.source}, {source.asOf}
      {source.status === 'stale' && ` · ${ro.stale}`}
    </small>
  );

  const resetButton = isOverridden && (
    <button type="button" className="reset" onClick={onReset} title={ro.reset} aria-label={`${ro.reset}: ${text.label}`}>↺</button>
  );

  if (def.unit === 'bool') {
    return (
      <div className="field">
        <label htmlFor={id}>
          <input id={id} type="checkbox" checked={value as boolean} onChange={(e) => onChange(e.target.checked)} /> {text.label}
        </label>
        <span className="help" title={text.help}>ⓘ</span>
        {resetButton}
      </div>
    );
  }

  const min = def.min !== undefined ? toDisplay(def, def.min, currency, eurRon) : undefined;
  const max = def.max !== undefined ? toDisplay(def, def.max, currency, eurRon) : undefined;
  const step = def.step !== undefined ? toDisplay(def, def.step, currency, eurRon) : undefined;

  return (
    <div className="field">
      <label htmlFor={id}>{text.label}</label>
      <span className="help" title={text.help}>ⓘ</span>
      <div className="input-row">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          value={draft}
          min={min}
          max={max}
          step={step}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(e) => {
            setDraft(e.target.value);
            const n = Number(e.target.value);
            if (e.target.value !== '' && Number.isFinite(n)) onChange(fromDisplay(def, n, currency, eurRon));
          }}
        />
        <span className="suffix">{suffix(def, currency)}</span>
        {resetButton}
      </div>
      {sourceTag}
    </div>
  );
}
```

**Step 2: `src/ui/CityPicker.tsx`**

```tsx
import type { DataFile } from '../data/schema';
import type { PropertyType } from '../data/defaults';
import { ro } from '../i18n/ro';

interface Props {
  data: DataFile;
  cityId: string;
  propertyType: PropertyType;
  sqm: number;
  onChange: (patch: { cityId?: string; propertyType?: PropertyType; sqm?: number }) => void;
}

export function CityPicker({ data, cityId, propertyType, sqm, onChange }: Props) {
  return (
    <div className="city-picker">
      <label>
        {ro.city}
        <select value={cityId} onChange={(e) => onChange({ cityId: e.target.value })}>
          {Object.entries(data.cities).map(([id, c]) => (
            <option key={id} value={id}>{c.name}</option>
          ))}
        </select>
      </label>
      <fieldset>
        <legend>{ro.propertyType}</legend>
        <label><input type="radio" checked={propertyType === 'new'} onChange={() => onChange({ propertyType: 'new' })} /> {ro.newBuild}</label>
        <label><input type="radio" checked={propertyType === 'existing'} onChange={() => onChange({ propertyType: 'existing' })} /> {ro.existing}</label>
      </fieldset>
      <label>
        {ro.sqm}
        <input type="number" min={10} max={500} value={sqm} onChange={(e) => {
          const n = Number(e.target.value);
          if (n > 0) onChange({ sqm: n });
        }} />
      </label>
    </div>
  );
}
```

**Step 3: `src/ui/InputsPanel.tsx`**

```tsx
import type { Inputs } from '../engine';
import type { DataFile } from '../data/schema';
import { sourceFor, type PropertyType } from '../data/defaults';
import { ro } from '../i18n/ro';
import { FIELDS, type Group } from './fields';
import { InputField } from './InputField';
import type { Currency } from './format';

interface Props {
  data: DataFile;
  cityId: string;
  propertyType: PropertyType;
  inputs: Inputs;
  overrides: Partial<Inputs>;
  currency: Currency;
  setField: <K extends keyof Inputs>(key: K, value: Inputs[K]) => void;
  resetField: (key: keyof Inputs) => void;
}

const ADVANCED_GROUPS: Group[] = ['acquisition', 'ownership', 'growth', 'investing', 'sale'];

export function InputsPanel({ data, cityId, propertyType, inputs, overrides, currency, setField, resetField }: Props) {
  const eurRon = data.values.eurRon.value;
  const render = (group: Group) =>
    FIELDS.filter((f) => f.group === group).map((def) => (
      <InputField
        key={def.key}
        def={def}
        value={inputs[def.key]}
        isOverridden={def.key in overrides}
        source={sourceFor(data, cityId, propertyType, def.key)}
        currency={currency}
        eurRon={eurRon}
        onChange={(v) => setField(def.key, v as never)}
        onReset={() => resetField(def.key)}
      />
    ));

  return (
    <div className="inputs">
      <section>{render('key')}</section>
      <details>
        <summary>{ro.advanced}</summary>
        {ADVANCED_GROUPS.map((g) => (
          <fieldset key={g}>
            <legend>{ro.groups[g]}</legend>
            {render(g)}
          </fieldset>
        ))}
      </details>
    </div>
  );
}
```

**Step 4: Typecheck** — `npm run typecheck` → exit 0.

**Step 5: Commit**

```bash
git add src/ui
git commit -m "feat: Added input components with source tags and reset"
```

---

### Task 15: Results — headline and charts

**Files:**
- Create: `src/ui/Headline.tsx`, `src/ui/charts.tsx`, `src/ui/SensitivityTable.tsx`, `src/ui/Results.tsx`

**Step 1: `src/ui/Headline.tsx`**

```tsx
import type { EquivalentRent } from '../engine';
import { ro } from '../i18n/ro';
import { formatDuration, formatMoney, type Currency } from './format';

interface Props {
  eq: EquivalentRent;
  breakEvenMonth: number | null;
  currency: Currency;
  eurRon: number;
}

export function Headline({ eq, breakEvenMonth, currency, eurRon }: Props) {
  const main =
    eq.kind === 'value' ? ro.headlineValue(formatMoney(eq.rent, currency, eurRon))
    : eq.kind === 'alwaysBuy' ? ro.headlineAlwaysBuy
    : ro.headlineAlwaysRent;
  const verdict = breakEvenMonth === null ? ro.verdictRent : ro.verdictBuy(formatDuration(breakEvenMonth));
  return (
    <header className="headline" aria-live="polite">
      <h2 data-testid="headline">{main}</h2>
      <p>{verdict}</p>
    </header>
  );
}
```

**Step 2: `src/ui/charts.tsx`** — follow the `dataviz` skill for colours and styling before finalizing; the structure below is the baseline.

```tsx
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, Line, LineChart,
  ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import type { Result } from '../engine';
import { ro } from '../i18n/ro';
import { formatMoney, type Currency } from './format';

export interface View { currency: Currency; eurRon: number; real: boolean }

const BUYER = 'var(--buyer)';
const RENTER = 'var(--renter)';

function yearly(result: Result, view: View) {
  const conv = (v: number, deflator: number) => {
    const real = view.real ? v / deflator : v;
    return view.currency === 'EUR' ? real / view.eurRon : real;
  };
  return result.rows
    .filter((r) => r.month % 12 === 0)
    .map((r) => ({
      year: r.month / 12,
      buyer: conv(r.buyerNetWorth, r.deflator),
      renter: conv(r.renterNetWorth, r.deflator),
      buyerCost: conv(r.buyerMonthlyCost, r.deflator),
      renterCost: conv(r.renterMonthlyCost, r.deflator),
    }));
}

const axisMoney = (view: View) => (v: number) =>
  formatMoney(view.currency === 'EUR' ? v * view.eurRon : v, view.currency, view.eurRon);

export function NetWorthChart({ result, view }: { result: Result; view: View }) {
  const data = yearly(result, view);
  const fmt = axisMoney(view);
  return (
    <ResponsiveContainer width="100%" height={360}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="year" label={{ value: ro.year, position: 'insideBottomRight', offset: -4 }} />
        <YAxis tickFormatter={fmt} width={110} />
        <Tooltip formatter={(v: number) => fmt(v)} labelFormatter={(y) => `${ro.year} ${y}`} />
        <Legend />
        {result.breakEvenMonth !== null && (
          <ReferenceLine x={Math.ceil(result.breakEvenMonth / 12)} strokeDasharray="4 4" />
        )}
        <Line type="monotone" dataKey="buyer" name={ro.buyer} stroke={BUYER} dot={false} strokeWidth={2} />
        <Line type="monotone" dataKey="renter" name={ro.renter} stroke={RENTER} dot={false} strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function MonthlyCostsChart({ result, view }: { result: Result; view: View }) {
  const data = yearly(result, view).filter((d) => d.year > 0);
  const fmt = axisMoney(view);
  return (
    <ResponsiveContainer width="100%" height={320}>
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="year" />
        <YAxis tickFormatter={fmt} width={110} />
        <Tooltip formatter={(v: number) => fmt(v)} labelFormatter={(y) => `${ro.year} ${y}`} />
        <Legend />
        <Area type="monotone" dataKey="buyerCost" name={ro.buyer} stroke={BUYER} fill={BUYER} fillOpacity={0.15} />
        <Area type="monotone" dataKey="renterCost" name={ro.renter} stroke={RENTER} fill={RENTER} fillOpacity={0.15} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function BreakdownChart({ result, view }: { result: Result; view: View }) {
  // Totals are nominal sums; showing them in today's lei would need per-month deflation, so this chart stays nominal.
  const conv = (v: number) => (view.currency === 'EUR' ? v / view.eurRon : v);
  const b = result.buyer;
  const r = result.renter;
  const t = ro.breakdown;
  const data = [
    { name: t.interest, buyer: conv(b.interest), renter: 0 },
    { name: t.acquisitionCosts, buyer: conv(b.acquisitionCosts), renter: 0 },
    { name: t.propertyTax, buyer: conv(b.propertyTax), renter: 0 },
    { name: t.insurance, buyer: conv(b.insurance), renter: conv(r.insurance) },
    { name: t.maintenance, buyer: conv(b.maintenance), renter: 0 },
    { name: t.saleCosts, buyer: conv(b.saleCosts), renter: 0 },
    { name: t.investmentTax, buyer: conv(b.investmentTax), renter: conv(r.investmentTax) },
    { name: t.rent, buyer: 0, renter: conv(r.rent) },
  ];
  const fmt = axisMoney({ ...view, real: false });
  return (
    <ResponsiveContainer width="100%" height={360}>
      <BarChart data={data} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" tickFormatter={fmt} />
        <YAxis type="category" dataKey="name" width={140} />
        <Tooltip formatter={(v: number) => fmt(v)} />
        <Legend />
        <Bar dataKey="buyer" name={ro.buyer} fill={BUYER} />
        <Bar dataKey="renter" name={ro.renter} fill={RENTER} />
      </BarChart>
    </ResponsiveContainer>
  );
}
```

**Step 3: `src/ui/SensitivityTable.tsx`**

```tsx
import { SENSITIVITY_STEPS } from '../engine';
import { ro } from '../i18n/ro';
import { formatMoney, type Currency } from './format';

interface Props { grid: number[][]; baseGrowth: number; baseReturn: number; currency: Currency; eurRon: number }

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

export function SensitivityTable({ grid, baseGrowth, baseReturn, currency, eurRon }: Props) {
  return (
    <div>
      <p>{ro.sensitivityHelp}</p>
      <table className="sensitivity">
        <thead>
          <tr>
            <th>{ro.sensitivityRows} ↓ / {ro.sensitivityCols} →</th>
            {SENSITIVITY_STEPS.map((d) => <th key={d}>{pct(baseReturn + d)}</th>)}
          </tr>
        </thead>
        <tbody>
          {grid.map((row, i) => (
            <tr key={i}>
              <th>{pct(baseGrowth + SENSITIVITY_STEPS[i])}</th>
              {row.map((gap, j) => (
                <td key={j} className={gap >= 0 ? 'buy-wins' : 'rent-wins'}>{formatMoney(gap, currency, eurRon)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

**Step 4: `src/ui/Results.tsx`**

```tsx
import { useMemo, useState } from 'react';
import { equivalentRent, sensitivity, simulate, type Inputs } from '../engine';
import { ro } from '../i18n/ro';
import { BreakdownChart, MonthlyCostsChart, NetWorthChart, type View } from './charts';
import { Headline } from './Headline';
import { SensitivityTable } from './SensitivityTable';

type Tab = keyof typeof ro.tabs;

export function Results({ inputs, view, onToggleReal }: { inputs: Inputs; view: View; onToggleReal: (v: boolean) => void }) {
  const [tab, setTab] = useState<Tab>('netWorth');
  const result = useMemo(() => simulate(inputs), [inputs]);
  const eq = useMemo(() => equivalentRent(inputs), [inputs]);
  const grid = useMemo(() => (tab === 'sensitivity' ? sensitivity(inputs) : null), [inputs, tab]);

  return (
    <div className="results">
      <Headline eq={eq} breakEvenMonth={result.breakEvenMonth} currency={view.currency} eurRon={view.eurRon} />
      <label className="real-toggle">
        <input type="checkbox" checked={view.real} onChange={(e) => onToggleReal(e.target.checked)} /> {ro.realValues}
      </label>
      <div role="tablist">
        {(Object.keys(ro.tabs) as Tab[]).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>{ro.tabs[t]}</button>
        ))}
      </div>
      {tab === 'netWorth' && <NetWorthChart result={result} view={view} />}
      {tab === 'monthly' && <MonthlyCostsChart result={result} view={view} />}
      {tab === 'breakdown' && <BreakdownChart result={result} view={view} />}
      {tab === 'sensitivity' && grid && (
        <SensitivityTable grid={grid} baseGrowth={inputs.propertyGrowth} baseReturn={inputs.investReturn} currency={view.currency} eurRon={view.eurRon} />
      )}
      <p className="note">{ro.assumptions}</p>
    </div>
  );
}
```

**Step 5: Typecheck** → exit 0. **Step 6: Commit**

```bash
git add src/ui
git commit -m "feat: Added headline, charts and sensitivity table"
```

---

### Task 16: App shell, styles and UI tests

**Files:**
- Modify: `src/App.tsx`, `src/main.tsx`
- Create: `src/styles.css`, `src/App.test.tsx`

**Step 1: Failing UI tests** — `src/App.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

// Recharts' ResponsiveContainer needs ResizeObserver, which jsdom lacks.
beforeAll(() => {
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
});

beforeEach(() => window.history.replaceState(null, '', '/'));

it('updates the headline when the city changes', async () => {
  render(<App />);
  const before = screen.getByTestId('headline').textContent;
  await userEvent.selectOptions(screen.getByLabelText('Oraș'), 'cluj');
  expect(screen.getByTestId('headline').textContent).not.toBe(before);
});

it('writes edited values to the URL', async () => {
  render(<App />);
  const rent = screen.getByLabelText('Chirie lunară');
  await userEvent.clear(rent);
  await userEvent.type(rent, '1234');
  expect(window.location.search).toContain('rent=1234');
});

it('restores a scenario from the URL', () => {
  window.history.replaceState(null, '', '/?oras=iasi&rent=1999');
  render(<App />);
  expect(screen.getByLabelText('Oraș')).toHaveValue('iasi');
  expect(screen.getByLabelText('Chirie lunară')).toHaveValue(1999);
});
```

**Step 2: Run** — `npx vitest run src/App.test.tsx` → FAIL.

**Step 3: Implement `src/App.tsx`**

```tsx
import { useDeferredValue, useMemo } from 'react';
import { buildInputs, loadDefaults } from './data/defaults';
import type { Inputs } from './engine';
import { ro } from './i18n/ro';
import { CityPicker } from './ui/CityPicker';
import { InputsPanel } from './ui/InputsPanel';
import { Results } from './ui/Results';
import { useScenario } from './state/useScenario';

const data = loadDefaults();

export default function App() {
  const { scenario, update, setField, resetField, resetAll } = useScenario();
  const inputs: Inputs = useMemo(
    () => ({ ...buildInputs(data, scenario.cityId, scenario.propertyType, scenario.sqm), ...scenario.overrides }),
    [scenario],
  );
  // Keeps typing responsive: results re-render at lower priority than the input that changed.
  const deferredInputs = useDeferredValue(inputs);
  const eurRon = data.values.eurRon.value;

  return (
    <main className="app">
      <header>
        <h1>{ro.title}</h1>
        <p>{ro.subtitle}</p>
        <div className="toolbar">
          <label>
            {ro.currency}{' '}
            <select value={scenario.currency} onChange={(e) => update({ currency: e.target.value as 'RON' | 'EUR' })}>
              <option value="RON">lei</option>
              <option value="EUR">€</option>
            </select>
          </label>
          <button type="button" onClick={resetAll}>{ro.resetAll}</button>
        </div>
      </header>
      <CityPicker data={data} cityId={scenario.cityId} propertyType={scenario.propertyType} sqm={scenario.sqm} onChange={update} />
      <div className="layout">
        <InputsPanel
          data={data}
          cityId={scenario.cityId}
          propertyType={scenario.propertyType}
          inputs={inputs}
          overrides={scenario.overrides}
          currency={scenario.currency}
          setField={setField}
          resetField={resetField}
        />
        <Results
          inputs={deferredInputs}
          view={{ currency: scenario.currency, eurRon, real: scenario.real }}
          onToggleReal={(real) => update({ real })}
        />
      </div>
    </main>
  );
}
```

Add `import './styles.css';` to `src/main.tsx`.

**Step 4: `src/styles.css`** — minimal, responsive two-column layout. Use the `frontend-design` and `dataviz` skills to pick the palette and typography; this baseline only guarantees layout:

```css
:root {
  --buyer: #2563eb;
  --renter: #d97706;
  font-family: system-ui, sans-serif;
  line-height: 1.4;
}
.app { max-width: 1200px; margin: 0 auto; padding: 1rem; }
.layout { display: grid; grid-template-columns: minmax(280px, 380px) 1fr; gap: 2rem; }
@media (max-width: 800px) { .layout { grid-template-columns: 1fr; } }
.city-picker { display: flex; flex-wrap: wrap; gap: 1rem; align-items: end; margin-bottom: 1rem; }
.field { margin-bottom: 0.75rem; }
.input-row { display: flex; gap: 0.25rem; align-items: center; }
.input-row input { width: 100%; }
.help { cursor: help; margin-left: 0.25rem; opacity: 0.6; }
.source { display: block; opacity: 0.6; font-size: 0.75rem; }
.source-stale, .source-manual { font-style: italic; }
.headline h2 { margin: 0 0 0.25rem; }
[role='tablist'] { display: flex; gap: 0.5rem; margin: 1rem 0; }
[role='tab'][aria-selected='true'] { font-weight: 600; text-decoration: underline; }
.sensitivity td.buy-wins { color: var(--buyer); }
.sensitivity td.rent-wins { color: var(--renter); }
.note { opacity: 0.7; font-size: 0.85rem; }
```

**Step 5: Run all tests and typecheck**

Run: `npm test && npm run typecheck`
Expected: all PASS. If `getByLabelText('Oraș')` fails because the label wraps the select, that's expected to work; if the `rent` label lookup fails, check that `InputField` uses `htmlFor={id}`.

**Step 6: Manual check**

Run: `npm run dev`, open the printed URL. Check: city switch changes numbers; Advanced opens; editing a value shows ↺ and updates URL; reload restores state; € toggle converts inputs and results; mobile width stacks columns.

**Step 7: Commit**

```bash
git add src
git commit -m "feat: Added app shell with live results and URL state"
```

---

## Phase 4 — Verified defaults

### Task 17: Verify and fill real default values

This task is research, not code. Every value in `data/overrides.json` is a placeholder until this is done.

**Files:**
- Modify: `data/overrides.json`
- Create: `data/SOURCES.md`

**Step 1: For each value, find an authoritative source** and replace the entry with the real `value`, `source`, `sourceUrl`, `asOf` and `"status": "manual"`. Minimum checks:

| Key(s) | Where to look |
|---|---|
| `eurRon` | BNR daily rate |
| `ircc` | BNR IRCC publication |
| `fixedRate`, `variableMargin` | BNR interest-rate statistics for new housing loans; a few major banks' published offers |
| `downPaymentPct` | BNR macroprudential rules (LTV limits) |
| `notaryPct`, `registryPct` | UNNPR fee schedule; ANCPI fee order |
| `propertyTaxPct` | Codul fiscal (buildings owned by individuals) and 2–3 city halls |
| `homeInsuranceAnnual` | PAID (PAD) premiums + typical optional policy |
| `saleTax*` | Codul fiscal, tax on transfer of real estate by individuals |
| `investTaxRate` | Codul fiscal, current rates on interest/capital gains/dividends |
| `inflation` | INS CPI; BNR inflation report forecast |
| `propertyGrowth`, `rentGrowth`, `investReturn` | Long-run historical averages; document the reasoning in SOURCES.md |
| City €/m² | imobiliare.ro / storia.ro published monthly reports or indices |

**Step 2: Write `data/SOURCES.md`** listing each key, the source, how the number was derived, and the date checked.

**Step 3: Check Noua Casă status.** If the programme is active with a 5% down payment, note its conditions in SOURCES.md; a UI preset is a follow-up, not part of this task.

**Step 4: Run** `npm run data:merge && npm test`. Snapshot tests in `src/engine` use fixtures, not defaults, so they should still pass. The UI tests should pass too.

**Step 5: Commit**

```bash
git add data src/data/defaults.json
git commit -m "feat: Replaced placeholder defaults with verified sourced values"
```

---

## Phase 5 — Data pipeline

### Task 18: Validation

**Files:**
- Create: `pipeline/validate.ts`
- Test: `pipeline/validate.test.ts`

**Step 1: Failing test**

```ts
import { check } from './validate';

describe('check', () => {
  const range = { min: 0, max: 0.2 };
  it('accepts a plausible value', () => expect(check(0.06, range, 0.055)).toEqual({ ok: true }));
  it('rejects NaN', () => expect(check(NaN, range).ok).toBe(false));
  it('rejects out-of-range values', () => expect(check(0.5, range).ok).toBe(false));
  it('rejects jumps above 30% from the previous value', () => expect(check(0.08, range, 0.055).ok).toBe(false));
  it('accepts any in-range value when there is no previous one', () => expect(check(0.08, range).ok).toBe(true));
});
```

**Step 2: Run** → FAIL.

**Step 3: Implement**

```ts
export interface Range { min: number; max: number }
export type CheckResult = { ok: true } | { ok: false; reason: string };

export function check(value: number, range: Range, previous?: number, maxJump = 0.3): CheckResult {
  if (!Number.isFinite(value)) return { ok: false, reason: 'not a number' };
  if (value < range.min || value > range.max) return { ok: false, reason: `outside [${range.min}, ${range.max}]` };
  if (previous !== undefined && previous !== 0 && Math.abs(value - previous) / Math.abs(previous) > maxJump) {
    return { ok: false, reason: `changed more than ${maxJump * 100}% from ${previous}` };
  }
  return { ok: true };
}
```

**Step 4: Run** → PASS. **Step 5: Commit**

```bash
git add pipeline/validate.ts pipeline/validate.test.ts
git commit -m "feat: Added pipeline value validation"
```

---

### Task 19: Fetcher runner

**Files:**
- Create: `pipeline/types.ts`, `pipeline/runFetchers.ts`, `pipeline/run.ts`, `pipeline/fetchers/index.ts`
- Test: `pipeline/runFetchers.test.ts`

**Step 1: Types** — `pipeline/types.ts`:

```ts
import type { Range } from './validate';

export interface Fetcher {
  /** Path in the data file, e.g. "values.eurRon" or "cities.cluj.rentSqmEur". */
  path: string;
  unit: string;
  source: string;
  sourceUrl: string;
  range: Range;
  fetch: () => Promise<{ value: number; asOf: string }>;
}
```

**Step 2: Failing test** — `pipeline/runFetchers.test.ts`:

```ts
import { runFetchers } from './runFetchers';
import type { Fetcher } from './types';

const fetcher = (value: number | Error): Fetcher => ({
  path: 'values.ircc', unit: '%', source: 'BNR', sourceUrl: 'https://example', range: { min: 0, max: 0.2 },
  fetch: async () => { if (value instanceof Error) throw value; return { value, asOf: '2026-11-01' }; },
});
const prev = { values: { ircc: { value: 0.055, unit: '%', source: 'BNR', asOf: '2026-08-01', status: 'ok' as const } } };

describe('runFetchers', () => {
  it('writes a valid new value as ok', async () => {
    const { data, report } = await runFetchers([fetcher(0.056)], prev);
    expect(data.values?.ircc).toMatchObject({ value: 0.056, status: 'ok', asOf: '2026-11-01' });
    expect(report[0].outcome).toBe('updated');
  });

  it('keeps the previous value as stale when the fetch throws', async () => {
    const { data, report } = await runFetchers([fetcher(new Error('boom'))], prev);
    expect(data.values?.ircc).toMatchObject({ value: 0.055, status: 'stale' });
    expect(report[0]).toMatchObject({ outcome: 'stale', reason: 'boom' });
  });

  it('keeps the previous value as stale when validation fails', async () => {
    const { data } = await runFetchers([fetcher(0.15)], prev);
    expect(data.values?.ircc).toMatchObject({ value: 0.055, status: 'stale' });
  });

  it('does not mutate the previous data', async () => {
    await runFetchers([fetcher(new Error('x'))], prev);
    expect(prev.values.ircc.status).toBe('ok');
  });
});
```

**Step 3: Run** → FAIL.

**Step 4: Implement** `pipeline/runFetchers.ts`:

```ts
import type { PartialDataFile, SourcedValue } from '../src/data/schema';
import type { Fetcher } from './types';
import { check } from './validate';

export interface ReportLine {
  path: string;
  outcome: 'updated' | 'unchanged' | 'stale' | 'missing';
  value?: number;
  reason?: string;
}

function getAt(obj: unknown, path: string): SourcedValue | undefined {
  return path.split('.').reduce<any>((o, k) => (o == null ? undefined : o[k]), obj);
}

function setAt(obj: any, path: string, v: SourcedValue) {
  const keys = path.split('.');
  let o = obj;
  for (const k of keys.slice(0, -1)) o = o[k] ??= {};
  o[keys[keys.length - 1]] = v;
}

export async function runFetchers(fetchers: Fetcher[], previous: PartialDataFile) {
  const data: PartialDataFile = structuredClone(previous);
  const report: ReportLine[] = [];

  for (const f of fetchers) {
    const prev = getAt(data, f.path);
    const markStale = (reason: string) => {
      if (prev) setAt(data, f.path, { ...prev, status: 'stale' });
      report.push({ path: f.path, outcome: prev ? 'stale' : 'missing', reason });
    };
    try {
      const { value, asOf } = await f.fetch();
      const c = check(value, f.range, prev?.value);
      if (!c.ok) { markStale(c.reason); continue; }
      setAt(data, f.path, { value, unit: f.unit, source: f.source, sourceUrl: f.sourceUrl, asOf, status: 'ok' });
      report.push({ path: f.path, outcome: prev?.value === value ? 'unchanged' : 'updated', value });
    } catch (e) {
      markStale(e instanceof Error ? e.message : String(e));
    }
  }
  return { data, report };
}

export function formatReport(report: ReportLine[]): string {
  const lines = report.map((r) =>
    `| ${r.path} | ${r.outcome} | ${r.value ?? ''} | ${r.reason ?? ''} |`);
  return ['## Data update', '', '| Path | Outcome | Value | Note |', '|---|---|---|---|', ...lines].join('\n') + '\n';
}
```

`pipeline/fetchers/index.ts` (filled in by later tasks):
```ts
import type { Fetcher } from '../types';
export const FETCHERS: Fetcher[] = [];
```

`pipeline/run.ts`:
```ts
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { FETCHERS } from './fetchers';
import { formatReport, runFetchers } from './runFetchers';

const path = 'data/auto.json';
const previous = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : {};
const { data, report } = await runFetchers(FETCHERS, previous);
writeFileSync(path, JSON.stringify(data, null, 2) + '\n');

const summary = formatReport(report);
writeFileSync('pipeline-summary.md', summary);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
console.log(summary);
```

**Step 5: Run** → PASS; also `npm run data:fetch` → prints an empty table, `data/auto.json` stays `{}`.

**Step 6: Commit**

```bash
git add pipeline
git commit -m "feat: Added pipeline runner with stale fallback and report"
```

---

### Task 20: BNR EUR/RON fetcher

**Files:**
- Create: `pipeline/fetchers/bnrFx.ts`, `pipeline/fixtures/bnr-fx.xml`
- Modify: `pipeline/fetchers/index.ts`
- Test: `pipeline/fetchers/bnrFx.test.ts`

**Step 1: Save a real sample as fixture**

Run: `curl -s https://www.bnr.ro/nbrfxrates.xml -o pipeline/fixtures/bnr-fx.xml && head -c 1500 pipeline/fixtures/bnr-fx.xml`
Expected: XML containing a `<Cube date="YYYY-MM-DD">` element and `<Rate currency="EUR">…</Rate>`. **If the URL or structure differs, stop and adjust the parser and test to the real format.** Note the EUR value and date from the file for Step 2.

**Step 2: Failing test** (replace `X.XXXX` and the date with the values from the fixture)

```ts
import { readFileSync } from 'node:fs';
import { parseBnrFx } from './bnrFx';

it('extracts the EUR rate and date from the BNR feed', () => {
  const xml = readFileSync('pipeline/fixtures/bnr-fx.xml', 'utf8');
  expect(parseBnrFx(xml)).toEqual({ value: X.XXXX, asOf: 'YYYY-MM-DD' });
});

it('throws on unexpected content', () => {
  expect(() => parseBnrFx('<html>maintenance</html>')).toThrow();
});
```

**Step 3: Run** → FAIL.

**Step 4: Implement**

```ts
import type { Fetcher } from '../types';

export function parseBnrFx(xml: string) {
  const date = xml.match(/<Cube date="(\d{4}-\d{2}-\d{2})"/)?.[1];
  const rate = xml.match(/<Rate currency="EUR">([\d.]+)<\/Rate>/)?.[1];
  if (!date || !rate) throw new Error('BNR FX feed: EUR rate or date not found');
  return { value: Number(rate), asOf: date };
}

const URL = 'https://www.bnr.ro/nbrfxrates.xml';

export const bnrFx: Fetcher = {
  path: 'values.eurRon',
  unit: 'lei/€',
  source: 'BNR',
  sourceUrl: URL,
  range: { min: 3, max: 10 },
  fetch: async () => {
    const res = await fetch(URL);
    if (!res.ok) throw new Error(`BNR FX HTTP ${res.status}`);
    return parseBnrFx(await res.text());
  },
};
```

Register it in `pipeline/fetchers/index.ts`: `export const FETCHERS: Fetcher[] = [bnrFx];`

**Step 5: Run** tests → PASS; then `npm run data:fetch` → `values.eurRon | updated`. Remove the `eurRon` entry from `data/overrides.json` so the auto value is used, then `npm run data:merge`.

**Step 6: Commit**

```bash
git add pipeline data src/data/defaults.json
git commit -m "feat: Added BNR exchange rate fetcher"
```

---

### Task 21: IRCC fetcher

Same pattern as Task 20. The exact BNR page/format for IRCC is **unverified**.

**Step 1:** Find where BNR publishes IRCC (search bnr.ro for "IRCC"). Prefer a machine-readable format (XML/CSV/XLS) over HTML. Save a sample to `pipeline/fixtures/bnr-ircc.<ext>` and note the latest value and its effective date.

**Step 2:** Write a failing test `pipeline/fetchers/bnrIrcc.test.ts` asserting `parseBnrIrcc(fixture)` returns `{ value: <decimal, e.g. 0.0555>, asOf: '<date>' }` and throws on garbage. Note the source publishes a percentage; the parser must divide by 100.

**Step 3:** Implement `pipeline/fetchers/bnrIrcc.ts` exporting `parseBnrIrcc` and a `Fetcher` with `path: 'values.ircc'`, `unit: '%'`, `range: { min: 0, max: 0.2 }`.

**Step 4:** Register, run tests and `npm run data:fetch`, remove `ircc` from overrides, merge.

**Step 5:** Commit: `git commit -m "feat: Added BNR IRCC fetcher"`

If no stable machine-readable source exists, don't scrape fragile HTML; leave IRCC manual, note that in `data/SOURCES.md`, and commit only the note.

---

### Task 22: Inflation fetcher

Same pattern as Task 21, for `values.inflation` from INS (Tempo or the monthly CPI press release) or BNR. Decide which figure to use — last 12-month CPI change is the simplest — and document it in `data/SOURCES.md`. Range: `{ min: -0.05, max: 0.3 }`. If the source has no stable machine-readable format, leave the value manual.

Commit: `git commit -m "feat: Added inflation fetcher"`

---

### Task 23: Real-estate portal data (gated)

**Step 1: Check terms first.** Read robots.txt and the terms of use of imobiliare.ro and storia.ro, and check whether their monthly price/rent reports are published in a parseable form. Write findings into `data/SOURCES.md`.

**Step 2: Decide.**
- If automated access to the reports is clearly allowed: add one fetcher per city/field (`path: 'cities.<id>.priceSqmEurExisting'`, etc.) following the fixture pattern of Task 20. Ranges: prices `{ min: 500, max: 6000 }`, rent `{ min: 3, max: 40 }`.
- If not allowed or unclear: **don't scrape**. City values stay manual in `data/overrides.json`, updated by hand from the published reports. Ask the user before choosing this path's alternative (e.g. contacting the portal).

**Step 3:** Commit whatever was done: `git commit -m "feat: Added city price and rent data source"` (or `docs: Documented city data sources` if manual).

---

### Task 24: Scheduled data update workflow

**Files:**
- Create: `.github/workflows/update-data.yml`

```yaml
name: Update data

on:
  schedule:
    - cron: '0 6 * * 1' # Mondays 06:00 UTC
  workflow_dispatch:

permissions:
  contents: write
  pull-requests: write

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run data:fetch
      - run: npm run data:merge
      - run: npm test
      # A PR rather than a direct push, so a broken source can't silently change live numbers.
      - uses: peter-evans/create-pull-request@v7
        with:
          branch: data/auto-update
          title: 'chore: Updated data'
          commit-message: 'chore: Updated data'
          body-path: pipeline-summary.md
          add-paths: |
            data/auto.json
            src/data/defaults.json
```

Commit: `git commit -m "ci: Added weekly data update workflow"`

Verifying this needs the repo on GitHub with Actions enabled and "Allow GitHub Actions to create pull requests" turned on in repo settings. Ask the user before pushing or creating the remote.

---

## Phase 6 — Deploy

### Task 25: Static deploy

Ask the user to choose a host (GitHub Pages, Cloudflare Pages, Netlify). For GitHub Pages:

**Files:**
- Create: `.github/workflows/deploy.yml`

```yaml
name: Deploy

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

Verify locally first: `npm run build && npm run preview` → app loads from `dist/`.

Commit: `git commit -m "ci: Added GitHub Pages deploy workflow"`

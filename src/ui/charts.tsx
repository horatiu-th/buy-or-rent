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
const GRID = 'var(--grid)';
const TICK = { fill: 'var(--text-secondary)', fontSize: 12 };

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

// Recharts 3 types tooltip values as ValueType (number | string | array), so narrow before formatting.
const tooltipMoney = (fmt: (v: number) => string) => (v: unknown) => (typeof v === 'number' ? fmt(v) : String(v));

export function NetWorthChart({ result, view }: { result: Result; view: View }) {
  const data = yearly(result, view);
  const fmt = axisMoney(view);
  return (
    <ResponsiveContainer width="100%" height={360}>
      <LineChart data={data}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="year" tick={TICK} stroke={GRID} label={{ value: ro.year, position: 'insideBottomRight', offset: -4 }} />
        <YAxis tickFormatter={fmt} width={110} tick={TICK} stroke={GRID} />
        <Tooltip formatter={tooltipMoney(fmt)} labelFormatter={(y) => `${ro.year} ${y}`} />
        <Legend />
        {result.breakEvenMonth !== null && (
          <ReferenceLine x={Math.ceil(result.breakEvenMonth / 12)} stroke="var(--text-secondary)" strokeDasharray="4 4" />
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
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="year" tick={TICK} stroke={GRID} />
        <YAxis tickFormatter={fmt} width={110} tick={TICK} stroke={GRID} />
        <Tooltip formatter={tooltipMoney(fmt)} labelFormatter={(y) => `${ro.year} ${y}`} />
        <Legend />
        <Area type="monotone" dataKey="buyerCost" name={ro.buyer} stroke={BUYER} strokeWidth={2} fill={BUYER} fillOpacity={0.15} />
        <Area type="monotone" dataKey="renterCost" name={ro.renter} stroke={RENTER} strokeWidth={2} fill={RENTER} fillOpacity={0.15} />
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
      <BarChart data={data} layout="vertical" barGap={2}>
        <CartesianGrid stroke={GRID} horizontal={false} />
        <XAxis type="number" tickFormatter={fmt} tick={TICK} stroke={GRID} />
        <YAxis type="category" dataKey="name" width={140} tick={TICK} stroke={GRID} />
        <Tooltip formatter={tooltipMoney(fmt)} />
        <Legend />
        <Bar dataKey="buyer" name={ro.buyer} fill={BUYER} radius={[0, 4, 4, 0]} />
        <Bar dataKey="renter" name={ro.renter} fill={RENTER} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

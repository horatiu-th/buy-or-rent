import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart,
  ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import type { Result } from '../engine';
import { ro } from '../i18n/ro';
import { formatMoney, type Currency } from './format';

export interface View { currency: Currency; eurRon: number; real: boolean }

const BUYER = 'var(--buyer)';
const RENTER = 'var(--renter)';
const INVEST = 'var(--invest)';
const GRID = 'var(--line)';
const TICK = { fill: 'var(--muted)', fontSize: 12 };
const AXIS = { stroke: 'var(--line)', tickLine: false } as const;

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
      renterCash: conv(r.renterCashNetWorth, r.deflator),
      buyerCost: conv(r.buyerMonthlyCost, r.deflator),
      renterCost: conv(r.renterMonthlyCost, r.deflator),
    }));
}

const axisMoney = (view: View) => (v: number) =>
  formatMoney(view.currency === 'EUR' ? v * view.eurRon : v, view.currency, view.eurRon);

/** Axis ticks in thousands keep the y-axis narrow; full values live in the tooltip. */
const axisShort = (view: View) => (v: number) => {
  const abs = Math.abs(v);
  const unit = view.currency === 'EUR' ? '€' : 'lei';
  if (abs >= 1_000_000) return `${(v / 1_000_000).toLocaleString('ro-RO', { maximumFractionDigits: 1 })} mil. ${unit}`;
  if (abs >= 1_000) return `${(v / 1_000).toLocaleString('ro-RO', { maximumFractionDigits: 0 })} mii ${unit}`;
  return `${Math.round(v)} ${unit}`;
};

interface TipProps {
  active?: boolean;
  payload?: ReadonlyArray<{ name?: string | number; value?: unknown; color?: string; dataKey?: unknown }>;
  label?: unknown;
  fmt: (v: number) => string;
  title?: (label: unknown) => string;
}

function ChartTip({ active, payload, label, fmt, title }: TipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tip">
      {title && <p className="chart-tip-title">{title(label)}</p>}
      {payload.map((p) => (
        <p key={String(p.name)} className="chart-tip-row">
          <span className={`swatch${p.dataKey === 'renterCash' ? ' dashed' : ''}`} style={{ color: p.color }} aria-hidden="true" />
          <span>{p.name}</span>
          <strong>{typeof p.value === 'number' ? fmt(p.value) : String(p.value)}</strong>
        </p>
      ))}
    </div>
  );
}

const yearTitle = (y: unknown) => `${ro.year} ${y}`;

export function NetWorthChart({ result, view }: { result: Result; view: View }) {
  const data = yearly(result, view);
  const fmt = axisMoney(view);
  return (
    <ResponsiveContainer width="100%" height={340}>
      <LineChart data={data} margin={{ top: 32, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="year" tick={TICK} {...AXIS} interval="preserveStartEnd" minTickGap={28} />
        <YAxis tickFormatter={axisShort(view)} width={84} tick={TICK} axisLine={false} tickLine={false} />
        <Tooltip content={(p) => <ChartTip {...p} fmt={fmt} title={yearTitle} />} cursor={{ stroke: 'var(--muted)', strokeDasharray: '3 3' }} />
        {result.breakEvenMonth !== null && (
          <ReferenceLine
            x={Math.ceil(result.breakEvenMonth / 12)}
            stroke="var(--muted)"
            strokeDasharray="3 3"
            label={{ value: ro.breakEvenMark, position: 'top', offset: 14, fill: 'var(--muted)', fontSize: 12 }}
          />
        )}
        <Line type="monotone" dataKey="renterCash" name={ro.renterCash} stroke={RENTER} dot={false} strokeWidth={2} strokeDasharray="5 4" activeDot={{ r: 3 }} />
        <Line type="monotone" dataKey="renter" name={ro.renterInvesting} stroke={INVEST} dot={false} strokeWidth={2.5} activeDot={{ r: 4 }} />
        <Line type="monotone" dataKey="buyer" name={ro.buyer} stroke={BUYER} dot={false} strokeWidth={2.5} activeDot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function MonthlyCostsChart({ result, view }: { result: Result; view: View }) {
  const data = yearly(result, view).filter((d) => d.year > 0);
  const fmt = axisMoney(view);
  return (
    <ResponsiveContainer width="100%" height={340}>
      <AreaChart data={data} margin={{ top: 16, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="year" tick={TICK} {...AXIS} interval="preserveStartEnd" minTickGap={28} />
        <YAxis tickFormatter={axisShort(view)} width={84} tick={TICK} axisLine={false} tickLine={false} />
        <Tooltip content={(p) => <ChartTip {...p} fmt={fmt} title={yearTitle} />} cursor={{ stroke: 'var(--muted)', strokeDasharray: '3 3' }} />
        <Area type="monotone" dataKey="renterCost" name={ro.renter} stroke={RENTER} strokeWidth={2.5} fill={RENTER} fillOpacity={0.08} />
        <Area type="monotone" dataKey="buyerCost" name={ro.buyer} stroke={BUYER} strokeWidth={2.5} fill={BUYER} fillOpacity={0.08} />
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
    { name: t.rent, buyer: 0, renter: conv(r.rent) },
    { name: t.interest, buyer: conv(b.interest), renter: 0 },
    { name: t.maintenance, buyer: conv(b.maintenance), renter: 0 },
    { name: t.saleCosts, buyer: conv(b.saleCosts), renter: 0 },
    { name: t.acquisitionCosts, buyer: conv(b.acquisitionCosts), renter: 0 },
    { name: t.insurance, buyer: conv(b.insurance), renter: conv(r.insurance) },
    { name: t.propertyTax, buyer: conv(b.propertyTax), renter: 0 },
    { name: t.investmentTax, buyer: conv(b.investmentTax), renter: conv(r.investmentTax) },
  ];
  const nominal = { ...view, real: false };
  const fmt = axisMoney(nominal);
  return (
    <ResponsiveContainer width="100%" height={360}>
      <BarChart data={data} layout="vertical" barGap={2} barCategoryGap="28%" margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid stroke={GRID} horizontal={false} />
        <XAxis type="number" tickFormatter={axisShort(nominal)} tick={TICK} {...AXIS} />
        <YAxis type="category" dataKey="name" width={132} tick={TICK} axisLine={false} tickLine={false} />
        <Tooltip content={(p) => <ChartTip {...p} fmt={fmt} title={(l) => String(l)} />} cursor={{ fill: 'var(--field)' }} />
        <Bar dataKey="buyer" name={ro.buyer} fill={BUYER} radius={[0, 3, 3, 0]} />
        <Bar dataKey="renter" name={ro.renter} fill={RENTER} radius={[0, 3, 3, 0]}>
          {/* Investment tax is paid only by the renter who invests, so it takes that renter's colour. */}
          {data.map((d) => <Cell key={d.name} fill={d.name === t.investmentTax ? INVEST : RENTER} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

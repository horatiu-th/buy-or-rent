import { useSyncExternalStore, type ReactNode } from 'react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart,
  ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import type { Result } from '../engine';
import { ro } from '../i18n/ro';
import { formatDuration, formatMoney, type Currency } from './format';

export interface View { currency: Currency; eurRon: number; real: boolean }

const BUYER = 'var(--buyer)';
const RENTER = 'var(--renter)';
const INVEST = 'var(--invest)';
const GRID = 'var(--line)';
const TICK = { fill: 'var(--muted)', fontSize: 12 };
const AXIS = { stroke: 'var(--line)', tickLine: false } as const;

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

function subscribeMotion(onChange: () => void) {
  if (typeof window.matchMedia !== 'function') return () => {};
  const mq = window.matchMedia(REDUCED_MOTION);
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}

/** Recharts animates in JS, so the CSS reduced-motion rule doesn't reach it; the series opt out here instead. */
function useAnimate(): boolean {
  return useSyncExternalStore(
    subscribeMotion,
    () => typeof window.matchMedia !== 'function' || !window.matchMedia(REDUCED_MOTION).matches,
    () => true,
  );
}

/**
 * One point per simulated month, x in years. Monthly points keep the final month of any horizon
 * and put steps (the fixed rate ending, a sale-tax drop) exactly where they happen.
 */
export function chartRows(result: Result, view: View) {
  const conv = (v: number, deflator: number) => {
    const real = view.real ? v / deflator : v;
    return view.currency === 'EUR' ? real / view.eurRon : real;
  };
  return result.rows.map((r) => ({
    month: r.month,
    year: r.month / 12,
    buyer: conv(r.buyerNetWorth, r.deflator),
    renter: conv(r.renterNetWorth, r.deflator),
    renterCash: conv(r.renterCashNetWorth, r.deflator),
    buyerCost: conv(r.buyerMonthlyCost, r.deflator),
    renterCost: conv(r.renterMonthlyCost, r.deflator),
  }));
}

/** Where the break-even marker goes, in years; none when there is no crossing to mark. */
export function breakEvenX(result: Pick<Result, 'breakEvenMonth'>): number | null {
  const m = result.breakEvenMonth;
  return m === null || m === 0 ? null : m / 12;
}

/** Whole-year ticks at an even step, at most eight of them, never past the horizon. */
export function yearTicks(horizonYears: number): number[] {
  const step = [1, 2, 5, 10, 20].find((s) => Math.floor(horizonYears / s) + 1 <= 8) ?? 20;
  const ticks: number[] = [];
  for (let y = 0; y <= horizonYears + 1e-9; y += step) ticks.push(y);
  return ticks;
}

/** Round ticks (1, 2, 2.5 or 5 × 10ⁿ apart) covering lo..hi in about five intervals. */
export function niceTicks(lo: number, hi: number): number[] {
  if (!(hi > lo)) return [Math.min(0, lo), Math.max(0, lo) || 1];
  const raw = (hi - lo) / 5;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = ([1, 2, 2.5, 5, 10].find((m) => m * pow >= raw) ?? 10) * pow;
  const ticks: number[] = [];
  // Rounding each tick keeps float drift (0.30000000000000004) out of the labels.
  for (let k = Math.floor(lo / step); k <= Math.ceil(hi / step); k++) ticks.push(+(k * step).toPrecision(12));
  return ticks;
}

const shortFmt = new Intl.NumberFormat('ro-RO', { maximumFractionDigits: 3 });

/**
 * Tick labels for a money axis. The unit is chosen once from the largest tick, so one axis never
 * mixes "900 mii" with "1 mil.". Ticks are round numbers, so up to three decimals print them exactly.
 */
export function axisShort(ticks: readonly number[], currency: Currency) {
  const symbol = currency === 'EUR' ? '€' : 'lei';
  const top = Math.max(...ticks.map(Math.abs));
  const [div, unit] = top >= 1_000_000 ? [1_000_000, ' mil.'] : top >= 10_000 ? [1_000, ' mii'] : [1, ''];
  return (v: number) => (v === 0 ? `0 ${symbol}` : `${shortFmt.format(v / div)}${unit} ${symbol}`);
}

/** Formats a value already converted to the display currency. */
const shownMoney = (view: View) => (v: number) =>
  formatMoney(view.currency === 'EUR' ? v * view.eurRon : v, view.currency, view.eurRon);

function moneyAxis(values: number[], view: View) {
  const ticks = niceTicks(Math.min(0, ...values), Math.max(0, ...values));
  return { ticks, domain: [ticks[0], ticks[ticks.length - 1]] as [number, number], tickFormatter: axisShort(ticks, view.currency) };
}

interface TipProps {
  active?: boolean;
  payload?: ReadonlyArray<{ name?: string | number; value?: unknown; color?: string; dataKey?: unknown; payload?: unknown }>;
  label?: unknown;
  fmt: (v: number) => string;
  title?: (label: unknown, point: unknown) => string;
}

function ChartTip({ active, payload, label, fmt, title }: TipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tip">
      {title && <p className="chart-tip-title">{title(label, payload[0].payload)}</p>}
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

const monthOf = (point: unknown) => (point as { month: number }).month;
const afterTitle = (_: unknown, point: unknown) => {
  const m = monthOf(point);
  return m === 0 ? ro.chartStart : ro.afterTime(formatDuration(m));
};
const monthTitle = (_: unknown, point: unknown) => ro.monthN(monthOf(point));

/**
 * Recharts makes the chart focusable for keyboard exploration but gives it no name, and the lines
 * themselves say nothing to a screen reader, so each chart carries a name and a text summary.
 */
function ChartFigure({ name, summary, children }: { name: string; summary: string; children: ReactNode }) {
  return (
    <figure className="chart-figure" aria-label={name}>
      <p className="visually-hidden">{summary}</p>
      {children}
    </figure>
  );
}

function yearAxis(rows: { year: number }[]) {
  const end = rows[rows.length - 1]?.year ?? 0;
  return (
    <XAxis
      type="number"
      dataKey="year"
      domain={[0, end]}
      ticks={yearTicks(end)}
      allowDecimals={false}
      tick={TICK}
      {...AXIS}
    />
  );
}

export function NetWorthChart({ result, view }: { result: Result; view: View }) {
  const animate = useAnimate();
  const data = chartRows(result, view);
  const fmt = shownMoney(view);
  const y = moneyAxis(data.flatMap((d) => [d.buyer, d.renter, d.renterCash]), view);
  const marker = breakEvenX(result);
  const last = data[data.length - 1];
  const summary = [
    ro.charts.netWorthSummary(formatDuration(last.month), fmt(last.buyer), fmt(last.renter), fmt(last.renterCash)),
    marker !== null && result.breakEvenMonth !== null ? ro.charts.breakEvenSummary(formatDuration(result.breakEvenMonth)) : '',
  ].filter(Boolean).join(' ');
  return (
    <ChartFigure name={ro.charts.netWorth} summary={summary}>
      <ResponsiveContainer width="100%" height={340}>
        <LineChart data={data} title={ro.charts.netWorth} margin={{ top: 32, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          {yearAxis(data)}
          <YAxis {...y} width={84} tick={TICK} axisLine={false} tickLine={false} />
          <Tooltip content={(p) => <ChartTip {...p} fmt={fmt} title={afterTitle} />} cursor={{ stroke: 'var(--muted)', strokeDasharray: '3 3' }} />
          {marker !== null && (
            <ReferenceLine
              x={marker}
              stroke="var(--muted)"
              strokeDasharray="3 3"
              label={{ value: ro.breakEvenMark, position: 'top', offset: 14, fill: 'var(--muted)', fontSize: 12 }}
            />
          )}
          <Line isAnimationActive={animate} type="linear" dataKey="renterCash" name={ro.renterCash} stroke={RENTER} dot={false} strokeWidth={2} strokeDasharray="5 4" activeDot={{ r: 3 }} />
          <Line isAnimationActive={animate} type="linear" dataKey="renter" name={ro.renterInvesting} stroke={INVEST} dot={false} strokeWidth={2.5} activeDot={{ r: 4 }} />
          <Line isAnimationActive={animate} type="linear" dataKey="buyer" name={ro.buyer} stroke={BUYER} dot={false} strokeWidth={2.5} activeDot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </ChartFigure>
  );
}

export function MonthlyCostsChart({ result, view }: { result: Result; view: View }) {
  const animate = useAnimate();
  // Month 0 is the purchase itself, not a monthly cost.
  const data = chartRows(result, view).filter((d) => d.month > 0);
  const fmt = shownMoney(view);
  const y = moneyAxis(data.flatMap((d) => [d.buyerCost, d.renterCost]), view);
  const first = data[0];
  const last = data[data.length - 1];
  const summary = first && last
    ? ro.charts.monthlySummary(fmt(first.buyerCost), fmt(first.renterCost), fmt(last.buyerCost), fmt(last.renterCost))
    : '';
  // Costs hold for a whole month and jump when the fixed rate ends, so they are drawn as steps,
  // not smoothed curves that would invent a dip before the jump.
  return (
    <ChartFigure name={ro.charts.monthly} summary={summary}>
      <ResponsiveContainer width="100%" height={340}>
        <AreaChart data={data} title={ro.charts.monthly} margin={{ top: 16, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          {yearAxis(data)}
          <YAxis {...y} width={84} tick={TICK} axisLine={false} tickLine={false} />
          <Tooltip content={(p) => <ChartTip {...p} fmt={fmt} title={monthTitle} />} cursor={{ stroke: 'var(--muted)', strokeDasharray: '3 3' }} />
          <Area isAnimationActive={animate} type="stepAfter" dataKey="renterCost" name={ro.renter} stroke={RENTER} strokeWidth={2.5} fill={RENTER} fillOpacity={0.08} />
          <Area isAnimationActive={animate} type="stepAfter" dataKey="buyerCost" name={ro.buyer} stroke={BUYER} strokeWidth={2.5} fill={BUYER} fillOpacity={0.08} />
        </AreaChart>
      </ResponsiveContainer>
    </ChartFigure>
  );
}

export function BreakdownChart({ result, view }: { result: Result; view: View }) {
  const animate = useAnimate();
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
  const fmt = shownMoney(nominal);
  const x = moneyAxis(data.flatMap((d) => [d.buyer, d.renter]), nominal);
  const summary = ro.charts.breakdownSummary(
    data
      .map((d) => {
        const parts = [d.buyer > 0 && `${ro.buyer.toLowerCase()} ${fmt(d.buyer)}`, d.renter > 0 && `${ro.renter.toLowerCase()} ${fmt(d.renter)}`].filter(Boolean);
        return parts.length ? `${d.name}: ${parts.join(', ')}` : '';
      })
      .filter(Boolean)
      .join('; '),
  );
  return (
    <ChartFigure name={ro.charts.breakdown} summary={summary}>
      <ResponsiveContainer width="100%" height={360}>
        <BarChart data={data} title={ro.charts.breakdown} layout="vertical" barGap={2} barCategoryGap="28%" margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={GRID} horizontal={false} />
          <XAxis type="number" {...x} tick={TICK} {...AXIS} />
          <YAxis type="category" dataKey="name" width={132} tick={TICK} axisLine={false} tickLine={false} />
          <Tooltip content={(p) => <ChartTip {...p} fmt={fmt} title={(l) => String(l)} />} cursor={{ fill: 'var(--field)' }} />
          <Bar isAnimationActive={animate} dataKey="buyer" name={ro.buyer} fill={BUYER} radius={[0, 3, 3, 0]} />
          <Bar isAnimationActive={animate} dataKey="renter" name={ro.renter} fill={RENTER} radius={[0, 3, 3, 0]}>
            {/* Investment tax is paid only by the renter who invests, so it takes that renter's colour. */}
            {data.map((d) => <Cell key={d.name} fill={d.name === t.investmentTax ? INVEST : RENTER} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartFigure>
  );
}

import { memo, useState, type ReactNode } from 'react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart,
  ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import type { Result } from '../engine';
import { t } from '../i18n';
import { formatMoney, fromUnits, inView, toUnits, type View } from './money';
import { useMediaQuery } from './useMediaQuery';

const BUYER = 'var(--buyer)';
const RENTER = 'var(--renter)';
const GRID = 'var(--line)';
const TICK = { fill: 'var(--muted)', fontSize: 12 };
const AXIS = { stroke: 'var(--line)', tickLine: false } as const;

const Y_AXIS = { width: 84, tick: TICK, axisLine: false, tickLine: false } as const;
const LINE_CURSOR = { stroke: 'var(--muted)', strokeDasharray: '3 3' };

/** Recharts animates in JS, so the CSS reduced-motion rule doesn't reach it; the series opt out here instead. */
const useAnimate = () => !useMediaQuery('(prefers-reduced-motion: reduce)');

/**
 * One point per simulated month, x in years. Monthly points keep the final month of any horizon
 * and put steps (the fixed rate ending, a sale-tax drop) exactly where they happen.
 */
export function chartRows(result: Result, view: View) {
  const conv = (v: number, deflator: number) => toUnits(inView(v, deflator, view), view.money);
  return result.rows.map((r) => ({
    month: r.month,
    year: r.month / 12,
    buyer: conv(r.buyerNetWorth, r.deflator),
    buyerNoInvest: conv(r.buyerNoInvestNetWorth, r.deflator),
    renter: conv(r.renterNetWorth, r.deflator),
    renterNoInvest: conv(r.renterNoInvestNetWorth, r.deflator),
    buyerCost: conv(r.buyerMonthlyCost, r.deflator),
    renterCost: conv(r.renterMonthlyCost, r.deflator),
  }));
}

/** Where the break-even marker goes, in years; none when there is no crossing to mark. */
export function breakEvenX(result: Pick<Result, 'breakEvenMonth'>): number | null {
  const m = result.breakEvenMonth;
  return m ? m / 12 : null;
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

const shortFmt = new Intl.NumberFormat(t.numberLocale, { maximumFractionDigits: 3 });

/**
 * Tick labels for a money axis. The unit is chosen once from the largest tick, so one axis never
 * mixes "900 mii" with "1 mil.". Ticks are round numbers, so up to three decimals print them exactly.
 */
export function axisShort(ticks: readonly number[], symbol: string) {
  const top = Math.max(...ticks.map(Math.abs));
  const { thousand, million } = t.axisUnits;
  const [div, unit] = top >= 1_000_000 ? [1_000_000, ` ${million}`] : top >= 10_000 ? [1_000, ` ${thousand}`] : [1, ''];
  return (v: number) => (v === 0 ? `0 ${symbol}` : `${shortFmt.format(v / div)}${unit} ${symbol}`);
}

/** Formats a value already converted to the display currency. */
const shownMoney = (view: View) => (v: number) => formatMoney(fromUnits(v, view.money), view.money);

function moneyAxis(values: number[], view: View) {
  const ticks = niceTicks(Math.min(0, ...values), Math.max(0, ...values));
  return { ticks, domain: [ticks[0], ticks[ticks.length - 1]] as [number, number], tickFormatter: axisShort(ticks, view.money.symbol) };
}

type ChartRow = ReturnType<typeof chartRows>[number];

interface TipProps<Point> {
  description?: string;
  hidden?: ReadonlySet<string>;
  /** The chart's series, so rows follow the legend's order and dotted lines get a dotted sample. */
  series?: readonly Series<string>[];
  active?: boolean;
  payload?: ReadonlyArray<{ name?: string | number; value?: unknown; color?: string; dataKey?: unknown; payload?: Point }>;
  label?: unknown;
  fmt: (v: number) => string;
  title?: (label: unknown, point: Point | undefined) => string;
}

export function ChartTip<Point>({ active, payload: all, label, fmt, title, description, hidden, series }: TipProps<Point>) {
  const find = (p: { dataKey?: unknown }) => series?.find((s) => s.key === String(p.dataKey));
  const rank = (p: { dataKey?: unknown }) => (series ? series.findIndex((s) => s.key === String(p.dataKey)) : 0);
  // Recharts lists rows in drawing order, which puts the buyer's main line last; the legend's order reads better.
  const payload = all?.filter((p) => !hidden?.has(String(p.dataKey))).sort((a, b) => rank(a) - rank(b));
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tip">
      {title && <p className="chart-tip-title">{title(label, payload[0].payload)}</p>}
      {description && <p className="chart-tip-description">{description}</p>}
      {payload.map((p) => (
        <p key={String(p.name)} className="chart-tip-row">
          <span className={find(p)?.dotted ? 'swatch dotted' : 'swatch'} style={{ color: p.color }} aria-hidden="true" />
          <span>{p.name}</span>
          <strong>{typeof p.value === 'number' ? fmt(p.value) : String(p.value)}</strong>
        </p>
      ))}
    </div>
  );
}

const afterTitle = (_: unknown, point: ChartRow | undefined) => {
  const m = point?.month ?? 0;
  return m === 0 ? t.chartStart : t.afterTime(t.duration(m));
};
const monthTitle = (_: unknown, point: ChartRow | undefined) => t.monthN(point?.month ?? 0);

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

interface Series<K extends string> {
  key: K;
  /** The full name, for the tooltip and screen readers. */
  label: string;
  color: string;
  dotted?: boolean;
  /** Series sharing a group are listed under its name, each with its short label. */
  group?: string;
  short?: string;
}

/** Consecutive series with the same group, in order; a series without a group stands alone. */
function groupSeries<K extends string>(series: readonly Series<K>[]) {
  const groups: { name?: string; items: Series<K>[] }[] = [];
  for (const s of series) {
    const prev = groups.at(-1);
    if (s.group && prev?.name === s.group) prev.items.push(s);
    else groups.push({ name: s.group, items: [s] });
  }
  return groups;
}

const NONE: ReadonlySet<string> = new Set();

/**
 * Which series of a chart are switched off. The last visible one can't be hidden, so the plot is never empty.
 * The parent can hold the state, so the choice survives the chart unmounting when another tab is opened.
 */
export function useHiddenSeries<K extends string>(series: readonly Series<K>[], held?: HiddenProps) {
  const [own, setOwn] = useState<ReadonlySet<string>>(NONE);
  const hidden = held?.hidden ?? own;
  const setHidden = held?.onHiddenChange ?? setOwn;
  const toggle = (key: K) => {
    const next = new Set(hidden);
    if (next.has(key)) next.delete(key);
    else if (series.some((s) => s.key !== key && !next.has(s.key))) next.add(key);
    setHidden(next);
  };
  const shown = series.filter((s) => !hidden.has(s.key)).map((s) => s.key);
  return { hidden, toggle, shown };
}

/**
 * Every chart names its series right above the plot, so no chart depends on a legend elsewhere on the page.
 * Each entry is a toggle that shows or hides its series.
 */
function ChartLegend<K extends string>({ series, hidden, onToggle }: {
  series: readonly Series<K>[]; hidden: ReadonlySet<string>; onToggle: (key: K) => void;
}) {
  const lastShown = series.filter((s) => !hidden.has(s.key)).length === 1;
  return (
    <div className="chart-legend" role="group" aria-label={t.charts.legend}>
      {groupSeries(series).map((g) => (
        <span key={g.items[0].key} className="legend-group">
          {g.name && <span className="legend-group-name" aria-hidden="true">{g.name}</span>}
          {g.items.map((s) => {
            const on = !hidden.has(s.key);
            return (
              <button
                key={s.key}
                type="button"
                className="legend-toggle"
                aria-label={s.short ? s.label : undefined}
                aria-pressed={on}
                aria-disabled={on && lastShown}
                title={on && lastShown ? t.charts.lastSeries : undefined}
                onClick={() => onToggle(s.key)}
              >
                <i className={s.dotted ? 'swatch dotted' : 'swatch'} style={{ color: s.color }} aria-hidden="true" />
                {s.short ?? s.label}
              </button>
            );
          })}
        </span>
      ))}
    </div>
  );
}

function yearAxis(rows: readonly { year: number }[]) {
  const end = rows.at(-1)?.year ?? 0;
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

export interface HiddenProps {
  hidden?: ReadonlySet<string>;
  onHiddenChange?: (hidden: ReadonlySet<string>) => void;
}

interface ChartProps extends HiddenProps { result: Result; view: View }

const NET_WORTH_SERIES = [
  { key: 'buyer', label: t.buyerInvesting, color: BUYER, group: t.buyer, short: t.investing },
  { key: 'buyerNoInvest', label: t.buyerNoInvest, color: BUYER, dotted: true, group: t.buyer, short: t.notInvesting },
  { key: 'renter', label: t.renterInvesting, color: RENTER, group: t.renter, short: t.investing },
  { key: 'renterNoInvest', label: t.renterNoInvest, color: RENTER, dotted: true, group: t.renter, short: t.notInvesting },
] as const satisfies readonly Series<keyof ChartRow>[];

const MONTHLY_SERIES = [
  { key: 'buyerCost', label: t.buyer, color: BUYER },
  { key: 'renterCost', label: t.renter, color: RENTER },
] as const satisfies readonly Series<keyof ChartRow>[];

const BREAKDOWN_SERIES = [
  { key: 'buyer', label: t.buyerInvesting, color: BUYER },
  { key: 'renter', label: t.renterInvesting, color: RENTER },
] as const satisfies readonly Series<'buyer' | 'renter'>[];

// Memoized: the results panel re-renders on every rent keystroke before the deferred inputs catch up.
export const NetWorthChart = memo(function NetWorthChart({ result, view, ...held }: ChartProps) {
  const animate = useAnimate();
  const data = chartRows(result, view);
  const fmt = shownMoney(view);
  const { hidden, toggle, shown } = useHiddenSeries(NET_WORTH_SERIES, held);
  const y = moneyAxis(data.flatMap((d) => shown.map((k) => d[k])), view);
  // The break-even month compares the investing buyer with the renter, so it only means something while both are drawn.
  const marker = hidden.has('buyer') || hidden.has('renter') ? null : breakEvenX(result);
  const last = data[data.length - 1];
  const summary = [
    t.charts.netWorthSummary(t.duration(last.month), fmt(last.buyer), fmt(last.renter), fmt(last.buyerNoInvest), fmt(last.renterNoInvest)),
    result.breakEvenMonth ? t.charts.breakEvenSummary(t.duration(result.breakEvenMonth)) : '',
  ].filter(Boolean).join(' ');
  return (
    <ChartFigure name={t.charts.netWorth} summary={summary}>
      <ChartLegend series={NET_WORTH_SERIES} hidden={hidden} onToggle={toggle} />
      <ResponsiveContainer width="100%" height={340}>
        <LineChart data={data} title={t.charts.netWorth} margin={{ top: 32, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          {yearAxis(data)}
          <YAxis {...y} {...Y_AXIS} />
          <Tooltip content={(p) => <ChartTip<ChartRow> {...p} fmt={fmt} title={afterTitle} hidden={hidden} series={NET_WORTH_SERIES} />} cursor={LINE_CURSOR} />
          {marker !== null && (
            <ReferenceLine
              x={marker}
              stroke="var(--muted)"
              strokeDasharray="3 3"
              label={{ value: t.breakEvenMark, position: 'top', offset: 14, fill: 'var(--muted)', fontSize: 12 }}
            />
          )}
          <Line isAnimationActive={animate} type="linear" dataKey="renter" name={t.renterInvesting} hide={hidden.has('renter')} stroke={RENTER} dot={false} strokeWidth={2.5} activeDot={{ r: 4 }} />
          <Line isAnimationActive={animate} type="linear" dataKey="renterNoInvest" name={t.renterNoInvest} hide={hidden.has('renterNoInvest')} stroke={RENTER} strokeDasharray="2 4" strokeLinecap="round" dot={false} strokeWidth={2.5} activeDot={{ r: 4 }} />
          <Line isAnimationActive={animate} type="linear" dataKey="buyerNoInvest" name={t.buyerNoInvest} hide={hidden.has('buyerNoInvest')} stroke={BUYER} strokeDasharray="2 4" strokeLinecap="round" dot={false} strokeWidth={2.5} activeDot={{ r: 4 }} />
          <Line isAnimationActive={animate} type="linear" dataKey="buyer" name={t.buyerInvesting} hide={hidden.has('buyer')} stroke={BUYER} dot={false} strokeWidth={2.5} activeDot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
      {(!hidden.has('buyerNoInvest') || !hidden.has('renterNoInvest')) && <p className="note chart-note">{t.charts.noInvestNote}</p>}
    </ChartFigure>
  );
});

export const MonthlyCostsChart = memo(function MonthlyCostsChart({ result, view, ...held }: ChartProps) {
  const animate = useAnimate();
  // Month 0 is the purchase itself, not a monthly cost.
  const data = chartRows(result, view).filter((d) => d.month > 0);
  const fmt = shownMoney(view);
  const { hidden, toggle, shown } = useHiddenSeries(MONTHLY_SERIES, held);
  const y = moneyAxis(data.flatMap((d) => shown.map((k) => d[k])), view);
  const first = data[0];
  const last = data[data.length - 1];
  const summary = first && last
    ? t.charts.monthlySummary(fmt(first.buyerCost), fmt(first.renterCost), fmt(last.buyerCost), fmt(last.renterCost))
    : '';
  // Costs hold for a whole month and jump when the fixed rate ends, so they are drawn as steps,
  // not smoothed curves that would invent a dip before the jump.
  return (
    <ChartFigure name={t.charts.monthly} summary={summary}>
      <ChartLegend series={MONTHLY_SERIES} hidden={hidden} onToggle={toggle} />
      <ResponsiveContainer width="100%" height={340}>
        <AreaChart data={data} title={t.charts.monthly} margin={{ top: 16, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          {yearAxis(data)}
          <YAxis {...y} {...Y_AXIS} />
          <Tooltip content={(p) => <ChartTip<ChartRow> {...p} fmt={fmt} title={monthTitle} hidden={hidden} series={MONTHLY_SERIES} />} cursor={LINE_CURSOR} />
          <Area isAnimationActive={animate} type="stepAfter" dataKey="renterCost" name={t.renter} hide={hidden.has('renterCost')} stroke={RENTER} strokeWidth={2.5} fill={RENTER} fillOpacity={0.08} />
          <Area isAnimationActive={animate} type="stepAfter" dataKey="buyerCost" name={t.buyer} hide={hidden.has('buyerCost')} stroke={BUYER} strokeWidth={2.5} fill={BUYER} fillOpacity={0.08} />
        </AreaChart>
      </ResponsiveContainer>
    </ChartFigure>
  );
});

export const BreakdownChart = memo(function BreakdownChart({ result, view, ...held }: ChartProps) {
  const animate = useAnimate();
  // Totals are nominal sums; showing them in today's lei would need per-month deflation, so this chart stays nominal.
  const conv = (v: number) => toUnits(v, view.money);
  const b = result.buyer;
  const r = result.renter;
  const labels = t.breakdown;
  const data = [
    { ...labels.rent, buyer: 0, renter: conv(r.rent) },
    { ...labels.interest, buyer: conv(b.interest), renter: 0 },
    { ...labels.maintenance, buyer: conv(b.maintenance), renter: 0 },
    { ...labels.saleAgencyFee, buyer: conv(b.saleAgencyFee), renter: 0 },
    { ...labels.acquisitionCosts, buyer: conv(b.acquisitionCosts + b.fitOut), renter: conv(r.agencyFee + r.moving) },
    { ...labels.insurance, buyer: conv(b.insurance), renter: conv(r.insurance) },
    { ...labels.taxes, buyer: conv(b.propertyTax + b.investmentTax + b.saleTax), renter: conv(r.investmentTax) },
  ];
  const nominal = { ...view, real: false };
  const fmt = shownMoney(nominal);
  const { hidden, toggle, shown } = useHiddenSeries(BREAKDOWN_SERIES, held);
  const x = moneyAxis(data.flatMap((d) => shown.map((k) => d[k])), nominal);
  const summary = t.charts.breakdownSummary(
    data
      .map((d) => {
        const parts = [d.buyer > 0 && `${t.buyerInvesting.toLowerCase()} ${fmt(d.buyer)}`, d.renter > 0 && `${t.renterInvesting.toLowerCase()} ${fmt(d.renter)}`].filter(Boolean);
        return parts.length ? `${d.label}: ${parts.join(', ')}. ${d.help}` : '';
      })
      .filter(Boolean)
      .join('; '),
  );
  return (
    <ChartFigure name={t.charts.breakdown} summary={summary}>
      <ChartLegend series={BREAKDOWN_SERIES} hidden={hidden} onToggle={toggle} />
      <ResponsiveContainer width="100%" height={360}>
        <BarChart data={data} title={t.charts.breakdown} layout="vertical" barGap={2} barCategoryGap="28%" margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={GRID} horizontal={false} />
          <XAxis type="number" {...x} tick={TICK} {...AXIS} />
          <YAxis type="category" dataKey="label" width={132} tick={TICK} axisLine={false} tickLine={false} />
          <Tooltip
            shared
            content={(p) => <ChartTip {...p} fmt={fmt} hidden={hidden} series={BREAKDOWN_SERIES} title={String} description={data.find((row) => row.label === p.label)?.help} />}
            cursor={{ fill: 'var(--field)' }}
          />
          <Bar isAnimationActive={animate} dataKey="buyer" name={t.buyerInvesting} hide={hidden.has('buyer')} fill={BUYER} radius={[0, 3, 3, 0]} />
          <Bar isAnimationActive={animate} dataKey="renter" name={t.renterInvesting} hide={hidden.has('renter')} fill={RENTER} radius={[0, 3, 3, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartFigure>
  );
});

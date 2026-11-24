import { memo, type ReactNode } from 'react';
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
    renter: conv(r.renterNetWorth, r.deflator),
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
  active?: boolean;
  payload?: ReadonlyArray<{ name?: string | number; value?: unknown; color?: string; dataKey?: unknown; payload?: Point }>;
  label?: unknown;
  fmt: (v: number) => string;
  title?: (label: unknown, point: Point | undefined) => string;
}

function ChartTip<Point>({ active, payload, label, fmt, title, description }: TipProps<Point>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tip">
      {title && <p className="chart-tip-title">{title(label, payload[0].payload)}</p>}
      {description && <p className="chart-tip-description">{description}</p>}
      {payload.map((p) => (
        <p key={String(p.name)} className="chart-tip-row">
          <span className="swatch" style={{ color: p.color }} aria-hidden="true" />
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

/** Every chart names its two series right above the plot, so no chart depends on a legend elsewhere on the page. */
function ChartLegend({ renter }: { renter: string }) {
  return (
    <div className="chart-legend">
      <span><i className="swatch" style={{ color: BUYER }} aria-hidden="true" />{t.buyer}</span>
      <span><i className="swatch" style={{ color: RENTER }} aria-hidden="true" />{renter}</span>
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

interface ChartProps { result: Result; view: View }

// Memoized: the results panel re-renders on every rent keystroke before the deferred inputs catch up.
export const NetWorthChart = memo(function NetWorthChart({ result, view }: ChartProps) {
  const animate = useAnimate();
  const data = chartRows(result, view);
  const fmt = shownMoney(view);
  const y = moneyAxis(data.flatMap((d) => [d.buyer, d.renter]), view);
  const marker = breakEvenX(result);
  const last = data[data.length - 1];
  const summary = [
    t.charts.netWorthSummary(t.duration(last.month), fmt(last.buyer), fmt(last.renter)),
    result.breakEvenMonth ? t.charts.breakEvenSummary(t.duration(result.breakEvenMonth)) : '',
  ].filter(Boolean).join(' ');
  return (
    <ChartFigure name={t.charts.netWorth} summary={summary}>
      <ChartLegend renter={t.renterInvesting} />
      <ResponsiveContainer width="100%" height={340}>
        <LineChart data={data} title={t.charts.netWorth} margin={{ top: 32, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          {yearAxis(data)}
          <YAxis {...y} {...Y_AXIS} />
          <Tooltip content={(p) => <ChartTip<ChartRow> {...p} fmt={fmt} title={afterTitle} />} cursor={LINE_CURSOR} />
          {marker !== null && (
            <ReferenceLine
              x={marker}
              stroke="var(--muted)"
              strokeDasharray="3 3"
              label={{ value: t.breakEvenMark, position: 'top', offset: 14, fill: 'var(--muted)', fontSize: 12 }}
            />
          )}
          <Line isAnimationActive={animate} type="linear" dataKey="renter" name={t.renterInvesting} stroke={RENTER} dot={false} strokeWidth={2.5} activeDot={{ r: 4 }} />
          <Line isAnimationActive={animate} type="linear" dataKey="buyer" name={t.buyer} stroke={BUYER} dot={false} strokeWidth={2.5} activeDot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </ChartFigure>
  );
});

export const MonthlyCostsChart = memo(function MonthlyCostsChart({ result, view }: ChartProps) {
  const animate = useAnimate();
  // Month 0 is the purchase itself, not a monthly cost.
  const data = chartRows(result, view).filter((d) => d.month > 0);
  const fmt = shownMoney(view);
  const y = moneyAxis(data.flatMap((d) => [d.buyerCost, d.renterCost]), view);
  const first = data[0];
  const last = data[data.length - 1];
  const summary = first && last
    ? t.charts.monthlySummary(fmt(first.buyerCost), fmt(first.renterCost), fmt(last.buyerCost), fmt(last.renterCost))
    : '';
  // Costs hold for a whole month and jump when the fixed rate ends, so they are drawn as steps,
  // not smoothed curves that would invent a dip before the jump.
  return (
    <ChartFigure name={t.charts.monthly} summary={summary}>
      <ChartLegend renter={t.renter} />
      <ResponsiveContainer width="100%" height={340}>
        <AreaChart data={data} title={t.charts.monthly} margin={{ top: 16, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          {yearAxis(data)}
          <YAxis {...y} {...Y_AXIS} />
          <Tooltip content={(p) => <ChartTip<ChartRow> {...p} fmt={fmt} title={monthTitle} />} cursor={LINE_CURSOR} />
          <Area isAnimationActive={animate} type="stepAfter" dataKey="renterCost" name={t.renter} stroke={RENTER} strokeWidth={2.5} fill={RENTER} fillOpacity={0.08} />
          <Area isAnimationActive={animate} type="stepAfter" dataKey="buyerCost" name={t.buyer} stroke={BUYER} strokeWidth={2.5} fill={BUYER} fillOpacity={0.08} />
        </AreaChart>
      </ResponsiveContainer>
    </ChartFigure>
  );
});

export const BreakdownChart = memo(function BreakdownChart({ result, view }: ChartProps) {
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
  const x = moneyAxis(data.flatMap((d) => [d.buyer, d.renter]), nominal);
  const summary = t.charts.breakdownSummary(
    data
      .map((d) => {
        const parts = [d.buyer > 0 && `${t.buyer.toLowerCase()} ${fmt(d.buyer)}`, d.renter > 0 && `${t.renter.toLowerCase()} ${fmt(d.renter)}`].filter(Boolean);
        return parts.length ? `${d.label}: ${parts.join(', ')}. ${d.help}` : '';
      })
      .filter(Boolean)
      .join('; '),
  );
  return (
    <ChartFigure name={t.charts.breakdown} summary={summary}>
      <ChartLegend renter={t.renterInvesting} />
      <ResponsiveContainer width="100%" height={360}>
        <BarChart data={data} title={t.charts.breakdown} layout="vertical" barGap={2} barCategoryGap="28%" margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={GRID} horizontal={false} />
          <XAxis type="number" {...x} tick={TICK} {...AXIS} />
          <YAxis type="category" dataKey="label" width={132} tick={TICK} axisLine={false} tickLine={false} />
          <Tooltip
            shared
            content={(p) => <ChartTip {...p} fmt={fmt} title={String} description={data.find((row) => row.label === p.label)?.help} />}
            cursor={{ fill: 'var(--field)' }}
          />
          <Bar isAnimationActive={animate} dataKey="buyer" name={t.buyer} fill={BUYER} radius={[0, 3, 3, 0]} />
          <Bar isAnimationActive={animate} dataKey="renter" name={t.renterInvesting} fill={RENTER} radius={[0, 3, 3, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartFigure>
  );
});

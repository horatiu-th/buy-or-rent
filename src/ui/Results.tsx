import { lazy, memo, Suspense, useId, useMemo, useState } from 'react';
import type { HiddenProps } from './charts';
import {
  assumptionSwings, horizonGaps, horizonThresholds, lastRow, sensitivity, SENSITIVITY_BASE, simulate,
  type HorizonResult, type Inputs, type MonthRow,
} from '../engine';
import { useT, type Messages } from '../i18n';
import { numberFormat } from '../i18n/numberFormat';
import { formatMoney, inView, type View } from './money';
import { Headline } from './Headline';
import { RentScale } from './RentScale';
import { HorizonTable } from './HorizonTable';
import { SensitivityTable, SwingsTable } from './SensitivityTable';
import { HowWeCompare } from './HowWeCompare';
import { NATIVE_SWITCH } from './switch';

// The charting library is most of the page's JavaScript, so the charts load as a separate chunk and the
// headline, rent scale and tables appear without waiting for it. All three share that one chunk.
const loadCharts = () => import('./charts');
const NetWorthChart = lazy(() => loadCharts().then((m) => ({ default: m.NetWorthChart })));
const MonthlyCostsChart = lazy(() => loadCharts().then((m) => ({ default: m.MonthlyCostsChart })));
const BreakdownChart = lazy(() => loadCharts().then((m) => ({ default: m.BreakdownChart })));

const TABS = ['netWorth', 'monthly', 'breakdown', 'sensitivity'] as const satisfies readonly (keyof Messages['tabs'])[];
type Tab = (typeof TABS)[number];

interface Props {
  inputs: Inputs;
  /** The rent as typed, ahead of the deferred inputs, so the slider never lags the pointer. */
  liveRent: number;
  view: View;
  onToggleReal: (v: boolean) => void;
  onRentChange: (lei: number) => void;
}

/**
 * The two rates that move the verdict most, with their current values, pointing to where their effect is
 * shown. The deposit rate is left out: it only moves the dotted lines, never the verdict.
 */
function KeyAssumptions({ inputs, onShowSensitivity }: { inputs: Inputs; onShowSensitivity: () => void }) {
  const t = useT();
  const pct = numberFormat(t.numberLocale, { style: 'percent', maximumFractionDigits: 1 });
  const k = t.keyAssumptions;
  // Both are rounded to six decimals when derived from inflation, so a default is an exact match.
  const matchesInflation = Math.abs(inputs.propertyGrowth - inputs.inflation) < 1e-9;
  return (
    <p className="note">
      {k.lead(pct.format(inputs.propertyGrowth), matchesInflation, pct.format(inputs.investReturn))}
      <button type="button" className="link-button" onClick={onShowSensitivity}>{k.link}</button>
      {k.tail}
    </p>
  );
}

/** End-of-horizon figures for both sides, with the switch between today's money and nominal values. */
function EndSummary({ last, view, onToggleReal }: { last: MonthRow; view: View; onToggleReal: (v: boolean) => void }) {
  const t = useT();
  const fmt = (nominal: number) => formatMoney(inView(nominal, last.deflator, view), view.money);
  const hintId = useId();
  const items = [
    { cls: 'buyer', label: t.buyerInvesting, value: fmt(last.buyerNetWorth) },
    { cls: 'renter', label: t.renterInvesting, value: fmt(last.renterNetWorth) },
  ];
  return (
    <div className="end-summary">
      {/* The switch sits with the figures it changes, not floating above them. */}
      <div className="end-summary-head">
        <p className="end-summary-title">{t.atHorizon(t.duration(last.month), view.real, view.money)}</p>
        <div className="summary-switch-block">
          <label className="switch summary-switch">
            <input
              type="checkbox"
              {...NATIVE_SWITCH}
              role="switch"
              checked={view.real}
              aria-describedby={view.real ? hintId : undefined}
              onChange={(e) => onToggleReal(e.target.checked)}
            />
            <span>{t.realValues(view.money)}</span>
          </label>
          {/* Under the label, not beside it: it explains what the switch does to the chart. */}
          {view.real && <p id={hintId} className="summary-hint">{t.realHint}</p>}
        </div>
      </div>
      <dl>
        {items.map((it) => (
          <div key={it.cls} className={`end-item ${it.cls}`}>
            <dt>{it.label}</dt>
            <dd>{it.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

// Memoized so keystrokes in the inputs panel don't re-render charts until the deferred inputs catch up.
export const Results = memo(function Results({ inputs, liveRent, view, onToggleReal, onRentChange }: Props) {
  const t = useT();
  const [tab, setTab] = useState<Tab>('netWorth');
  // Kept here, not in the charts: a chart unmounts when another tab opens, and the lines someone switched
  // off should stay off when they come back.
  const [hiddenSeries, setHiddenSeries] = useState<Partial<Record<Tab, ReadonlySet<string>>>>({});
  const held = useMemo(() => {
    const forTab = (id: Tab): HiddenProps['onHiddenChange'] => (h) => setHiddenSeries((prev) => ({ ...prev, [id]: h }));
    return { netWorth: forTab('netWorth'), monthly: forTab('monthly'), breakdown: forTab('breakdown') };
  }, []);
  const panelId = useId();
  const showSensitivity = () => {
    setTab('sensitivity');
    document.getElementById(`${panelId}-sensitivity`)?.focus();
  };
  const result = useMemo(() => simulate(inputs), [inputs]);
  const last = lastRow(result.rows);
  const chosenYears = last.month / 12;
  // Break-even rents don't depend on the rent, and they are the costliest figures here (a search over
  // many simulations per horizon), so they are keyed on the other inputs only: dragging the rent slider
  // reruns only the cheap gaps.
  const rentFreeKey = JSON.stringify({ ...inputs, rent: 0 });
  const thresholds = useMemo(() => horizonThresholds(JSON.parse(rentFreeKey) as Inputs), [rentFreeKey]);
  const gaps = useMemo(() => horizonGaps(inputs), [inputs]);
  const horizons: HorizonResult[] = useMemo(
    () => gaps.map((g, k) => ({ ...g, eq: thresholds[k].eq })),
    [gaps, thresholds],
  );
  const eq = horizons.find((h) => h.years === chosenYears)!.eq;
  const sens = useMemo(
    () => (tab === 'sensitivity' ? { grid: sensitivity(inputs), swings: assumptionSwings(inputs) } : null),
    [inputs, tab],
  );
  // These views add up or compare nominal sums, so the inflation switch has nothing to adjust there.
  const nominalOnly = tab === 'breakdown' || tab === 'sensitivity';

  return (
    <div className="results">
      <HowWeCompare />
      <Headline
        eq={eq}
        horizonMonths={last.month}
        breakEvenMonth={result.breakEvenMonth}
        buyerEverAhead={result.buyerEverAhead}
        sale={inputs}
        money={view.money}
      />
      <RentScale
        eq={eq}
        rent={liveRent}
        price={inputs.price}
        money={view.money}
        onRentChange={onRentChange}
      />
      <EndSummary last={last} view={view} onToggleReal={onToggleReal} />
      <HorizonTable
        rows={horizons}
        chosenYears={chosenYears}
        real={view.real}
        money={view.money}
      />

      <div className="chart-block">
        <div className="chart-toolbar">
          <div role="tablist" aria-label={t.tabsLabel}>
            {TABS.map((id) => (
              <button
                key={id}
                id={`${panelId}-${id}`}
                role="tab"
                aria-selected={tab === id}
                aria-controls={panelId}
                tabIndex={tab === id ? 0 : -1}
                onClick={() => setTab(id)}
                onKeyDown={(e) => {
                  const i = TABS.indexOf(id);
                  const target =
                    e.key === 'ArrowRight' ? (i + 1) % TABS.length
                    : e.key === 'ArrowLeft' ? (i - 1 + TABS.length) % TABS.length
                    : e.key === 'Home' ? 0
                    : e.key === 'End' ? TABS.length - 1
                    : null;
                  if (target === null) return;
                  e.preventDefault();
                  const next = TABS[target];
                  setTab(next);
                  document.getElementById(`${panelId}-${next}`)?.focus();
                }}
              >
                {t.tabs[id]}
              </button>
            ))}
          </div>
        </div>
        <div role="tabpanel" id={panelId} aria-labelledby={`${panelId}-${tab}`} className="chart-panel">
          {/* The panel keeps its height while the chart chunk loads, so nothing below it jumps. */}
          <Suspense fallback={null}>
            {tab === 'netWorth' && <NetWorthChart result={result} view={view} hidden={hiddenSeries.netWorth} onHiddenChange={held.netWorth} />}
            {tab === 'monthly' && <MonthlyCostsChart result={result} view={view} hidden={hiddenSeries.monthly} onHiddenChange={held.monthly} />}
            {tab === 'breakdown' && <BreakdownChart result={result} view={view} hidden={hiddenSeries.breakdown} onHiddenChange={held.breakdown} />}
          </Suspense>
          {sens && (
            <>
              <SensitivityTable grid={sens.grid} baseGrowth={inputs.propertyGrowth} baseReturn={inputs.investReturn} money={view.money} />
              <SwingsTable swings={sens.swings} base={sens.grid[SENSITIVITY_BASE][SENSITIVITY_BASE]} money={view.money} />
            </>
          )}
          {tab === 'netWorth' && <KeyAssumptions inputs={inputs} onShowSensitivity={showSensitivity} />}
          {nominalOnly && <p className="note">{t.nominalNote}</p>}
        </div>
      </div>
      <p className="note">{t.assumptions}</p>
    </div>
  );
});

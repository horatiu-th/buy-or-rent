import { lazy, memo, Suspense, useId, useMemo, useState } from 'react';
import { assumptionSwings, equivalentRent, horizonComparison, sensitivity, simulate, type Inputs, type Result } from '../engine';
import { t } from '../i18n';
import type { View } from './charts';
import { formatMoney } from './money';
import { Headline } from './Headline';
import { RentScale } from './RentScale';
import { HorizonTable } from './HorizonTable';
import { SensitivityTable, SwingsTable } from './SensitivityTable';

// The charting library is most of the page's JavaScript, so the charts load as a separate chunk and the
// headline, rent scale and tables appear without waiting for it. All three share that one chunk.
const loadCharts = () => import('./charts');
const NetWorthChart = lazy(() => loadCharts().then((m) => ({ default: m.NetWorthChart })));
const MonthlyCostsChart = lazy(() => loadCharts().then((m) => ({ default: m.MonthlyCostsChart })));
const BreakdownChart = lazy(() => loadCharts().then((m) => ({ default: m.BreakdownChart })));

type Tab = keyof typeof t.tabs;

interface Props {
  inputs: Inputs;
  /** The rent as typed, ahead of the deferred inputs, so the slider never lags the pointer. */
  liveRent: number;
  view: View;
  onToggleReal: (v: boolean) => void;
  onRentChange: (lei: number) => void;
}

/** End-of-horizon figures for both sides, with the switch between today's money and nominal values. */
function EndSummary({ result, view, onToggleReal }: { result: Result; view: View; onToggleReal: (v: boolean) => void }) {
  const last = result.rows[result.rows.length - 1];
  const fmt = (nominal: number) =>
    formatMoney(view.real ? nominal / last.deflator : nominal, view.money);
  const items = [
    { cls: 'buyer', label: t.buyer, value: fmt(last.buyerNetWorth) },
    { cls: 'renter', label: t.renterInvesting, value: fmt(last.renterNetWorth) },
  ];
  return (
    <div className="end-summary">
      {/* The switch sits with the figures it changes, not floating above them. */}
      <div className="end-summary-head">
        <p className="end-summary-title">{t.atHorizon(t.duration(last.month), view.real, view.money)}</p>
        <label className="switch summary-switch">
          <input type="checkbox" role="switch" checked={view.real} onChange={(e) => onToggleReal(e.target.checked)} />
          <span>{t.realValues(view.money)}</span>
        </label>
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
  const [tab, setTab] = useState<Tab>('netWorth');
  const panelId = useId();
  const result = useMemo(() => simulate(inputs), [inputs]);
  // The break-even rent doesn't depend on the rent, and it is the costliest figure here (a search
  // over many simulations), so it is recomputed only when something other than the rent changes.
  const rentFreeKey = JSON.stringify({ ...inputs, rent: 0 });
  const eq = useMemo(() => equivalentRent(inputs), [rentFreeKey]);
  const grid = useMemo(() => (tab === 'sensitivity' ? sensitivity(inputs) : null), [inputs, tab]);
  const swings = useMemo(() => (tab === 'sensitivity' ? assumptionSwings(inputs) : null), [inputs, tab]);
  const horizons = useMemo(() => horizonComparison(inputs), [inputs]);
  const tabs = Object.keys(t.tabs) as Tab[];
  // These views add up or compare nominal sums, so the inflation switch has nothing to adjust there.
  const nominalOnly = tab === 'breakdown' || tab === 'sensitivity';

  return (
    <div className="results">
      <Headline
        eq={eq}
        horizonMonths={result.rows[result.rows.length - 1].month}
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
      <EndSummary result={result} view={view} onToggleReal={onToggleReal} />
      <HorizonTable
        rows={horizons}
        chosenYears={result.rows[result.rows.length - 1].month / 12}
        real={view.real}
        money={view.money}
      />

      <div className="chart-block">
        <div className="chart-toolbar">
          <div role="tablist" aria-label={t.tabsLabel}>
            {tabs.map((id) => (
              <button
                key={id}
                id={`${panelId}-${id}`}
                role="tab"
                aria-selected={tab === id}
                aria-controls={panelId}
                tabIndex={tab === id ? 0 : -1}
                onClick={() => setTab(id)}
                onKeyDown={(e) => {
                  const i = tabs.indexOf(id);
                  const target =
                    e.key === 'ArrowRight' ? (i + 1) % tabs.length
                    : e.key === 'ArrowLeft' ? (i - 1 + tabs.length) % tabs.length
                    : e.key === 'Home' ? 0
                    : e.key === 'End' ? tabs.length - 1
                    : null;
                  if (target === null) return;
                  e.preventDefault();
                  const next = tabs[target];
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
            {tab === 'netWorth' && <NetWorthChart result={result} view={view} />}
            {tab === 'monthly' && <MonthlyCostsChart result={result} view={view} />}
            {tab === 'breakdown' && <BreakdownChart result={result} view={view} />}
          </Suspense>
          {tab === 'sensitivity' && grid && (
            <SensitivityTable grid={grid} baseGrowth={inputs.propertyGrowth} baseReturn={inputs.investReturn} money={view.money} />
          )}
          {tab === 'sensitivity' && grid && swings && (
            <SwingsTable swings={swings} base={grid[1][1]} money={view.money} />
          )}
          {nominalOnly && <p className="note">{t.nominalNote}</p>}
        </div>
      </div>
      <p className="note">{t.assumptions}</p>
    </div>
  );
});

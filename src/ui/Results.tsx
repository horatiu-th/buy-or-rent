import { memo, useId, useMemo, useState } from 'react';
import { equivalentRent, sensitivity, simulate, type Inputs, type Result } from '../engine';
import { ro } from '../i18n/ro';
import { BreakdownChart, MonthlyCostsChart, NetWorthChart, type View } from './charts';
import { formatDuration, formatMoney } from './format';
import { Headline } from './Headline';
import { RentScale } from './RentScale';
import { SensitivityTable } from './SensitivityTable';

type Tab = keyof typeof ro.tabs;

interface Props {
  inputs: Inputs;
  /** The rent as typed, ahead of the deferred inputs, so the slider never lags the pointer. */
  liveRent: number;
  view: View;
  onToggleReal: (v: boolean) => void;
  onRentChange: (lei: number) => void;
}

/** End-of-horizon figures; the coloured swatches double as the legend for every chart below. */
function EndSummary({ result, view }: { result: Result; view: View }) {
  const last = result.rows[result.rows.length - 1];
  const conv = (v: number) => (view.real ? v / last.deflator : v);
  const fmt = (v: number) => formatMoney(conv(v), view.currency, view.eurRon);
  const gap = last.buyerNetWorth - last.renterNetWorth;
  return (
    <div className="end-summary">
      <p className="end-summary-title">{ro.atHorizon(formatDuration(last.month))}</p>
      <dl>
        <div className="end-item buyer">
          <dt>{ro.buyer}</dt>
          <dd>{fmt(last.buyerNetWorth)}</dd>
        </div>
        <div className="end-item renter">
          <dt>{ro.renter}</dt>
          <dd>{fmt(last.renterNetWorth)}</dd>
        </div>
        <div className="end-item gap">
          <dt>{ro.difference}</dt>
          <dd>{fmt(Math.abs(gap))}</dd>
        </div>
      </dl>
    </div>
  );
}

// Memoized so keystrokes in the inputs panel don't re-render charts until the deferred inputs catch up.
export const Results = memo(function Results({ inputs, liveRent, view, onToggleReal, onRentChange }: Props) {
  const [tab, setTab] = useState<Tab>('netWorth');
  const panelId = useId();
  const result = useMemo(() => simulate(inputs), [inputs]);
  const eq = useMemo(() => equivalentRent(inputs), [inputs]);
  const grid = useMemo(() => (tab === 'sensitivity' ? sensitivity(inputs) : null), [inputs, tab]);
  const tabs = Object.keys(ro.tabs) as Tab[];

  return (
    <div className="results">
      <Headline
        eq={eq}
        breakEvenMonth={result.breakEvenMonth}
        sale={inputs}
        currency={view.currency}
        eurRon={view.eurRon}
      />
      <RentScale
        eq={eq}
        rent={liveRent}
        price={inputs.price}
        currency={view.currency}
        eurRon={view.eurRon}
        onRentChange={onRentChange}
      />
      <EndSummary result={result} view={view} />

      <div className="chart-block">
        <div className="chart-toolbar">
          <div role="tablist" aria-label={ro.tabsLabel}>
            {tabs.map((t) => (
              <button
                key={t}
                id={`${panelId}-${t}`}
                role="tab"
                aria-selected={tab === t}
                aria-controls={panelId}
                tabIndex={tab === t ? 0 : -1}
                onClick={() => setTab(t)}
                onKeyDown={(e) => {
                  const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
                  if (!step) return;
                  const next = tabs[(tabs.indexOf(t) + step + tabs.length) % tabs.length];
                  setTab(next);
                  document.getElementById(`${panelId}-${next}`)?.focus();
                }}
              >
                {ro.tabs[t]}
              </button>
            ))}
          </div>
          <label className="switch">
            <input type="checkbox" role="switch" checked={view.real} onChange={(e) => onToggleReal(e.target.checked)} />
            <span>{ro.realValues(view.currency)}</span>
          </label>
        </div>
        <div role="tabpanel" id={panelId} aria-labelledby={`${panelId}-${tab}`} className="chart-panel">
          {tab === 'netWorth' && <NetWorthChart result={result} view={view} />}
          {tab === 'monthly' && <MonthlyCostsChart result={result} view={view} />}
          {tab === 'breakdown' && <BreakdownChart result={result} view={view} />}
          {tab === 'sensitivity' && grid && (
            <SensitivityTable grid={grid} baseGrowth={inputs.propertyGrowth} baseReturn={inputs.investReturn} currency={view.currency} eurRon={view.eurRon} />
          )}
          {/* These two views are always nominal, so say so when the rest of the page is in today's money. */}
          {view.real && (tab === 'breakdown' || tab === 'sensitivity') && <p className="note">{ro.nominalNote}</p>}
        </div>
      </div>
      <p className="note">{ro.assumptions}</p>
    </div>
  );
});

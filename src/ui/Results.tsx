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
      <Headline
        eq={eq}
        breakEvenMonth={result.breakEvenMonth}
        sale={inputs}
        currency={view.currency}
        eurRon={view.eurRon}
      />
      <label className="real-toggle">
        <input type="checkbox" checked={view.real} onChange={(e) => onToggleReal(e.target.checked)} /> {ro.realValues(view.currency)}
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
      {/* These two views are always nominal, so say so when the rest of the page is in today's money. */}
      {view.real && (tab === 'breakdown' || tab === 'sensitivity') && <p className="note">{ro.nominalNote}</p>}
      <p className="note">{ro.assumptions}</p>
    </div>
  );
}

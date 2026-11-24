import { useCallback, useDeferredValue, useMemo } from 'react';
import { loadDefaults, resolveCityId, resolveInputs } from './data/defaults';
import type { Inputs } from './engine';
import { ro } from './i18n/ro';
import { CityPicker } from './ui/CityPicker';
import { InputsPanel } from './ui/InputsPanel';
import { Results } from './ui/Results';
import { Segmented } from './ui/Segmented';
import type { Currency } from './ui/format';
import { useScenario } from './state/useScenario';

const data = loadDefaults();
const SOURCES_URL = 'https://github.com/horatiu-th/buy-or-rent/blob/main/data/SOURCES.md';

const CURRENCIES = [
  { value: 'RON', label: 'lei' },
  { value: 'EUR', label: '€' },
] as const;

export default function App() {
  const { scenario, update, setField, resetField, resetAll } = useScenario();
  const { propertyType, sqm, overrides, currency, real } = scenario;
  // One resolved id for the select, the defaults and the sources, so they can never disagree.
  const cityId = resolveCityId(scenario.cityId, data);
  // Narrow deps so toggling currency or real values doesn't rebuild inputs and rerun the simulation.
  const inputs: Inputs = useMemo(
    () => resolveInputs(data, cityId, propertyType, sqm, overrides),
    [cityId, propertyType, sqm, overrides],
  );
  // Keeps typing responsive: results re-render at lower priority than the input that changed.
  const deferredInputs = useDeferredValue(inputs);
  const eurRon = data.values.eurRon.value;
  const view = useMemo(() => ({ currency, eurRon, real }), [currency, eurRon, real]);
  const onToggleReal = useCallback((r: boolean) => update({ real: r }), [update]);
  const onRentChange = useCallback((lei: number) => setField('rent', lei), [setField]);

  return (
    <div className="page">
      <header className="topbar">
        <div className="brand">
          <h1>{ro.title}</h1>
          <p>{ro.subtitle}</p>
        </div>
        <div className="topbar-actions">
          <Segmented<Currency>
            legend={ro.currency}
            hideLegend
            value={currency}
            options={CURRENCIES}
            onChange={(c) => update({ currency: c })}
          />
          <button type="button" className="quiet-button" onClick={resetAll}>{ro.resetAll}</button>
        </div>
      </header>

      <CityPicker data={data} cityId={cityId} propertyType={propertyType} sqm={sqm} onChange={update} />

      <main className="layout">
        <aside className="inputs-column">
          <InputsPanel
            data={data}
            cityId={cityId}
            propertyType={propertyType}
            inputs={inputs}
            overrides={overrides}
            currency={currency}
            setField={setField}
            resetField={resetField}
          />
        </aside>
        <section className="results-column" aria-label={ro.resultsLabel}>
          <Results
            inputs={deferredInputs}
            liveRent={inputs.rent}
            view={view}
            onToggleReal={onToggleReal}
            onRentChange={onRentChange}
          />
        </section>
      </main>

      <footer className="site-footer">
        <p>
          {ro.footer.rate(data.values.eurRon.value.toLocaleString('ro-RO', { maximumFractionDigits: 4 }), data.values.eurRon.asOf)}
          {data.values.eurRon.status === 'stale' && ` (${ro.stale})`}
        </p>
        <p>
          <a href={SOURCES_URL} target="_blank" rel="noreferrer">{ro.footer.sources}</a>
        </p>
      </footer>
    </div>
  );
}

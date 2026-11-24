import { useCallback, useDeferredValue, useMemo } from 'react';
import { loadDefaults, resolveCityId, resolveInputs, sourceFor } from './data/defaults';
import type { Inputs } from './engine';
import { t } from './i18n';
import { CityPicker } from './ui/CityPicker';
import { FIELDS } from './ui/fields';
import { InputField } from './ui/InputField';
import { InputsPanel } from './ui/InputsPanel';
import { Results } from './ui/Results';
import { moneyFor } from './ui/money';
import { useScenario } from './state/useScenario';
import { useTheme } from './ui/theme';
import { TopBar } from './ui/TopBar';

const data = loadDefaults();
const SOURCES_URL = 'https://github.com/horatiu-th/buy-or-rent/blob/main/data/SOURCES.md';

// Horizon and inflation frame the whole comparison, so they sit with the city and size, not with either side.
const SCENARIO_FIELDS = FIELDS.filter((f) => f.topic === 'general');

export default function App() {
  const { scenario, update, setField, resetField, resetAll } = useScenario();
  const { sqm, overrides, currency, real } = scenario;
  const { choice: themeChoice, setChoice: setTheme } = useTheme();
  // One resolved id for the select, the defaults and the sources, so they can never disagree.
  const cityId = resolveCityId(scenario.cityId, data);
  // Narrow deps so toggling currency or real values doesn't rebuild inputs and rerun the simulation.
  const inputs: Inputs = useMemo(
    () => resolveInputs(data, cityId, sqm, overrides),
    [cityId, sqm, overrides],
  );
  // Keeps typing responsive: results re-render at lower priority than the input that changed.
  const deferredInputs = useDeferredValue(inputs);
  const money = useMemo(() => moneyFor(currency, data), [currency]);
  const view = useMemo(() => ({ money, real }), [money, real]);
  const onToggleReal = useCallback((r: boolean) => update({ real: r }), [update]);
  const onRentChange = useCallback((lei: number) => setField('rent', lei), [setField]);

  return (
    <div className="page">
      <TopBar
        currency={currency}
        onCurrencyChange={(c) => update({ currency: c })}
        theme={themeChoice}
        onThemeChange={setTheme}
        onResetAll={resetAll}
      />

      <CityPicker data={data} cityId={cityId} sqm={sqm} onChange={update}>
        {SCENARIO_FIELDS.map((def) => (
          <div key={def.key} className="scenario-item scenario-field">
            <InputField
              def={def}
              value={inputs[def.key]}
              isOverridden={def.key in overrides}
              source={sourceFor(data, cityId, def.key)}
              money={money}
              onChange={(v) => setField(def.key, v as never)}
              onReset={() => resetField(def.key)}
            />
          </div>
        ))}
      </CityPicker>

      <main className="layout">
        <aside className="inputs-column">
          <InputsPanel
            data={data}
            cityId={cityId}
            inputs={inputs}
            overrides={overrides}
            money={money}
            setField={setField}
            resetField={resetField}
          />
        </aside>
        <section className="results-column" aria-label={t.resultsLabel}>
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
          {t.footer.rate(data.values.eurRon.value.toLocaleString(t.numberLocale, { maximumFractionDigits: 4 }), data.values.eurRon.asOf)}
          {data.values.eurRon.status === 'stale' && ` (${t.stale})`}
        </p>
        <p>
          <a href={SOURCES_URL} target="_blank" rel="noreferrer">{t.footer.sources}</a>
        </p>
      </footer>
    </div>
  );
}

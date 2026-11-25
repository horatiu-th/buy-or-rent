import { useCallback, useDeferredValue, useMemo } from 'react';
import { DEFAULTS as data, resolveCityId, resolveInputs, sourceFor } from './data/defaults';
import type { Inputs } from './engine';
import { t } from './i18n';
import { CityPicker } from './ui/CityPicker';
import { FIELDS } from './ui/fields';
import { InputField, type FieldBinding } from './ui/InputField';
import { InputsPanel } from './ui/InputsPanel';
import { Results } from './ui/Results';
import { moneyFor } from './ui/money';
import { useScenario } from './state/useScenario';
import { useTheme } from './ui/theme';
import { TopBar } from './ui/TopBar';
import { ExternalIcon } from './ui/icons';

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
  const fields: FieldBinding = {
    money,
    value: (key) => inputs[key],
    isOverridden: (key) => key in overrides,
    source: (key) => sourceFor(data, cityId, key),
    set: setField,
    reset: resetField,
  };

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
            <InputField def={def} fields={fields} />
          </div>
        ))}
      </CityPicker>

      <main className="layout">
        <aside className="inputs-column">
          <InputsPanel fields={fields} />
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
          <a href={SOURCES_URL} target="_blank" rel="noreferrer" className="external-link">
            {t.footer.sources}
            <ExternalIcon size="0.95em" aria-hidden />
            {/* The icon shows sighted users the link opens elsewhere; this says it to everyone else. */}
            <span className="visually-hidden">{t.footer.newTab}</span>
          </a>
        </p>
      </footer>
    </div>
  );
}

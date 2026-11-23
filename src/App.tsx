import { useDeferredValue, useMemo } from 'react';
import { buildInputs, loadDefaults } from './data/defaults';
import type { Inputs } from './engine';
import { ro } from './i18n/ro';
import { CityPicker } from './ui/CityPicker';
import { InputsPanel } from './ui/InputsPanel';
import { Results } from './ui/Results';
import { useScenario } from './state/useScenario';

const data = loadDefaults();

export default function App() {
  const { scenario, update, setField, resetField, resetAll } = useScenario();
  const inputs: Inputs = useMemo(
    () => ({ ...buildInputs(data, scenario.cityId, scenario.propertyType, scenario.sqm), ...scenario.overrides }),
    [scenario],
  );
  // Keeps typing responsive: results re-render at lower priority than the input that changed.
  const deferredInputs = useDeferredValue(inputs);
  const eurRon = data.values.eurRon.value;

  return (
    <main className="app">
      <header>
        <h1>{ro.title}</h1>
        <p>{ro.subtitle}</p>
        <div className="toolbar">
          <label>
            {ro.currency}{' '}
            <select value={scenario.currency} onChange={(e) => update({ currency: e.target.value as 'RON' | 'EUR' })}>
              <option value="RON">lei</option>
              <option value="EUR">€</option>
            </select>
          </label>
          <button type="button" onClick={resetAll}>{ro.resetAll}</button>
        </div>
      </header>
      <CityPicker data={data} cityId={scenario.cityId} propertyType={scenario.propertyType} sqm={scenario.sqm} onChange={update} />
      <div className="layout">
        <InputsPanel
          data={data}
          cityId={scenario.cityId}
          propertyType={scenario.propertyType}
          inputs={inputs}
          overrides={scenario.overrides}
          currency={scenario.currency}
          setField={setField}
          resetField={resetField}
        />
        <Results
          inputs={deferredInputs}
          view={{ currency: scenario.currency, eurRon, real: scenario.real }}
          onToggleReal={(real) => update({ real })}
        />
      </div>
    </main>
  );
}

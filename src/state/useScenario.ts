import { useCallback, useEffect, useState } from 'react';
import type { Inputs } from '../engine';
import { loadDefaults } from '../data/defaults';
import { applyScenarioPatch, decodeScenario, encodeScenario, DEFAULT_SCENARIO, type Scenario } from './scenario';

const CITY_IDS = Object.keys(loadDefaults().cities);

export function useScenario() {
  const [scenario, setScenario] = useState<Scenario>(() =>
    decodeScenario(new URLSearchParams(window.location.search), CITY_IDS),
  );

  useEffect(() => {
    const qs = encodeScenario(scenario).toString();
    // replaceState, not pushState: every keystroke would otherwise flood the back button.
    window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname);
  }, [scenario]);

  const update = useCallback((patch: Partial<Omit<Scenario, 'overrides'>>) => {
    setScenario((s) => applyScenarioPatch(s, patch));
  }, []);

  const setField = useCallback(<K extends keyof Inputs>(key: K, value: Inputs[K]) => {
    setScenario((s) => ({ ...s, overrides: { ...s.overrides, [key]: value } }));
  }, []);

  const resetField = useCallback((key: keyof Inputs) => {
    setScenario((s) => {
      const { [key]: _removed, ...rest } = s.overrides;
      return { ...s, overrides: rest };
    });
  }, []);

  const resetAll = useCallback(() => setScenario(DEFAULT_SCENARIO), []);

  return { scenario, update, setField, resetField, resetAll };
}

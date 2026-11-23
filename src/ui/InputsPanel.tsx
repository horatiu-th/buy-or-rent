import type { Inputs } from '../engine';
import type { DataFile } from '../data/schema';
import { sourceFor, type PropertyType } from '../data/defaults';
import { ro } from '../i18n/ro';
import { FIELDS, type Group } from './fields';
import { InputField } from './InputField';
import type { Currency } from './format';

interface Props {
  data: DataFile;
  cityId: string;
  propertyType: PropertyType;
  inputs: Inputs;
  overrides: Partial<Inputs>;
  currency: Currency;
  setField: <K extends keyof Inputs>(key: K, value: Inputs[K]) => void;
  resetField: (key: keyof Inputs) => void;
}

const ADVANCED_GROUPS: Group[] = ['acquisition', 'ownership', 'growth', 'investing', 'sale'];

const PRESETS = [
  { years: 5, label: ro.presets.fixed5 },
  { years: 0, label: ro.presets.variable },
] as const;

export function InputsPanel({ data, cityId, propertyType, inputs, overrides, currency, setField, resetField }: Props) {
  const eurRon = data.values.eurRon.value;
  // Presets only change the fixed period; the rate itself stays whatever the user or the defaults say.
  const presets = (
    <div key="presets" className="presets" role="group" aria-label={ro.presets.label}>
      {PRESETS.map((p) => (
        <button key={p.years} type="button" aria-pressed={inputs.fixedYears === p.years} onClick={() => setField('fixedYears', p.years)}>
          {p.label}
        </button>
      ))}
    </div>
  );

  const render = (group: Group) =>
    FIELDS.filter((f) => f.group === group).flatMap((def) => [
      ...(def.key === 'fixedRate' ? [presets] : []),
      <InputField
        key={def.key}
        def={def}
        value={inputs[def.key]}
        isOverridden={def.key in overrides}
        source={sourceFor(data, cityId, propertyType, def.key)}
        currency={currency}
        eurRon={eurRon}
        onChange={(v) => setField(def.key, v as never)}
        onReset={() => resetField(def.key)}
        // With no fixed period the fixed rate never applies; disabled rather than hidden to avoid layout jumps.
        disabled={def.key === 'fixedRate' && inputs.fixedYears === 0}
      />,
    ]);

  return (
    <div className="inputs">
      <section>{render('key')}</section>
      <details>
        <summary>{ro.advanced}</summary>
        {ADVANCED_GROUPS.map((g) => (
          <fieldset key={g}>
            <legend>{ro.groups[g]}</legend>
            {render(g)}
          </fieldset>
        ))}
      </details>
    </div>
  );
}

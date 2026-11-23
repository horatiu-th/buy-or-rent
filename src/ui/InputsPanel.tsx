import type { Inputs } from '../engine';
import type { DataFile } from '../data/schema';
import { sourceFor, type PropertyType } from '../data/defaults';
import { ro } from '../i18n/ro';
import { FIELDS, type FieldDef, type Group } from './fields';
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

// The key inputs read better as a few short sections than as one long list.
const KEY_SECTIONS: { title: string; keys: (keyof Inputs)[] }[] = [
  { title: ro.sections.home, keys: ['price', 'downPaymentPct'] },
  { title: ro.sections.rent, keys: ['rent'] },
  { title: ro.sections.loan, keys: ['fixedRate', 'fixedYears', 'ircc', 'variableMargin', 'loanTermYears'] },
  { title: ro.sections.horizon, keys: ['horizonYears'] },
];

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

  const renderDefs = (defs: FieldDef[]) =>
    defs.flatMap((def) => [
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

  const byKey = new Map(FIELDS.map((f) => [f.key, f]));

  return (
    <div className="inputs">
      {KEY_SECTIONS.map((section) => (
        <section key={section.title} className="input-section">
          <h3>{section.title}</h3>
          {renderDefs(section.keys.map((k) => byKey.get(k)!))}
        </section>
      ))}
      <details className="advanced">
        <summary>{ro.advanced}</summary>
        {ADVANCED_GROUPS.map((g) => (
          <section key={g} className="input-section">
            <h3>{ro.groups[g]}</h3>
            {renderDefs(FIELDS.filter((f) => f.group === g))}
          </section>
        ))}
      </details>
    </div>
  );
}

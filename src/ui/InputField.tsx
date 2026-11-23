import { useEffect, useId, useState } from 'react';
import type { SourcedValue } from '../data/schema';
import { ro } from '../i18n/ro';
import type { FieldDef } from './fields';
import type { Currency } from './format';

interface Props {
  def: FieldDef;
  value: number | boolean;
  isOverridden: boolean;
  source?: SourcedValue;
  currency: Currency;
  eurRon: number;
  onChange: (v: number | boolean) => void;
  onReset: () => void;
}

function toDisplay(def: FieldDef, v: number, currency: Currency, eurRon: number) {
  if (def.unit === 'pct') return +(v * 100).toFixed(4);
  if (def.unit === 'money' && currency === 'EUR') return Math.round(v / eurRon);
  return v;
}

function fromDisplay(def: FieldDef, v: number, currency: Currency, eurRon: number) {
  if (def.unit === 'pct') return v / 100;
  if (def.unit === 'money' && currency === 'EUR') return v * eurRon;
  return v;
}

const suffix = (def: FieldDef, currency: Currency) =>
  ({ pct: '%', money: currency === 'EUR' ? '€' : 'lei', years: 'ani', months: 'luni', bool: '' })[def.unit];

export function InputField({ def, value, isOverridden, source, currency, eurRon, onChange, onReset }: Props) {
  const id = useId();
  const text = ro.fields[def.key];
  const [draft, setDraft] = useState('');
  const [focused, setFocused] = useState(false);

  // Keep the draft as a string while typing so "0." or "" aren't clobbered mid-edit.
  useEffect(() => {
    if (!focused && typeof value === 'number') setDraft(String(toDisplay(def, value, currency, eurRon)));
  }, [value, focused, def, currency, eurRon]);

  const isPlaceholder = source?.status === 'manual' && source.source.startsWith('Placeholder');
  const sourceTag = source && !isOverridden && (
    <small className={`source source-${source.status}`}>
      {ro.source}: {source.sourceUrl ? <a href={source.sourceUrl} target="_blank" rel="noreferrer">{source.source}</a> : source.source}, {source.asOf}
      {source.status === 'stale' && ` · ${ro.stale}`}
      {isPlaceholder && ` · ${ro.placeholder}`}
    </small>
  );

  const resetButton = isOverridden && (
    <button type="button" className="reset" onClick={onReset} title={ro.reset} aria-label={`${ro.reset}: ${text.label}`}>↺</button>
  );

  if (def.unit === 'bool') {
    return (
      <div className="field">
        <label htmlFor={id}>
          <input id={id} type="checkbox" checked={value as boolean} onChange={(e) => onChange(e.target.checked)} /> {text.label}
        </label>
        <span className="help" title={text.help}>ⓘ</span>
        {resetButton}
      </div>
    );
  }

  const min = def.min !== undefined ? toDisplay(def, def.min, currency, eurRon) : undefined;
  const max = def.max !== undefined ? toDisplay(def, def.max, currency, eurRon) : undefined;
  const step = def.step !== undefined ? toDisplay(def, def.step, currency, eurRon) : undefined;

  return (
    <div className="field">
      <label htmlFor={id}>{text.label}</label>
      <span className="help" title={text.help}>ⓘ</span>
      <div className="input-row">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          value={draft}
          min={min}
          max={max}
          step={step}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(e) => {
            setDraft(e.target.value);
            const n = Number(e.target.value);
            if (e.target.value !== '' && Number.isFinite(n)) onChange(fromDisplay(def, n, currency, eurRon));
          }}
        />
        <span className="suffix">{suffix(def, currency)}</span>
        {resetButton}
      </div>
      {sourceTag}
    </div>
  );
}

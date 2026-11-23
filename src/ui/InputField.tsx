import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
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
  disabled?: boolean;
}

function toDisplay(def: FieldDef, v: number, currency: Currency, eurRon: number) {
  if (def.unit === 'pct') return +(v * 100).toFixed(4);
  if (def.unit === 'money' && currency === 'EUR') return Math.round(v / eurRon);
  return v;
}

// Rounding keeps binary float noise (1.1 / 100 = 0.011000000000000001) out of the state and the URL.
function fromDisplay(def: FieldDef, v: number, currency: Currency, eurRon: number) {
  if (def.unit === 'pct') return +(v / 100).toFixed(6);
  if (def.unit === 'money' && currency === 'EUR') return Math.round(v * eurRon);
  return v;
}

const suffix = (def: FieldDef, currency: Currency) =>
  ({ pct: '%', money: currency === 'EUR' ? '€' : 'lei', years: 'ani', months: 'luni', bool: '' })[def.unit];

export function InputField({ def, value, isOverridden, source, currency, eurRon, onChange, onReset, disabled }: Props) {
  const id = useId();
  const helpId = `${id}-help`;
  const sourceId = `${id}-source`;
  const text = ro.fields[def.key];
  const [draft, setDraft] = useState('');
  const [focused, setFocused] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const anchorRef = useRef<HTMLSpanElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  // A popover should get out of the way the moment attention moves elsewhere.
  useEffect(() => {
    if (!showHelp) return;
    const onPointer = (e: PointerEvent) => {
      if (!anchorRef.current?.contains(e.target as Node)) setShowHelp(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setShowHelp(false);
      toggleRef.current?.focus();
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [showHelp]);

  // Keep the draft as a string while typing so "0." or "" aren't clobbered mid-edit.
  useEffect(() => {
    if (!focused && typeof value === 'number') setDraft(String(toDisplay(def, value, currency, eurRon)));
  }, [value, focused, def, currency, eurRon]);

  const sourceTag = source && !isOverridden && (
    <small id={sourceId} className={`source source-${source.status}`}>
      {ro.source}: {source.sourceUrl ? <a href={source.sourceUrl} target="_blank" rel="noreferrer">{source.source}</a> : source.source}, {source.asOf}
      {source.status === 'stale' && ` · ${ro.stale}`}
    </small>
  );

  const resetButton = isOverridden && (
    <button type="button" className="reset" onClick={onReset} title={ro.reset} aria-label={`${ro.reset}: ${text.label}`}>↺</button>
  );

  const describedBy = [showHelp && helpId, sourceTag && sourceId].filter(Boolean).join(' ') || undefined;

  const popoverId = `${id}-popover`;
  const helpToggle = (
    <span className="help-anchor" ref={anchorRef}>
      <button
        ref={toggleRef}
        type="button"
        className="help"
        aria-expanded={showHelp}
        aria-controls={popoverId}
        aria-label={`${ro.help}: ${text.label}`}
        onClick={() => setShowHelp((v) => !v)}
      >i</button>
      {/* Kept in the DOM while closed so the input's description can still point at the source. */}
      <span id={popoverId} role="note" className="help-popover" hidden={!showHelp}>
        <span id={helpId} className="help-text">{text.help}</span>
        {sourceTag}
      </span>
    </span>
  );

  const head = (label: ReactNode) => (
    <div className="field-head">
      {label}
      {helpToggle}
      {resetButton}
    </div>
  );

  if (def.unit === 'bool') {
    return (
      <div className={`field field-bool${isOverridden ? ' is-edited' : ''}`}>
        {head(
          <label htmlFor={id} className="switch">
            <input id={id} type="checkbox" role="switch" aria-describedby={describedBy} checked={value as boolean} onChange={(e) => onChange(e.target.checked)} />
            <span>{text.label}</span>
          </label>,
        )}
      </div>
    );
  }

  const min = def.min !== undefined ? toDisplay(def, def.min, currency, eurRon) : undefined;
  const max = def.max !== undefined ? toDisplay(def, def.max, currency, eurRon) : undefined;
  // A lei step converted to euro gives odd increments (e.g. 196 €), so euro money inputs step freely.
  const step = def.unit === 'money' && currency === 'EUR' ? 'any'
    : def.step !== undefined ? toDisplay(def, def.step, currency, eurRon) : undefined;

  return (
    <div className={`field${isOverridden ? ' is-edited' : ''}${disabled ? ' is-disabled' : ''}`}>
      {head(<label htmlFor={id}>{text.label}</label>)}
      <div className="number-box">
        <input
          id={id}
          aria-describedby={describedBy}
          disabled={disabled}
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
        <span className="suffix" aria-hidden="true">{suffix(def, currency)}</span>
      </div>
    </div>
  );
}

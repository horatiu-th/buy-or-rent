import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import type { SourcedValue } from '../data/schema';
import { ro } from '../i18n/ro';
import { isWholeField, normalizeField, type FieldDef } from './fields';
import { unitWord, type Currency } from './format';
import { NumberInput } from './NumberInput';

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

// ISO dates compare correctly as strings.
const today = () => new Date().toISOString().slice(0, 10);

/** The nearest 1, 2 or 5 × 10ⁿ, so a lei step converted to euro still moves in round amounts. */
function roundStep(x: number) {
  const pow = 10 ** Math.floor(Math.log10(x));
  const m = x / pow;
  return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * pow;
}

const suffix = (def: FieldDef, currency: Currency, n: number) =>
  ({
    pct: '%',
    money: currency === 'EUR' ? '€' : 'lei',
    years: unitWord(n, 'an', 'ani'),
    months: unitWord(n, 'lună', 'luni'),
    bool: '',
  })[def.unit];

export function InputField({ def, value, isOverridden, source, currency, eurRon, onChange, onReset, disabled }: Props) {
  const id = useId();
  const helpId = `${id}-help`;
  const sourceId = `${id}-source`;
  const text = ro.fields[def.key];
  const [showHelp, setShowHelp] = useState(false);
  const anchorRef = useRef<HTMLSpanElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  // A popover should get out of the way the moment attention moves elsewhere: a click outside,
  // Escape, or focus leaving it (handled on the anchor below).
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

  const sourceTag = source && !isOverridden && (
    <small id={sourceId} className={`source source-${source.status}`}>
      {ro.source}: {source.sourceUrl ? <a href={source.sourceUrl} target="_blank" rel="noreferrer">{source.source}</a> : source.source}, {source.asOf}
      {source.status === 'stale' && ` · ${ro.stale}`}
      {source.validUntil !== undefined && source.validUntil < today() && ` · ${ro.toCheck}`}
    </small>
  );

  const resetButton = isOverridden && (
    <button type="button" className="reset" onClick={onReset} title={ro.reset} aria-label={`${ro.reset}: ${text.label}`}>↺</button>
  );

  const describedBy = [showHelp && helpId, sourceTag && sourceId].filter(Boolean).join(' ') || undefined;

  const popoverId = `${id}-popover`;
  const helpToggle = (
    <span
      className="help-anchor"
      ref={anchorRef}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setShowHelp(false);
      }}
    >
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

  // A lei step converted to euro gives odd increments (e.g. 196 €), so euro amounts step by a round number.
  const step = def.step === undefined ? undefined
    : def.unit === 'money' && currency === 'EUR' ? roundStep(def.step / eurRon)
    : toDisplay(def, def.step, currency, eurRon);

  return (
    <div className={`field${isOverridden ? ' is-edited' : ''}${disabled ? ' is-disabled' : ''}`}>
      {head(<label htmlFor={id}>{text.label}</label>)}
      <div className="number-box">
        <NumberInput
          id={id}
          aria-describedby={describedBy}
          disabled={disabled}
          kind={def.unit === 'money' ? 'amount' : 'decimal'}
          whole={isWholeField(def)}
          step={step}
          value={toDisplay(def, value as number, currency, eurRon)}
          onValue={(n, phase) => {
            const v = fromDisplay(def, n, currency, eurRon);
            if (phase === 'typing' && def.min !== undefined && v < def.min) return;
            onChange(normalizeField(def, v));
          }}
        />
        <span className="suffix" aria-hidden="true">{suffix(def, currency, value as number)}</span>
      </div>
    </div>
  );
}

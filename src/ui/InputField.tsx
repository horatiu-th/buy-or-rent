import { useCallback, useId, useRef, useState, type ReactNode } from 'react';
import type { SourcedValue } from '../data/schema';
import { t } from '../i18n';
import { isWholeField, normalizeField, type FieldDef } from './fields';
import { toUnits, fromUnits, type Money } from './money';
import { NumberInput } from './NumberInput';
import { useDismiss } from './useDismiss';

interface Props {
  def: FieldDef;
  value: number | boolean;
  isOverridden: boolean;
  source?: SourcedValue;
  money: Money;
  onChange: (v: number | boolean) => void;
  onReset: () => void;
  disabled?: boolean;
}

/** Money inputs show whole units of the chosen currency; converted amounts are rounded so they read cleanly. */
function toDisplay(def: FieldDef, v: number, money: Money) {
  if (def.unit === 'pct') return +(v * 100).toFixed(4);
  if (def.unit === 'money' && !money.isBase) return Math.round(toUnits(v, money));
  return v;
}

// Rounding keeps binary float noise (1.1 / 100 = 0.011000000000000001) out of the state and the URL.
function fromDisplay(def: FieldDef, v: number, money: Money) {
  if (def.unit === 'pct') return +(v / 100).toFixed(6);
  if (def.unit === 'money' && !money.isBase) return Math.round(fromUnits(v, money));
  return v;
}

// ISO dates compare correctly as strings.
const today = () => new Date().toISOString().slice(0, 10);

/** The nearest 1, 2 or 5 × 10ⁿ, so a lei step converted to another currency still moves in round amounts. */
function roundStep(x: number) {
  const pow = 10 ** Math.floor(Math.log10(x));
  const m = x / pow;
  return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * pow;
}

const suffix = (def: FieldDef, money: Money, n: number) =>
  ({
    pct: '%',
    money: money.symbol,
    years: t.unitWord(n, 'year'),
    months: t.unitWord(n, 'month'),
    bool: '',
  })[def.unit];

export function InputField({ def, value, isOverridden, source, money, onChange, onReset, disabled }: Props) {
  const id = useId();
  const helpId = `${id}-help`;
  const sourceId = `${id}-source`;
  const text = t.fields[def.key];
  const [showHelp, setShowHelp] = useState(false);
  const anchorRef = useRef<HTMLSpanElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  const closeHelp = useCallback(() => setShowHelp(false), []);
  useDismiss(showHelp, anchorRef, closeHelp, toggleRef);

  const sourceTag = source && !isOverridden && (
    <small id={sourceId} className={`source source-${source.status}`}>
      {t.source}: {source.sourceUrl ? <a href={source.sourceUrl} target="_blank" rel="noreferrer">{source.source}</a> : source.source}, {source.asOf}
      {source.status === 'stale' && ` · ${t.stale}`}
      {source.validUntil !== undefined && source.validUntil < today() && ` · ${t.toCheck}`}
    </small>
  );

  const resetButton = isOverridden && (
    <button type="button" className="reset" onClick={onReset} title={t.reset} aria-label={`${t.reset}: ${text.label}`}>↺</button>
  );

  const unitId = `${id}-unit`;
  const describedBy = [def.unit !== 'bool' && unitId, showHelp && helpId, sourceTag && sourceId].filter(Boolean).join(' ') || undefined;

  const popoverId = `${id}-popover`;
  const helpToggle = (
    <span className="help-anchor" ref={anchorRef}>
      <button
        ref={toggleRef}
        type="button"
        className="help"
        aria-expanded={showHelp}
        aria-controls={popoverId}
        aria-label={`${t.help}: ${text.label}`}
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

  // A lei step converted to another currency gives odd increments (e.g. 196 €), so it is rounded to a tidy step.
  const step = def.step === undefined ? undefined
    : def.unit === 'money' && !money.isBase ? roundStep(toUnits(def.step, money))
    : toDisplay(def, def.step, money);

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
          value={toDisplay(def, value as number, money)}
          onValue={(n, phase) => {
            const v = fromDisplay(def, n, money);
            if (phase === 'typing' && def.min !== undefined && v < def.min) return;
            onChange(normalizeField(def, v));
          }}
        />
        <span id={unitId} className="suffix">{suffix(def, money, value as number)}</span>
      </div>
    </div>
  );
}

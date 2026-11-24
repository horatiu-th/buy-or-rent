import { useCallback, useId, useRef, useState, type ReactNode } from 'react';
import { todayIso } from '../data/dates';
import type { SourcedValue } from '../data/schema';
import type { Inputs } from '../engine';
import { t } from '../i18n';
import { isWholeField, normalizeField, type FieldDef, type NumberFieldDef } from './fields';
import { toUnits, fromUnits, type Money } from './money';
import { NumberInput } from './NumberInput';
import { useDismiss } from './useDismiss';

/**
 * Everything a field needs from the scenario, looked up by its key. The generic accessors keep a
 * field's value type tied to its key, so a switch only ever reads and writes a boolean.
 */
export interface FieldBinding {
  money: Money;
  value<K extends keyof Inputs>(key: K): Inputs[K];
  isOverridden(key: keyof Inputs): boolean;
  source(key: keyof Inputs): SourcedValue | undefined;
  set<K extends keyof Inputs>(key: K, value: Inputs[K]): void;
  reset(key: keyof Inputs): void;
}

interface Props {
  def: FieldDef;
  fields: FieldBinding;
  disabled?: boolean;
}

/** Money inputs show whole units of the chosen currency; converted amounts are rounded so they read cleanly. */
function toDisplay(def: NumberFieldDef, v: number, money: Money) {
  if (def.unit === 'pct') return +(v * 100).toFixed(4);
  if (def.unit === 'money' && !money.isBase) return Math.round(toUnits(v, money));
  return v;
}

// Rounding keeps binary float noise (1.1 / 100 = 0.011000000000000001) out of the state and the URL.
function fromDisplay(def: NumberFieldDef, v: number, money: Money) {
  if (def.unit === 'pct') return +(v / 100).toFixed(6);
  if (def.unit === 'money' && !money.isBase) return Math.round(fromUnits(v, money));
  return v;
}

/** The nearest 1, 2 or 5 × 10ⁿ, so a lei step converted to another currency still moves in round amounts. */
function roundStep(x: number) {
  const pow = 10 ** Math.floor(Math.log10(x));
  const m = x / pow;
  return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * pow;
}

/** A lei step converted to another currency gives odd increments (e.g. 196 €), so it is rounded to a tidy step. */
function displayStep(def: NumberFieldDef, money: Money) {
  if (def.step === undefined) return undefined;
  if (def.unit === 'money' && !money.isBase) return roundStep(toUnits(def.step, money));
  return toDisplay(def, def.step, money);
}

function suffix(def: NumberFieldDef, money: Money, n: number) {
  switch (def.unit) {
    case 'pct': return '%';
    case 'money': return money.symbol;
    case 'years': return t.unitWord(n, 'year');
    case 'months': return t.unitWord(n, 'month');
  }
}

export function InputField({ def, fields, disabled }: Props) {
  const id = useId();
  const helpId = `${id}-help`;
  const sourceId = `${id}-source`;
  const unitId = `${id}-unit`;
  const popoverId = `${id}-popover`;
  const text = t.fields[def.key];
  const { money } = fields;
  const isOverridden = fields.isOverridden(def.key);
  const source = fields.source(def.key);
  const showSource = source !== undefined && !isOverridden;
  const [showHelp, setShowHelp] = useState(false);
  const anchorRef = useRef<HTMLSpanElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  const closeHelp = useCallback(() => setShowHelp(false), []);
  useDismiss(showHelp, anchorRef, closeHelp, toggleRef);

  const describedBy = [def.unit !== 'bool' && unitId, showHelp && helpId, showSource && sourceId].filter(Boolean).join(' ') || undefined;

  const head = (label: ReactNode) => (
    <div className="field-head">
      {label}
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
          {showSource && (
            <small id={sourceId} className={`source source-${source.status}`}>
              {t.source}: {source.sourceUrl ? <a href={source.sourceUrl} target="_blank" rel="noreferrer">{source.source}</a> : source.source}, {source.asOf}
              {source.status === 'stale' && ` · ${t.stale}`}
              {source.validUntil !== undefined && source.validUntil < todayIso() && ` · ${t.toCheck}`}
            </small>
          )}
        </span>
      </span>
      {isOverridden && (
        <button type="button" className="reset" onClick={() => fields.reset(def.key)} title={t.reset} aria-label={`${t.reset}: ${text.label}`}>↺</button>
      )}
    </div>
  );

  if (def.unit === 'bool') {
    return (
      <div className={`field field-bool${isOverridden ? ' is-edited' : ''}`}>
        {head(
          <label htmlFor={id} className="switch">
            <input
              id={id}
              type="checkbox"
              role="switch"
              aria-describedby={describedBy}
              checked={fields.value(def.key)}
              onChange={(e) => fields.set(def.key, e.target.checked)}
            />
            <span>{text.label}</span>
          </label>,
        )}
      </div>
    );
  }

  const value = fields.value(def.key);
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
          step={displayStep(def, money)}
          min={def.min === undefined ? undefined : toDisplay(def, def.min, money)}
          value={toDisplay(def, value, money)}
          onValue={(n) => fields.set(def.key, normalizeField(def, fromDisplay(def, n, money)))}
        />
        <span id={unitId} className="suffix">{suffix(def, money, value)}</span>
      </div>
    </div>
  );
}

import { useState, type InputHTMLAttributes } from 'react';
import { useT } from '../i18n';
import { formatInputNumber, parseNumber } from './format';

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type' | 'step' | 'min'> {
  /** The current value, in the units shown in the box. */
  value: number;
  /** 'amount' reads the language's thousands separator and groups the value while it isn't being edited. */
  kind: 'amount' | 'decimal';
  /** Whole numbers only, so phones can show a digits-only keypad. */
  whole?: boolean;
  /** Arrow-key increment; no stepping without it. */
  step?: number;
  /**
   * Numbers below this are held back while typing, since they may be the start of a valid number
   * (the "7" of "70"), and reported only when the field is left. The caller still clamps.
   */
  min?: number;
  /** Called with each parseable number while typing, then once more when the field is left. */
  onValue: (n: number) => void;
}

/**
 * A text box for numbers. A plain text input rather than type="number": some browsers drop a value
 * typed with a decimal comma, and Romanian users type one; the box reads either mark.
 */
export function NumberInput({ value, kind, whole, step, min, onValue, onFocus, onBlur, onKeyDown, ...rest }: Props) {
  // The typed text while the user is editing; null means "show the value", so an outside change
  // (a reset, the rent slider) shows up immediately and a half-typed "0," isn't reformatted mid-edit.
  const [draft, setDraft] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const { numberLocale } = useT();
  const parse = (text: string) => parseNumber(text, kind, numberLocale);
  const shown = draft ?? formatInputNumber(value, kind === 'amount' && !focused, numberLocale);

  return (
    <input
      {...rest}
      type="text"
      inputMode={whole ? 'numeric' : 'decimal'}
      autoComplete="off"
      value={shown}
      onFocus={(e) => {
        setFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        if (draft !== null) {
          const n = parse(draft);
          if (n !== null) onValue(n);
          setDraft(null);
        }
        onBlur?.(e);
      }}
      onChange={(e) => {
        setDraft(e.target.value);
        const n = parse(e.target.value);
        if (n !== null && (min === undefined || n >= min)) onValue(n);
      }}
      onKeyDown={(e) => {
        onKeyDown?.(e);
        if (!step || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
        e.preventDefault();
        const base = (draft !== null ? parse(draft) : null) ?? value;
        onValue(base + (e.key === 'ArrowUp' ? step : -step));
        setDraft(null);
      }}
    />
  );
}

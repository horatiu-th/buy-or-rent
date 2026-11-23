import { useState, type InputHTMLAttributes } from 'react';
import { formatInputNumber, parseNumber } from './format';

type Phase = 'typing' | 'commit';

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type' | 'step'> {
  /** The current value, in the units shown in the box. */
  value: number;
  /** 'amount' reads "." as a thousands separator and groups the value while it isn't being edited. */
  kind: 'amount' | 'decimal';
  /** Whole numbers only, so phones can show a digits-only keypad. */
  whole?: boolean;
  /** Arrow-key increment; no stepping without it. */
  step?: number;
  /**
   * Called with each parseable number while typing, then once more when the field is left.
   * The caller clamps; it can skip 'typing' values below the minimum, since those may be the start
   * of a valid number (the "7" of "70"), and act on them at 'commit'.
   */
  onValue: (n: number, phase: Phase) => void;
}

/**
 * A text box for numbers. A plain text input rather than type="number": some browsers drop a value
 * typed with a decimal comma, and Romanian users type one.
 */
export function NumberInput({ value, kind, whole, step, onValue, onFocus, onBlur, onKeyDown, ...rest }: Props) {
  // The typed text while the user is editing; null means "show the value", so an outside change
  // (a reset, the rent slider) shows up immediately and a half-typed "0," isn't reformatted mid-edit.
  const [draft, setDraft] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const shown = draft ?? formatInputNumber(value, kind === 'amount' && !focused);

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
          const n = parseNumber(draft, kind);
          if (n !== null) onValue(n, 'commit');
          setDraft(null);
        }
        onBlur?.(e);
      }}
      onChange={(e) => {
        setDraft(e.target.value);
        const n = parseNumber(e.target.value, kind);
        if (n !== null) onValue(n, 'typing');
      }}
      onKeyDown={(e) => {
        onKeyDown?.(e);
        if (!step || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
        e.preventDefault();
        const base = (draft !== null ? parseNumber(draft, kind) : null) ?? value;
        onValue(base + (e.key === 'ArrowUp' ? step : -step), 'commit');
        setDraft(null);
      }}
    />
  );
}

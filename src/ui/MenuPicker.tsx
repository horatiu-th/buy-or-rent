import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useDismiss } from './useDismiss';

export interface MenuOption<T extends string> {
  value: T;
  label: string;
  /** The label's language, when it differs from the page's, so screen readers pronounce it right. */
  lang?: string;
  /** Drawn before the label, e.g. a theme's colour swatch. */
  preview?: ReactNode;
}

interface Props<T extends string> {
  /** Names the list of options. */
  legend: string;
  value: T;
  options: readonly MenuOption<T>[];
  onChange: (value: T) => void;
  /** What the button shows. */
  button: ReactNode;
  buttonClassName: string;
  /** The button's accessible name, when its content alone doesn't say what it opens. */
  buttonLabel?: string;
  buttonTitle?: string;
}

/**
 * A button that opens a short list of choices. The list is a native radio group, so arrow keys move
 * through it and apply each choice as they land on it, which previews it in place. Picking with the
 * pointer, Enter or Space confirms the choice and closes the list.
 */
export function MenuPicker<T extends string>({
  legend, value, options, onChange, button, buttonClassName, buttonLabel, buttonTitle,
}: Props<T>) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLFieldSetElement>(null);
  const panelId = useId();
  const name = useId();

  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, rootRef, close, buttonRef);
  const confirm = () => {
    close();
    buttonRef.current?.focus();
  };

  useEffect(() => {
    // Focus starts on the current choice, so arrow keys reach the neighbours straight away.
    if (open) panelRef.current?.querySelector<HTMLInputElement>('input:checked')?.focus();
  }, [open]);

  return (
    <div className="picker" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className={buttonClassName}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={buttonLabel}
        title={buttonTitle}
        onClick={() => setOpen((o) => !o)}
      >
        {button}
      </button>
      <fieldset
        ref={panelRef}
        id={panelId}
        className="picker-menu"
        hidden={!open}
        // Enter or Space confirms the choice the arrow keys landed on. Only inside the list: on the
        // button, both already toggle the menu through its click. Focus always sits on the checked
        // radio, so Space has nothing left to select.
        onKeyDown={(e) => {
          if (e.key !== 'Enter' && e.key !== ' ') return;
          e.preventDefault();
          confirm();
        }}
      >
        <legend className="visually-hidden">{legend}</legend>
        {options.map((o) => (
          <label key={o.value} className="picker-option">
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              // Browsers also fire click when arrow keys move the selection, with detail 0; only a real
              // pointer click (detail ≥ 1) confirms, so arrowing through the list keeps it open.
              onClick={(e) => {
                if (e.detail > 0) confirm();
              }}
            />
            {o.preview}
            <span lang={o.lang}>{o.label}</span>
          </label>
        ))}
      </fieldset>
    </div>
  );
}

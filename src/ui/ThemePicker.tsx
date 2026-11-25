import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { t } from '../i18n';
import { THEMES, type ThemeChoice } from './theme';
import { useDismiss } from './useDismiss';
import { ThemeIcon } from './icons';

interface Props {
  choice: ThemeChoice;
  onChange: (choice: ThemeChoice) => void;
}

const CHOICES: ThemeChoice[] = ['system', ...THEMES];

/**
 * A preview of a theme: its page colour with its buying and renting colours. Each swatch carries
 * its own data-theme, so the theme's CSS variables apply to it locally whatever the page theme is.
 */
function Swatch({ choice }: { choice: ThemeChoice }) {
  if (choice === 'system') {
    return (
      <span className="theme-swatch is-split" aria-hidden="true">
        <span data-theme="light" />
        <span data-theme="dark" />
      </span>
    );
  }
  return (
    <span className="theme-swatch" data-theme={choice} aria-hidden="true">
      <i className="buy" />
      <i className="rent" />
    </span>
  );
}

/** A button that opens the list of themes. The list is a native radio group, so arrow keys move through it. */
export function ThemePicker({ choice, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLFieldSetElement>(null);
  const panelId = useId();
  const name = useId();

  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, rootRef, close, buttonRef);

  useEffect(() => {
    // Focus starts on the current theme, so arrow keys preview the neighbours straight away.
    if (open) panelRef.current?.querySelector<HTMLInputElement>('input:checked')?.focus();
  }, [open]);

  return (
    <div className="theme-picker" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className="icon-button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={`${t.themes.label}: ${t.themes[choice]}`}
        title={t.themes.label}
        onClick={() => setOpen((o) => !o)}
      >
        <ThemeIcon size={18} aria-hidden />
      </button>
      <fieldset
        ref={panelRef}
        id={panelId}
        className="theme-menu"
        hidden={!open}
        // Enter confirms the theme the arrow keys landed on. Only inside the list: on the button,
        // Enter already toggles the menu through its click.
        onKeyDown={(e) => {
          if (e.key !== 'Enter') return;
          e.preventDefault();
          close();
          buttonRef.current?.focus();
        }}
      >
        <legend className="visually-hidden">{t.themes.label}</legend>
        {CHOICES.map((c) => (
          <label key={c} className="theme-option">
            <input type="radio" name={name} value={c} checked={choice === c} onChange={() => onChange(c)} />
            <Swatch choice={c} />
            <span>{t.themes[c]}</span>
          </label>
        ))}
      </fieldset>
    </div>
  );
}

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { t } from '../i18n';
import { THEMES, type ThemeChoice } from './theme';
import { useDismiss } from './useDismiss';

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

const PaletteIcon = () => (
  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3a9 9 0 0 0 0 18c1.1 0 1.8-.8 1.8-1.7 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-1 .8-1.7 1.8-1.7H16a5 5 0 0 0 5-5C21 6.6 17 3 12 3Z" />
    <circle cx="7.5" cy="11.5" r="1" fill="currentColor" />
    <circle cx="10.5" cy="7.5" r="1" fill="currentColor" />
    <circle cx="15.5" cy="8" r="1" fill="currentColor" />
  </svg>
);

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
        <PaletteIcon />
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

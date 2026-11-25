import { useT } from '../i18n';
import { MenuPicker } from './MenuPicker';
import { THEMES, type ThemeChoice } from './theme';
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

/** A palette button that opens the list of themes, each with a preview swatch. */
export function ThemePicker({ choice, onChange }: Props) {
  const t = useT();
  return (
    <MenuPicker
      legend={t.themes.label}
      value={choice}
      options={CHOICES.map((c) => ({ value: c, label: t.themes[c], preview: <Swatch choice={c} /> }))}
      onChange={onChange}
      button={<ThemeIcon size={18} aria-hidden />}
      buttonClassName="icon-button"
      buttonLabel={`${t.themes.label}: ${t.themes[choice]}`}
      buttonTitle={t.themes.label}
    />
  );
}

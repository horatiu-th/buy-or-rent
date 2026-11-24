import { t } from '../i18n';
import { CURRENCIES, CURRENCY_IDS, type Currency } from './money';
import { Segmented } from './Segmented';
import type { ThemeChoice } from './theme';
import { ThemePicker } from './ThemePicker';

interface Props {
  currency: Currency;
  onCurrencyChange: (currency: Currency) => void;
  theme: ThemeChoice;
  onThemeChange: (theme: ThemeChoice) => void;
  onResetAll: () => void;
}

const CURRENCY_OPTIONS = CURRENCY_IDS.map((id) => ({ value: id, label: CURRENCIES[id].symbol }));

const ResetIcon = () => (
  <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
    <path d="M3 3v5h5" />
  </svg>
);

/** The page title and the page-wide controls: currency, theme and reset. */
export function TopBar({ currency, onCurrencyChange, theme, onThemeChange, onResetAll }: Props) {
  return (
    <header className="topbar">
      <div className="brand">
        <h1>{t.title}</h1>
        <p>{t.subtitle}</p>
      </div>
      <div className="topbar-actions">
        <Segmented legend={t.currency} hideLegend value={currency} options={CURRENCY_OPTIONS} onChange={onCurrencyChange} />
        <ThemePicker choice={theme} onChange={onThemeChange} />
        <button type="button" className="ghost-button" onClick={onResetAll}>
          <ResetIcon />
          {t.resetAll}
        </button>
      </div>
    </header>
  );
}

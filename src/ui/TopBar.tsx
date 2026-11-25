import { useT, type LocaleId } from '../i18n';
import { CURRENCIES, CURRENCY_IDS, type Currency } from './money';
import { LanguagePicker } from './LanguagePicker';
import { Segmented } from './Segmented';
import type { ThemeChoice } from './theme';
import { ThemePicker } from './ThemePicker';
import { ResetIcon } from './icons';

interface Props {
  locale: LocaleId;
  onLocaleChange: (locale: LocaleId) => void;
  currency: Currency;
  onCurrencyChange: (currency: Currency) => void;
  theme: ThemeChoice;
  onThemeChange: (theme: ThemeChoice) => void;
  onResetAll: () => void;
}

const CURRENCY_OPTIONS = CURRENCY_IDS.map((id) => ({ value: id, label: CURRENCIES[id].symbol }));

/** The page title and the page-wide controls: language, currency, theme and reset. */
export function TopBar({ locale, onLocaleChange, currency, onCurrencyChange, theme, onThemeChange, onResetAll }: Props) {
  const t = useT();
  return (
    <header className="topbar">
      <div className="brand">
        <h1>{t.title}</h1>
        <p>{t.subtitle}</p>
      </div>
      <div className="topbar-actions">
        <Segmented legend={t.currency} hideLegend value={currency} options={CURRENCY_OPTIONS} onChange={onCurrencyChange} />
        <LanguagePicker locale={locale} onChange={onLocaleChange} />
        <ThemePicker choice={theme} onChange={onThemeChange} />
        <button type="button" className="ghost-button" onClick={onResetAll}>
          <ResetIcon size={15} aria-hidden />
          {t.resetAll}
        </button>
      </div>
    </header>
  );
}

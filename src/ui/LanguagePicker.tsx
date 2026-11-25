import { LOCALE_IDS, LOCALES, useT, type LocaleId } from '../i18n';
import { MenuPicker } from './MenuPicker';
import { LanguageIcon } from './icons';

interface Props {
  locale: LocaleId;
  onChange: (locale: LocaleId) => void;
}

// Each language is named in itself, not in the page's language, so someone who can't read the current
// page can still find theirs.
const OPTIONS = LOCALE_IDS.map((id) => ({ value: id, label: LOCALES[id].language.name, lang: id }));

/** A button showing the current language that opens the list of languages. */
export function LanguagePicker({ locale, onChange }: Props) {
  const t = useT();
  return (
    <MenuPicker
      legend={t.language.label}
      value={locale}
      options={OPTIONS}
      onChange={onChange}
      // The visible name stays part of the accessible name ("Language: English"), so voice users can say what they see.
      button={(
        <>
          <LanguageIcon size={16} aria-hidden />
          {/* The space sits outside the hidden span: trailing whitespace inside it is dropped from the name. */}
          <span className="visually-hidden">{t.language.label}:</span> {t.language.name}
        </>
      )}
      buttonClassName="ghost-button"
      buttonTitle={t.language.label}
    />
  );
}

import { useTranslation } from 'react-i18next';
import './LanguageSelector.css';

const LANGUAGES = [
  { code: 'es', flag: '🇪🇸', label: 'ES' },
  { code: 'en', flag: '🇬🇧', label: 'EN' },
  { code: 'fr', flag: '🇫🇷', label: 'FR' },
  { code: 'pt', flag: '🇵🇹', label: 'PT' },
  { code: 'ca', flag: '🏳️', label: 'CA' },
  { code: 'eu', flag: '🏳️', label: 'EU' },
  { code: 'gl', flag: '🏳️', label: 'GL' },
];

export default function LanguageSelector() {
  const { i18n } = useTranslation();

  const currentLang = i18n.language?.split('-')[0] || 'es';

  return (
    <div className="language-selector">
      {LANGUAGES.map(({ code, flag, label }) => (
        <button
          key={code}
          className={`lang-btn ${currentLang === code ? 'active' : ''}`}
          onClick={() => i18n.changeLanguage(code)}
          title={label}
        >
          <span className="lang-flag">{flag}</span>
          <span className="lang-code">{label}</span>
        </button>
      ))}
    </div>
  );
}

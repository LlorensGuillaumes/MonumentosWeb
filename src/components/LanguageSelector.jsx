import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './LanguageSelector.css';

const LANGUAGES = [
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'pt', label: 'Português', flag: '🇵🇹' },
  { code: 'ca', label: 'Català', flag: '🏳️' },
  { code: 'eu', label: 'Euskara', flag: '🏳️' },
  { code: 'gl', label: 'Galego', flag: '🏳️' },
];

export default function LanguageSelector() {
  const { i18n } = useTranslation();
  const [lang, setLang] = useState(() => i18n.language?.split('-')[0] || 'es');

  // Sincronizar si el idioma cambia desde fuera (ej: AuthContext)
  useEffect(() => {
    const handleChange = (lng) => setLang(lng?.split('-')[0] || 'es');
    i18n.on('languageChanged', handleChange);
    return () => i18n.off('languageChanged', handleChange);
  }, [i18n]);

  const handleChange = (e) => {
    const newLang = e.target.value;
    setLang(newLang);
    i18n.changeLanguage(newLang);
  };

  return (
    <select
      className="language-select"
      value={lang}
      onChange={handleChange}
    >
      {LANGUAGES.map(({ code, label, flag }) => (
        <option key={code} value={code}>
          {flag} {label}
        </option>
      ))}
    </select>
  );
}

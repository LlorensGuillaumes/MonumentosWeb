import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './LanguageSelector.css';

const LANGUAGES = [
  { code: 'es', label: 'Español' },
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'pt', label: 'Português' },
  { code: 'ca', label: 'Català' },
  { code: 'eu', label: 'Euskara' },
  { code: 'gl', label: 'Galego' },
  { code: 'it', label: 'Italiano' },
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
      {LANGUAGES.map(({ code, label }) => (
        <option key={code} value={code}>
          {label}
        </option>
      ))}
    </select>
  );
}

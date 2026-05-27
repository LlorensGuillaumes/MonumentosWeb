import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import './LanguageSelector.css';

const LANGUAGES = [
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'pt', label: 'Português', flag: '🇵🇹' },
  { code: 'ca', label: 'Català', flag: '🏴󠁥󠁳󠁣󠁴󠁿' },
  { code: 'eu', label: 'Euskara', flag: '🏴󠁥󠁳󠁰󠁶󠁿' },
  { code: 'gl', label: 'Galego', flag: '🏴󠁥󠁳󠁧󠁡󠁿' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
];

export default function LanguageSelector() {
  const { i18n } = useTranslation();
  const { user, updateProfile } = useAuth();
  const [lang, setLang] = useState(() => i18n.language?.split('-')[0] || 'es');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Sincronizar si el idioma cambia desde fuera (ej: AuthContext)
  useEffect(() => {
    const handleChange = (lng) => setLang(lng?.split('-')[0] || 'es');
    i18n.on('languageChanged', handleChange);
    return () => i18n.off('languageChanged', handleChange);
  }, [i18n]);

  // Cerrar al hacer click fuera
  useEffect(() => {
    function handleOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleOutside);
      return () => document.removeEventListener('mousedown', handleOutside);
    }
  }, [open]);

  const selectLang = async (newLang) => {
    setLang(newLang);
    i18n.changeLanguage(newLang);
    setOpen(false);
    // Persistir en backend si hay user logueado (para que sobreviva al recargar)
    if (user && user.idioma_por_defecto !== newLang) {
      try {
        await updateProfile({ idioma_por_defecto: newLang });
      } catch (err) {
        console.error('Error guardando idioma del usuario:', err);
      }
    }
  };

  const current = LANGUAGES.find(l => l.code === lang) || LANGUAGES[0];

  return (
    <div className="language-selector" ref={ref}>
      <button
        type="button"
        className="language-trigger"
        onClick={() => setOpen(o => !o)}
        aria-label={`Idioma: ${current.label}`}
        title={current.label}
        aria-expanded={open}
      >
        <span className="lang-flag">{current.flag}</span>
        <svg className="lang-arrow" width="10" height="6" viewBox="0 0 10 6" fill="currentColor">
          <path d="M0 0l5 6 5-6z" />
        </svg>
      </button>

      {open && (
        <ul className="language-menu" role="listbox">
          {LANGUAGES.map(({ code, label, flag }) => (
            <li
              key={code}
              role="option"
              aria-selected={code === lang}
              className={`language-option ${code === lang ? 'active' : ''}`}
              onClick={() => selectLang(code)}
            >
              <span className="lang-flag">{flag}</span>
              <span className="lang-label">{label}</span>
              {code === lang && (
                <svg className="lang-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

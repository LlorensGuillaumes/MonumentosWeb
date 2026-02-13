import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import es from './locales/es.json';
import en from './locales/en.json';
import fr from './locales/fr.json';
import pt from './locales/pt.json';
import ca from './locales/ca.json';
import eu from './locales/eu.json';
import gl from './locales/gl.json';
import it from './locales/it.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      es: { translation: es },
      en: { translation: en },
      fr: { translation: fr },
      pt: { translation: pt },
      ca: { translation: ca },
      eu: { translation: eu },
      gl: { translation: gl },
      it: { translation: it },
    },
    supportedLngs: ['es', 'en', 'fr', 'pt', 'ca', 'eu', 'gl', 'it'],
    fallbackLng: 'es',
    logLevel: 'error',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

export default i18n;

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import fr from './locales/fr.json';
import ar from './locales/ar.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      fr: { translation: fr },
      ar: { translation: ar },
    },
    supportedLngs: ['en', 'fr', 'ar'],
    fallbackLng: 'en',
    defaultNS: 'translation',
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'levelling-up-lang',
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false,
    },
  });

export const syncHtmlAttributes = (lng: string) => {
  const isRtl = lng === 'ar';
  document.documentElement.lang = lng;
  document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
  if (isRtl) {
    document.documentElement.classList.add('rtl');
  } else {
    document.documentElement.classList.remove('rtl');
  }
};

// Initial sync
syncHtmlAttributes(i18n.resolvedLanguage || i18n.language || 'en');

// Sync on every language change
i18n.on('languageChanged', (lng) => {
  syncHtmlAttributes(lng);
});

export default i18n;

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Importar traduções
import translationPT from './locales/pt/translation.json';
import translationDE from './locales/de/translation.json';
import translationES from './locales/es/translation.json';

// Os recursos de tradução
const resources = {
  pt: {
    translation: translationPT
  },
  de: {
    translation: translationDE
  },
  es: {
    translation: translationES
  }
};

i18n
  // Detectar idioma do navegador
  .use(LanguageDetector)
  // Passar para os componentes React
  .use(initReactI18next)
  // Inicializar i18next
  .init({
    resources,
    // Idioma padrão se não detectar
    fallbackLng: 'pt',
    // Para depuração
    debug: process.env.NODE_ENV === 'development',
    // Opção para evitar recarregar ao mudar idioma
    react: {
      useSuspense: false,
    },
    // Permitir HTML nas strings
    interpolation: {
      escapeValue: false,
    }
  });

export default i18n;
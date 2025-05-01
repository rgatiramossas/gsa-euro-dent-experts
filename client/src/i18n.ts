import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Importar recursos de tradução
import translationPT from './locales/pt/translation.json';
import translationDE from './locales/de/translation.json';
import translationES from './locales/es/translation.json';
import translationFR from './locales/fr/translation.json';
import translationIT from './locales/it/translation.json';

// Os recursos de idioma
const resources = {
  pt: {
    translation: translationPT
  },
  de: {
    translation: translationDE
  },
  es: {
    translation: translationES
  },
  fr: {
    translation: translationFR
  },
  it: {
    translation: translationIT
  }
};

// Configuração do i18next
i18n
  // Detectar idioma do navegador
  .use(LanguageDetector)
  // Integração com React
  .use(initReactI18next)
  // Inicializar i18next
  .init({
    resources,
    // Idioma padrão é português
    fallbackLng: 'pt',
    // Usar chaves de objeto mesmo para strings simples
    keySeparator: '.',
    interpolation: {
      // Não é necessário escapar valores para React
      escapeValue: false
    },
    // Opções de detecção de idioma
    detection: {
      // Ordem de detecção
      order: ['localStorage', 'navigator'],
      // Armazenar o idioma em localStorage
      caches: ['localStorage'],
      // Chave usada no localStorage
      lookupLocalStorage: 'i18nextLng'
    }
  });

export default i18n;
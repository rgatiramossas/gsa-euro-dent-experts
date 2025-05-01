import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (language: string) => {
    i18n.changeLanguage(language);
    // Armazena o idioma no localStorage para persistência
    localStorage.setItem('i18nextLng', language);
  };

  // Função para obter emoji da bandeira com base no idioma
  const getFlagEmoji = (language: string) => {
    switch(language) {
      case 'pt': return '🇵🇹';
      case 'en': return '🇬🇧';
      case 'de': return '🇩🇪';
      case 'es': return '🇪🇸';
      case 'fr': return '🇫🇷';
      case 'it': return '🇮🇹';
      default: return '🌐';
    }
  };

  // Função para obter nome do idioma
  const getLanguageName = (language: string) => {
    switch(language) {
      case 'pt': return 'Português';
      case 'en': return 'English';
      case 'de': return 'Deutsch';
      case 'es': return 'Español';
      case 'fr': return 'Français';
      case 'it': return 'Italiano';
      default: return 'Language';
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <Select
        defaultValue={i18n.language}
        onValueChange={changeLanguage}
      >
        <SelectTrigger className="w-[110px] text-white bg-primary border-white hover:bg-primary-dark">
          <SelectValue>
            <div className="flex items-center">
              <span className="mr-2">{getFlagEmoji(i18n.language)}</span>
              {getLanguageName(i18n.language)}
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="pt">
            <div className="flex items-center">
              <span className="mr-2">🇵🇹</span>
              Português
            </div>
          </SelectItem>
          <SelectItem value="en">
            <div className="flex items-center">
              <span className="mr-2">🇬🇧</span>
              English
            </div>
          </SelectItem>
          <SelectItem value="de">
            <div className="flex items-center">
              <span className="mr-2">🇩🇪</span>
              Deutsch
            </div>
          </SelectItem>
          <SelectItem value="es">
            <div className="flex items-center">
              <span className="mr-2">🇪🇸</span>
              Español
            </div>
          </SelectItem>
          <SelectItem value="fr">
            <div className="flex items-center">
              <span className="mr-2">🇫🇷</span>
              Français
            </div>
          </SelectItem>
          <SelectItem value="it">
            <div className="flex items-center">
              <span className="mr-2">🇮🇹</span>
              Italiano
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

export default LanguageSwitcher;
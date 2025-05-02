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
      case 'pt': return '🇧🇷'; // Alterado para bandeira brasileira
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
      default: return '';
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <Select
        value={i18n.language}
        onValueChange={changeLanguage}
      >
        <SelectTrigger className="md:w-[110px] w-[48px] h-[34px] text-white bg-primary border-white hover:bg-primary-dark px-1 md:px-2">
          <SelectValue>
            <div className="flex items-center">
              <span className="md:mr-2 text-base md:text-lg">{getFlagEmoji(i18n.language)}</span>
              <span className="hidden md:inline">{getLanguageName(i18n.language)}</span>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="pt">
            <div className="flex items-center">
              <span className="mr-2 text-base md:text-lg">🇧🇷</span>
              <span className="hidden md:inline">Português</span>
            </div>
          </SelectItem>
          <SelectItem value="en">
            <div className="flex items-center">
              <span className="mr-2 text-base md:text-lg">🇬🇧</span>
              <span className="hidden md:inline">English</span>
            </div>
          </SelectItem>
          <SelectItem value="de">
            <div className="flex items-center">
              <span className="mr-2 text-base md:text-lg">🇩🇪</span>
              <span className="hidden md:inline">Deutsch</span>
            </div>
          </SelectItem>
          <SelectItem value="es">
            <div className="flex items-center">
              <span className="mr-2 text-base md:text-lg">🇪🇸</span>
              <span className="hidden md:inline">Español</span>
            </div>
          </SelectItem>
          <SelectItem value="fr">
            <div className="flex items-center">
              <span className="mr-2 text-base md:text-lg">🇫🇷</span>
              <span className="hidden md:inline">Français</span>
            </div>
          </SelectItem>
          <SelectItem value="it">
            <div className="flex items-center">
              <span className="mr-2 text-base md:text-lg">🇮🇹</span>
              <span className="hidden md:inline">Italiano</span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

export default LanguageSwitcher;
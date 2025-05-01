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

  return (
    <div className="flex items-center space-x-2">
      <Select
        defaultValue={i18n.language}
        onValueChange={changeLanguage}
      >
        <SelectTrigger className="w-[120px]">
          <SelectValue placeholder="Idioma" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="pt">
            <div className="flex items-center">
              <span className="mr-2">🇵🇹</span>
              Português
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
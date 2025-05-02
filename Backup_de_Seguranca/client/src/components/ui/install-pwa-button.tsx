import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { canInstallPWA, promptInstall } from '@/lib/pwaManager';
import { useTranslation } from 'react-i18next';

interface InstallPWAButtonProps {
  className?: string;
}

/**
 * Botão que permite ao usuário instalar o aplicativo como um PWA
 * Só aparece se o navegador suportar a instalação e se o aplicativo ainda não estiver instalado
 */
export function InstallPWAButton({ className }: InstallPWAButtonProps) {
  const [isInstallable, setIsInstallable] = useState(false);
  const { t, i18n } = useTranslation();

  // Verificar se o aplicativo pode ser instalado como PWA
  useEffect(() => {
    const checkInstallable = () => {
      setIsInstallable(canInstallPWA());
    };

    // Verificar inicialmente
    checkInstallable();

    // Adicionar eventos para detectar mudanças no estado de instalabilidade
    window.addEventListener('appinstalled', () => setIsInstallable(false));
    
    // Verificar quando o evento beforeinstallprompt for disparado (o app se torna instalável)
    window.addEventListener('beforeinstallprompt', () => setIsInstallable(true));

    return () => {
      window.removeEventListener('appinstalled', () => setIsInstallable(false));
    };
  }, []);

  // Função para lidar com a instalação quando o botão for clicado
  const handleInstall = async () => {
    try {
      const installed = await promptInstall();
      if (installed) {
        setIsInstallable(false);
      }
    } catch (error) {
      console.error(i18n.language === 'en' ? 'Error installing PWA:' : 'Erro ao instalar o PWA:', error);
    }
  };

  // Não mostrar o botão se o app não pode ser instalado
  if (!isInstallable) {
    return null;
  }

  return (
    <Button
      onClick={handleInstall}
      variant="outline"
      size="sm"
      className={`${className} px-1 md:px-3 h-[34px] md:h-[36px]`}
      title={i18n.language === 'en' ? "Install app" : "Instalar aplicativo"}
    >
      <Download className="w-[16px] h-[16px] md:w-4 md:h-4 md:mr-2" />
      <span className="hidden md:inline">
        {i18n.language === 'en' ? "Install app" : "Instalar aplicativo"}
      </span>
      <span className="inline md:hidden text-xs">
        {i18n.language === 'en' ? "APP" : "APP"}
      </span>
    </Button>
  );
}
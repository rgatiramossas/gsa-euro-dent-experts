import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { canInstallPWA, promptInstall } from '@/lib/pwaManager';

interface InstallPWAButtonProps {
  className?: string;
}

/**
 * Botão que permite ao usuário instalar o aplicativo como um PWA
 * Só aparece se o navegador suportar a instalação e se o aplicativo ainda não estiver instalado
 */
export function InstallPWAButton({ className }: InstallPWAButtonProps) {
  const [isInstallable, setIsInstallable] = useState(false);

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
      console.error('Erro ao instalar o PWA:', error);
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
      className={className}
    >
      <Download className="w-4 h-4 mr-2" />
      Instalar aplicativo
    </Button>
  );
}
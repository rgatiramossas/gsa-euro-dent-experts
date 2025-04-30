import React from 'react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useOfflineStatus } from '@/hooks/useOfflineStatus';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';
import { Wifi, WifiOff } from 'lucide-react';
import { triggerSyncIfNeeded } from '@/lib/pwaManager';

interface OfflineAlertProps {
  actionPath?: string;
  actionText?: string;
  showOnlyWhenOffline?: boolean;
}

export const OfflineAlert: React.FC<OfflineAlertProps> = ({ 
  actionPath, 
  actionText = "Usar formulário offline simplificado",
  showOnlyWhenOffline = true
}) => {
  const { isOnline, pendingCount, isSyncing } = useOfflineStatus();
  const [, setLocation] = useLocation();

  // Se estiver online e a configuração for para mostrar apenas offline, não renderiza
  if (isOnline && showOnlyWhenOffline) {
    return null;
  }

  const handleAction = () => {
    if (actionPath) {
      setLocation(actionPath);
    }
  };

  const handleSync = () => {
    if (isOnline && !isSyncing && pendingCount > 0) {
      triggerSyncIfNeeded();
    }
  };

  return (
    <Alert variant={isOnline ? "info" : "warning"} className="mb-6">
      {isOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
      <AlertTitle>
        {isOnline ? "Conexão restaurada" : "Modo offline ativado"}
      </AlertTitle>
      <AlertDescription className="flex flex-col gap-2">
        {isOnline ? (
          pendingCount > 0 ? (
            <>
              <p>
                Você tem {pendingCount} item(s) pendente(s) para sincronizar com o servidor.
              </p>
              <div className="mt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleSync} 
                  disabled={isSyncing}
                >
                  {isSyncing ? "Sincronizando..." : "Sincronizar agora"}
                </Button>
              </div>
            </>
          ) : (
            <p>Todos os dados estão sincronizados com o servidor.</p>
          )
        ) : (
          <>
            <p>
              Você está trabalhando sem conexão. 
              Suas alterações serão salvas localmente e sincronizadas automaticamente 
              quando a conexão for restaurada.
            </p>
            {actionPath && (
              <div className="mt-2">
                <Button variant="outline" size="sm" onClick={handleAction}>
                  {actionText}
                </Button>
              </div>
            )}
          </>
        )}
      </AlertDescription>
    </Alert>
  );
};

export default OfflineAlert;
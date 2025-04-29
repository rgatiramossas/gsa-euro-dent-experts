import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { WifiOff, RefreshCw } from 'lucide-react';
import { checkNetworkStatus } from '@/lib/pwaManager';

interface OfflineIndicatorProps {
  className?: string;
}

/**
 * Componente que mostra uma indicação quando o aplicativo está offline
 * e também indica quando está sincronizando dados com o servidor
 */
export function OfflineIndicator({ className }: OfflineIndicatorProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // Verificar o estado online inicialmente
    setIsOnline(navigator.onLine);

    // Configurar manipuladores de eventos para atualizar quando o status da rede mudar
    const handleOnline = () => {
      setIsOnline(true);
      // Simular um estado de sincronização quando voltamos online
      setIsSyncing(true);
      setTimeout(() => setIsSyncing(false), 2000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setIsSyncing(false);
    };

    // Adicionar ouvintes de eventos
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Também ouvir eventos personalizados para sincronização
    window.addEventListener('sync-started', () => setIsSyncing(true));
    window.addEventListener('sync-completed', () => setIsSyncing(false));

    // Remover ouvintes de eventos ao desmontar
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('sync-started', () => setIsSyncing(true));
      window.removeEventListener('sync-completed', () => setIsSyncing(false));
    };
  }, []);

  // Não mostrar nada se estiver online e não estiver sincronizando
  if (isOnline && !isSyncing) {
    return null;
  }

  return (
    <div
      className={cn(
        'fixed top-0 left-0 right-0 z-50 p-2 text-center text-sm font-medium transition-all duration-300',
        isOnline 
          ? 'bg-green-600 text-white bg-opacity-90' 
          : 'bg-orange-600 text-white bg-opacity-90',
        className
      )}
    >
      <div className="flex items-center justify-center gap-2">
        {isOnline ? (
          <>
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Sincronizando dados com o servidor...</span>
          </>
        ) : (
          <>
            <WifiOff className="h-4 w-4" />
            <span>Você está offline. Suas alterações serão sincronizadas quando a conexão for restaurada.</span>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Componente que adiciona uma marcação visual para itens criados/modificados offline
 */
export function OfflineItemIndicator({ 
  className,
  createdOffline = false,
  modifiedOffline = false
}: { 
  className?: string,
  createdOffline?: boolean,
  modifiedOffline?: boolean
}) {
  if (!createdOffline && !modifiedOffline) return null;
  
  return (
    <span 
      className={cn(
        "inline-flex items-center gap-1 text-xs rounded px-1.5 py-0.5",
        createdOffline 
          ? "bg-orange-100 text-orange-800 border border-orange-300" 
          : "bg-yellow-100 text-yellow-800 border border-yellow-300",
        className
      )}
      title={createdOffline 
        ? "Criado offline, será sincronizado quando conectado" 
        : "Modificado offline, será sincronizado quando conectado"
      }
    >
      <WifiOff className="h-3 w-3" />
      {createdOffline ? "Novo" : "Modificado"}
    </span>
  );
}
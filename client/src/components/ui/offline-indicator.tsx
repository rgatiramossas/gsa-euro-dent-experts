import React, { useEffect, useState } from 'react';
import { CheckCircle2, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OfflineIndicatorProps {
  className?: string;
}

/**
 * Componente que mostra uma indicação quando o aplicativo está offline
 * e também indica quando está sincronizando dados com o servidor
 */
export function OfflineIndicator({ className }: OfflineIndicatorProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingChanges, setPendingChanges] = useState(0);

  // Monitora mudanças no status de conectividade
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Simula verificação periódica de mudanças pendentes
  // Na implementação real, isso viria do IndexedDB
  useEffect(() => {
    if (!isOnline) return;
    
    // Verifica se existem mudanças pendentes ao ficar online
    // E inicia a sincronização se necessário
    const checkPendingChanges = async () => {
      try {
        // Aqui você consultaria o banco offline para verificar mudanças pendentes
        // const pendingRequests = await db.pendingRequests.count();
        
        // Simulação:
        const pendingRequests = Math.floor(Math.random() * 3);
        setPendingChanges(pendingRequests);
        
        if (pendingRequests > 0) {
          setIsSyncing(true);
          
          // Simula a sincronização
          setTimeout(() => {
            setIsSyncing(false);
            setPendingChanges(0);
          }, 2000);
        }
      } catch (error) {
        console.error('Erro ao verificar mudanças pendentes:', error);
      }
    };
    
    checkPendingChanges();
  }, [isOnline]);

  // Se estiver online e não tiver sincronizando, não mostra nada
  if (isOnline && !isSyncing) {
    return null;
  }

  return (
    <div
      className={cn(
        'fixed top-0 left-0 right-0 z-50 py-1 px-4 text-sm font-medium flex items-center justify-center',
        isOnline 
          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' 
          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100',
        className
      )}
    >
      {isOnline ? (
        <>
          <CheckCircle2 className="w-4 h-4 mr-2" />
          <span>
            Sincronizando dados ({pendingChanges} {pendingChanges === 1 ? 'alteração' : 'alterações'} pendente{pendingChanges !== 1 ? 's' : ''})...
          </span>
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4 mr-2" />
          <span>
            Você está trabalhando offline. As alterações serão sincronizadas quando a conexão for restaurada.
          </span>
        </>
      )}
    </div>
  );
}

/**
 * Componente que adiciona uma marcação visual para itens criados/modificados offline
 */
export function OfflineItemIndicator({ 
  isOffline,
  children,
  className 
}: { 
  isOffline: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  if (!isOffline) {
    return <>{children}</>;
  }
  
  return (
    <div className={cn('relative', className)}>
      {children}
      <div className="absolute top-1 right-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100 text-xs px-1.5 py-0.5 rounded-md flex items-center">
        <WifiOff className="w-3 h-3 mr-1" />
        Offline
      </div>
    </div>
  );
}
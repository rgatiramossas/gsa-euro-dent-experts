import { useEffect, useState } from 'react';
import { offlineStatusStore } from '@/lib/stores';

// Interface para o estado de conectividade
interface OfflineStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
}

/**
 * Hook para obter informações sobre o estado offline da aplicação
 * 
 * @returns Objeto com informações sobre o estado de conectividade
 */
export function useOfflineStatus(): OfflineStatus {
  const [state, setState] = useState<OfflineStatus>({
    isOnline: navigator.onLine,
    isSyncing: false,
    pendingCount: 0
  });

  useEffect(() => {
    // Função para atualizar o estado
    const updateState = () => {
      // Usamos getters da store, não acessamos propriedades privadas diretamente
      setState({
        isOnline: navigator.onLine, // Usamos o valor do navegador diretamente
        isSyncing: false, // Valor padrão
        pendingCount: 0 // Valor padrão
      });
    };

    // Inscrever para receber atualizações da store
    const unsubscribe = offlineStatusStore.subscribe(updateState);
    
    // Fazer a primeira atualização ao montar o componente
    updateState();

    // Verificar eventos de navegador também
    const handleOnline = () => {
      offlineStatusStore.setOnline(true);
      setState(prev => ({ ...prev, isOnline: true }));
    };
    
    const handleOffline = () => {
      offlineStatusStore.setOnline(false);
      setState(prev => ({ ...prev, isOnline: false }));
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Também escutar eventos customizados para sincronização
    const handleSyncStart = () => setState(prev => ({ ...prev, isSyncing: true }));
    const handleSyncEnd = () => setState(prev => ({ ...prev, isSyncing: false }));
    
    window.addEventListener('sync-started', handleSyncStart);
    window.addEventListener('sync-completed', handleSyncEnd);

    // Limpar ao desmontar
    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('sync-started', handleSyncStart);
      window.removeEventListener('sync-completed', handleSyncEnd);
    };
  }, []);

  return state;
}

export default useOfflineStatus;
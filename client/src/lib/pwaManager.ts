// PWA Manager para Euro Dent Experts

// Verifica se o navegador suporta Service Workers
export const isPWASupported = () => {
  return 'serviceWorker' in navigator;
};

// Registra o service worker
export const registerServiceWorker = async () => {
  if (!isPWASupported()) {
    console.error('Service Workers não são suportados neste navegador.');
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    console.log('Service Worker registrado com sucesso');

    // Configurar atualização automática quando houver nova versão
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // Há uma nova versão pronta para ser usada
            if (window.confirm('Uma nova versão está disponível. Atualizar agora?')) {
              // Enviar mensagem para o service worker atualizar imediatamente
              newWorker.postMessage({ type: 'SKIP_WAITING' });
              // Recarregar a página para usar o novo service worker
              window.location.reload();
            }
          }
        });
      }
    });

    // Verificar atualizações a cada hora (3600000 ms)
    setInterval(() => {
      registration.update();
    }, 3600000);

    return true;
  } catch (error) {
    console.error('Falha ao registrar o Service Worker:', error);
    return false;
  }
};

// Verificar estado da conexão
export const checkNetworkStatus = () => {
  const isOnline = navigator.onLine;
  
  // Atualizar o estado do aplicativo com base na conectividade
  // Removido a pedido do cliente: não mostrar indicador visual de modo offline
  if (isOnline) {
    triggerSyncIfNeeded();
  }
  
  return isOnline;
};

// Funções para gerenciar o modo de manutenção de sessão
export const enableAuthSessionMaintenance = () => {
  if (navigator.serviceWorker && navigator.serviceWorker.controller) {
    console.log("Ativando modo de manutenção de sessão no Service Worker");
    navigator.serviceWorker.controller.postMessage({
      type: 'ENABLE_AUTH_SESSION_MAINTENANCE'
    });
    return true;
  }
  return false;
};

export const disableAuthSessionMaintenance = () => {
  if (navigator.serviceWorker && navigator.serviceWorker.controller) {
    console.log("Desativando modo de manutenção de sessão no Service Worker");
    navigator.serviceWorker.controller.postMessage({
      type: 'DISABLE_AUTH_SESSION_MAINTENANCE'
    });
    return true;
  }
  return false;
};

// Estender a interface ServiceWorkerRegistration para incluir sync
declare global {
  interface ServiceWorkerRegistration {
    sync?: {
      register(tag: string): Promise<void>;
    };
  }
}

// Solicitar sincronização quando online
export const triggerSyncIfNeeded = async () => {
  if (!navigator.onLine) return;
  
  try {
    const registration = await navigator.serviceWorker.ready;
    
    // Verificar se o navegador suporta Background Sync
    if (registration.sync && typeof registration.sync.register === 'function') {
      try {
        await registration.sync.register('sync-pending-requests');
        console.log('Sincronização em background registrada com sucesso');
      } catch (syncError) {
        console.log('Falha ao registrar sincronização em background, usando método manual', syncError);
        // Caso falhe, cai no método manual abaixo
        if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'SYNC_REQUEST'
          });
        }
      }
    } else {
      console.log('Background Sync não suportado neste navegador, usando sincronização manual');
      // Tentar sincronizar manualmente
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SYNC_REQUEST'
        });
      }
    }
  } catch (error) {
    console.log('Erro ao preparar sincronização - isso é esperado em alguns navegadores');
    // Tentar sincronização manual de qualquer forma
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SYNC_REQUEST'
      });
    }
  }
};

// Importar a DB offline para processamento de mensagens
import offlineDb from './offlineDb';
import { offlineStatusStore } from './stores';

// Importar o queryClient para invalidação de cache após sincronização
import { queryClient } from '@/lib/queryClient';

// Processar mensagens do service worker 
const processServiceWorkerMessage = async (event: MessageEvent) => {
  const data = event.data;
  
  if (!data || typeof data !== 'object') return;
  
  console.log('Mensagem recebida do service worker:', data.type);
  
  switch (data.type) {
    case 'online':
      // Removido a pedido do cliente: não mostrar indicador visual de modo offline
      offlineStatusStore.setOnline(true);
      break;
      
    case 'offline':
      // Removido a pedido do cliente: não mostrar indicador visual de modo offline
      offlineStatusStore.setOnline(false);
      break;
      
    case 'offline-operation-started':
      // Nova mensagem quando uma operação offline é iniciada
      console.log(`Operação offline iniciada: ${data.method} para ${data.tableName} (ID: ${data.tempId})`);
      // Aqui não fazemos nada específico - cada componente deve ouvir este evento individualmente
      break;
      
    case 'operation-queued':
      // Quando a operação é efetivamente armazenada para sincronização futura
      console.log(`Operação enfileirada para sincronização futura: ${data.tempId}`);
      break;
      
    case 'operation-synced':
      // Quando uma operação específica é sincronizada com sucesso
      console.log(`Operação sincronizada com sucesso: ${data.tempId}`);
      
      // Invalidar cache para forçar a atualização dos dados na tela
      if (data.tableName) {
        console.log(`Invalidando cache para tabela: ${data.tableName}`);
        queryClient.invalidateQueries({ queryKey: [`/api/${data.tableName}`] });
        
        // Para serviços, também invalidar estatísticas
        if (data.tableName === 'services') {
          queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
        }
      }
      break;
      
    case 'connection-status':
      // Atualizar status de conectividade e invalidar caches quando voltamos a ficar online
      console.log(`Status de conexão atualizado: ${data.online ? 'Online' : 'Offline'}`);
      if (data.online === true) {
        // Se estamos voltando a ficar online, invalidar todos os caches principais
        console.log('Voltamos a ficar online, invalidando caches para atualização');
        queryClient.invalidateQueries({ queryKey: ['/api/services'] });
        queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
        queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      }
      offlineStatusStore.setOnline(data.online);
      break;
      
    case 'sync-status':
      // Mudança no status geral de sincronização
      console.log(`Status de sincronização: ${data.status}`);
      if (data.status === 'in-progress') {
        offlineStatusStore.setSyncing(true);
      } else if (data.status === 'completed' || data.status === 'error') {
        offlineStatusStore.setSyncing(false);
        // Atualizar o contador de requisições pendentes
        offlineDb.countPendingRequests().then(count => {
          offlineStatusStore.setPendingCount(count);
        });
        
        // Após sincronização completa, invalidar queries para atualizar dados
        console.log('Sincronização concluída, atualizando dados da aplicação');
        queryClient.invalidateQueries();
      }
      break;
      
    case 'data-updated':
      // Tabela específica foi atualizada
      if (data.tableName) {
        console.log(`Dados atualizados para tabela: ${data.tableName}`);
        queryClient.invalidateQueries({ queryKey: [`/api/${data.tableName}`] });
      }
      break;
      
    case 'sync-error':
      console.error('Erro na sincronização:', data.error);
      offlineStatusStore.setSyncing(false);
      break;
      
    case 'resource-id-updated':
      // Atualizar o ID local para o ID do servidor após sincronização
      try {
        await offlineDb.updateLocalId(
          data.tableName,
          data.localId,
          data.serverId
        );
        console.log(`ID atualizado: ${data.tableName} ${data.localId} -> ${data.serverId}`);
      } catch (error) {
        console.error('Erro ao atualizar ID local:', error);
      }
      break;
  }
};

// Inicializar PWA
export const initPWA = () => {
  // Registrar o service worker
  registerServiceWorker();
  
  // Configurar listener para mensagens do service worker
  navigator.serviceWorker.addEventListener('message', processServiceWorkerMessage);
  
  // Configurar monitoramento de estado da rede
  window.addEventListener('online', checkNetworkStatus);
  window.addEventListener('offline', checkNetworkStatus);
  
  // Verificar estado inicial da rede
  checkNetworkStatus();
};

// Estender a interface Window para incluir deferredPrompt
declare global {
  interface Window {
    deferredPrompt?: any;
  }
}

// Verificar se o aplicativo está sendo executado no modo instalado (PWA)
export const isRunningAsInstalledPWA = () => {
  return window.matchMedia('(display-mode: standalone)').matches || 
         (window.navigator as any).standalone || 
         document.referrer.includes('android-app://');
};

// Verificar se o aplicativo pode ser instalado
export const canInstallPWA = () => {
  return !!window.deferredPrompt;
};

// Armazenar o evento beforeinstallprompt para uso posterior
export let deferredPrompt: any = null;

// Configurar captura do evento beforeinstallprompt
window.addEventListener('beforeinstallprompt', (e) => {
  // Prevenir que o Chrome mostre automaticamente o prompt
  e.preventDefault();
  // Armazenar o evento para uso posterior
  deferredPrompt = e;
  window.deferredPrompt = e;
});

// Solicitar a instalação do PWA
export const promptInstall = async () => {
  if (!deferredPrompt) {
    console.log('O aplicativo não pode ser instalado agora');
    return false;
  }
  
  // Mostrar o prompt de instalação
  deferredPrompt.prompt();
  
  // Aguardar a resposta do usuário
  const choiceResult = await deferredPrompt.userChoice;
  
  // Limpar o prompt armazenado - só pode ser usado uma vez
  deferredPrompt = null;
  
  return choiceResult.outcome === 'accepted';
};

// Limpar o prompt de instalação após a instalação
window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  console.log('PWA foi instalado com sucesso!');
});
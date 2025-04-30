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
    const registration = await navigator.serviceWorker.register('/sw.js', { 
      scope: '/',
      updateViaCache: 'none'
    });
    console.log('Service Worker registrado com sucesso');

    // Ativar o worker imediatamente
    if (registration.active) {
      registration.active.postMessage({ type: 'INIT' });
    }

    // Configurar atualização controlada quando houver nova versão
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // Evita prompt durante operações offline
            if (navigator.onLine) {
              // Há uma nova versão pronta para ser usada
              if (window.confirm('Uma nova versão está disponível. Atualizar agora?')) {
                newWorker.postMessage({ type: 'SKIP_WAITING' });
                window.location.reload();
              }
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
      await registration.sync.register('sync-pending-requests');
    } else {
      console.log('Background Sync não suportado neste navegador');
      // Tentar sincronizar manualmente
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SYNC_REQUEST'
        });
      }
    }
  } catch (error) {
    console.error('Erro ao registrar sincronização:', error);
  }
};

// Importar a DB offline para processamento de mensagens
import offlineDb from './offlineDb';
import { offlineStatusStore } from './stores';

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
      
    case 'sync-started':
      console.log(`Sincronizando ${data.count} requisições...`);
      offlineStatusStore.setSyncing(true);
      break;
      
    case 'sync-completed':
      console.log('Sincronização concluída');
      offlineStatusStore.setSyncing(false);
      // Atualizar o contador de requisições pendentes
      offlineDb.countPendingRequests().then(count => {
        offlineStatusStore.setPendingCount(count);
      });
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
// PWA Manager para Euro Dent Experts - Versão 2.0 
// Reescrito para suportar o novo Service Worker com capacidades offline avançadas

// Importações
import { toast } from "@/hooks/use-toast";
import { get as idbGet, set as idbSet } from 'idb-keyval';
import { offlineStatusStore } from './stores';

// Configurações
const SERVICE_WORKER_URL = '/sw.js';
const SERVICE_WORKER_SCOPE = '/';
const VERSION = '2.0';
const AUTO_UPDATE_INTERVAL = 3600000; // 1 hora

// Namespace para gerenciar o estado do aplicativo offline
export const OfflineManager = {
  // Estado do aplicativo
  isOnline: navigator.onLine,
  isSyncing: false,
  pendingCount: 0,
  lastSyncTime: 0,
  
  // Interface para obter cookies de autenticação para o SW
  getAuthCookie: async () => {
    // Retornar o cookie de autenticação do documento
    return document.cookie;
  },
  
  // Obter número de requisições pendentes
  getPendingCount: async (): Promise<number> => {
    try {
      if (!('indexedDB' in window)) return 0;
      
      // Abrir conexão com o IndexedDB
      const db = await openIndexedDB();
      if (!db) return 0;
      
      const transaction = db.transaction('pendingRequests', 'readonly');
      const store = transaction.objectStore('pendingRequests');
      
      return new Promise((resolve) => {
        const countRequest = store.count();
        countRequest.onsuccess = () => resolve(countRequest.result);
        countRequest.onerror = () => resolve(0);
      });
    } catch (error) {
      console.error('Erro ao contar requisições pendentes:', error);
      return 0;
    }
  },
  
  // Verificar e notificar sobre o status offline
  checkAndNotifyOfflineStatus: () => {
    const isOnline = navigator.onLine;
    
    if (OfflineManager.isOnline !== isOnline) {
      OfflineManager.isOnline = isOnline;
      offlineStatusStore.setOnline(isOnline);
      
      if (isOnline) {
        console.log('[PWA] Conexão restaurada');
        toast({
          title: "Conexão restaurada",
          description: "Seus dados serão sincronizados automaticamente.",
          variant: "default"
        });
        
        // Iniciar sincronização automaticamente
        OfflineManager.triggerSync();
      } else {
        console.log('[PWA] Modo offline ativado');
        toast({
          title: "Modo offline",
          description: "Você está trabalhando sem conexão. Suas alterações serão salvas localmente.",
          variant: "default"
        });
      }
    }
  },
  
  // Solicitar sincronização
  triggerSync: async () => {
    if (!navigator.onLine) return false;
    
    try {
      console.log('[PWA] Iniciando sincronização...');
      const registration = await navigator.serviceWorker.ready;
      
      // Verificar se o navegador suporta Background Sync
      if (registration.sync && typeof registration.sync.register === 'function') {
        await registration.sync.register('sync-pending-requests');
        console.log('[PWA] Background Sync registrado com sucesso');
        return true;
      } 
      
      // Fallback para navegadores que não suportam Background Sync
      console.log('[PWA] Background Sync não suportado, usando sincronização manual');
      
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SYNC_REQUEST'
        });
        console.log('[PWA] Solicitação de sincronização manual enviada');
        return true;
      } 
      
      console.warn('[PWA] Service Worker controller não disponível para sincronização manual');
      return false;
    } catch (error) {
      console.error('[PWA] Erro ao solicitar sincronização:', error);
      return false;
    }
  }
};

// Verifica se o navegador suporta Service Workers
export const isPWASupported = () => {
  return 'serviceWorker' in navigator && 'indexedDB' in window;
};

// Abrir o banco de dados IndexedDB
async function openIndexedDB() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('EuroDentOfflineDB', 1);
    
    request.onerror = () => {
      console.error('[PWA] Erro ao abrir banco de dados IndexedDB');
      reject(new Error('Falha ao abrir IndexedDB'));
    };
    
    request.onsuccess = () => resolve(request.result);
    
    // Se o banco não existir, o Service Worker irá criá-lo
    request.onupgradeneeded = () => {
      console.warn('[PWA] Banco de dados sendo criado pelo aplicativo - isso deveria ser feito pelo Service Worker');
    };
  });
}

// Registra o service worker
export const registerServiceWorker = async () => {
  if (!isPWASupported()) {
    console.error('[PWA] Service Workers ou IndexedDB não são suportados neste navegador.');
    return false;
  }

  try {
    console.log('[PWA] Registrando Service Worker...');
    const registration = await navigator.serviceWorker.register(SERVICE_WORKER_URL, { 
      scope: SERVICE_WORKER_SCOPE 
    });
    
    console.log('[PWA] Service Worker registrado com sucesso');
    
    // Configurar atualização automática quando houver nova versão
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('[PWA] Nova versão do Service Worker detectada');
            
            // Perguntar ao usuário se deseja atualizar
            if (window.confirm('Uma nova versão do aplicativo está disponível. Atualizar agora?')) {
              newWorker.postMessage({ type: 'SKIP_WAITING' });
              window.location.reload();
            }
          }
        });
      }
    });

    // Verificar atualizações periodicamente
    setInterval(() => {
      console.log('[PWA] Verificando atualizações do Service Worker...');
      registration.update();
    }, AUTO_UPDATE_INTERVAL);

    return true;
  } catch (error) {
    console.error('[PWA] Falha ao registrar o Service Worker:', error);
    return false;
  }
};

// Verificar estado da conexão
export const checkNetworkStatus = () => {
  OfflineManager.checkAndNotifyOfflineStatus();
  return navigator.onLine;
};

// Estender a interface ServiceWorkerRegistration para incluir sync
declare global {
  interface ServiceWorkerRegistration {
    sync?: {
      register(tag: string): Promise<void>;
    };
  }
  
  interface Window {
    deferredPrompt?: any;
  }
}

// Solicitar sincronização quando online
export const triggerSyncIfNeeded = async () => {
  if (!navigator.onLine) {
    console.log('[PWA] Não é possível sincronizar em modo offline');
    return false;
  }
  
  return OfflineManager.triggerSync();
};

// Processar mensagens do service worker 
const processServiceWorkerMessage = async (event: MessageEvent) => {
  const data = event.data;
  
  if (!data || typeof data !== 'object') return;
  
  console.log('[PWA] Mensagem recebida do Service Worker:', data.type);
  
  switch (data.type) {
    case 'sw-updated':
      console.log(`[PWA] Service Worker atualizado para versão ${data.version || 'desconhecida'}`);
      break;
    
    case 'online':
      OfflineManager.isOnline = true;
      offlineStatusStore.setOnline(true);
      break;
      
    case 'offline':
      OfflineManager.isOnline = false;
      offlineStatusStore.setOnline(false);
      break;
      
    case 'sync-started':
      console.log(`[PWA] Sincronização iniciada - ${data.count || 'múltiplas'} requisições pendentes`);
      OfflineManager.isSyncing = true;
      offlineStatusStore.setSyncing(true);
      break;
      
    case 'sync-completed':
      console.log('[PWA] Sincronização concluída com sucesso');
      OfflineManager.isSyncing = false;
      OfflineManager.lastSyncTime = Date.now();
      await idbSet('lastSyncTime', OfflineManager.lastSyncTime);
      
      // Atualizar estatísticas
      OfflineManager.pendingCount = await OfflineManager.getPendingCount();
      offlineStatusStore.setSyncing(false);
      offlineStatusStore.setPendingCount(OfflineManager.pendingCount);
      
      // Recarregar dados, se necessário
      if (data.successCount && data.successCount > 0) {
        toast({
          title: "Sincronização concluída",
          description: `${data.successCount} item(s) sincronizado(s) com sucesso.`,
          variant: "default"
        });
        
        // Notificar a aplicação para recarregar os dados na página atual
        window.dispatchEvent(new CustomEvent('sync-completed'));
      }
      break;
      
    case 'sync-error':
      console.error('[PWA] Erro na sincronização:', data.error);
      OfflineManager.isSyncing = false;
      offlineStatusStore.setSyncing(false);
      
      toast({
        title: "Erro na sincronização",
        description: data.error || "Ocorreu um erro ao sincronizar seus dados.",
        variant: "destructive"
      });
      break;
      
    case 'resource-id-updated':
      console.log(`[PWA] ID local atualizado: ${data.tableName}/${data.localId} -> ${data.serverId}`);
      
      // Disparar evento de atualização
      window.dispatchEvent(new CustomEvent('resource-id-updated', {
        detail: {
          tableName: data.tableName,
          localId: data.localId,
          serverId: data.serverId
        }
      }));
      break;
      
    case 'auth-required':
      console.warn('[PWA] Autenticação necessária para sincronizar');
      toast({
        title: "Autenticação necessária",
        description: "Faça login novamente para sincronizar seus dados.",
        variant: "destructive"
      });
      break;
      
    case 'get-auth-cookie':
      // O Service Worker está solicitando o cookie de autenticação
      const authCookie = await OfflineManager.getAuthCookie();
      if (event.ports && event.ports[0]) {
        event.ports[0].postMessage({ authCookie });
      }
      break;
  }
};

// Inicializar o módulo PWA
export const initPWA = async () => {
  console.log('[PWA] Inicializando módulo PWA v2.0...');
  
  try {
    // Carregar estado anterior, se disponível
    if ('indexedDB' in window) {
      OfflineManager.lastSyncTime = await idbGet('lastSyncTime') || 0;
      console.log(`[PWA] Última sincronização: ${new Date(OfflineManager.lastSyncTime).toLocaleString()}`);
    }
    
    // Configurar listener para mensagens do service worker
    navigator.serviceWorker.addEventListener('message', processServiceWorkerMessage);
    
    // Configurar monitoramento de estado da rede
    window.addEventListener('online', checkNetworkStatus);
    window.addEventListener('offline', checkNetworkStatus);
    
    // Inicializar o contador de requisições pendentes
    if (isPWASupported()) {
      OfflineManager.pendingCount = await OfflineManager.getPendingCount();
      offlineStatusStore.setPendingCount(OfflineManager.pendingCount);
    }
    
    // Registrar o service worker
    await registerServiceWorker();
    
    // Verificar estado inicial da rede
    checkNetworkStatus();
    
    console.log('[PWA] Módulo inicializado com sucesso');
    return true;
  } catch (error) {
    console.error('[PWA] Erro ao inicializar módulo:', error);
    return false;
  }
};

// FUNCIONALIDADES DE INSTALAÇÃO DO PWA

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
  console.log('[PWA] Aplicativo pode ser instalado');
  // Prevenir que o navegador mostre automaticamente o prompt
  e.preventDefault();
  // Armazenar o evento para uso posterior
  deferredPrompt = e;
  window.deferredPrompt = e;
  
  // Disparar evento para componentes que queiram mostrar um botão de instalação
  window.dispatchEvent(new CustomEvent('can-install-pwa'));
});

// Solicitar a instalação do PWA
export const promptInstall = async () => {
  if (!deferredPrompt) {
    console.log('[PWA] O aplicativo não pode ser instalado agora');
    return false;
  }
  
  console.log('[PWA] Solicitando instalação do PWA...');
  // Mostrar o prompt de instalação
  deferredPrompt.prompt();
  
  // Aguardar a resposta do usuário
  const choiceResult = await deferredPrompt.userChoice;
  
  // Limpar o prompt armazenado - só pode ser usado uma vez
  deferredPrompt = null;
  window.deferredPrompt = null;
  
  const accepted = choiceResult.outcome === 'accepted';
  console.log(`[PWA] Usuário ${accepted ? 'aceitou' : 'recusou'} a instalação`);
  
  return accepted;
};

// Limpar o prompt de instalação após a instalação
window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  window.deferredPrompt = null;
  console.log('[PWA] PWA instalado com sucesso!');
  
  // Mostrar mensagem de sucesso
  toast({
    title: "Aplicativo instalado",
    description: "Agora você pode acessar o aplicativo diretamente do seu dispositivo.",
    variant: "default"
  });
});
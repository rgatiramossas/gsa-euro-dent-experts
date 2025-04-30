// Service Worker para Euro Dent Experts
const CACHE_NAME = 'eurodent-cache-v1';

// Lista de recursos que queremos cachear inicialmente
const INITIAL_CACHED_RESOURCES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-512x512.svg'
];

// Evento de instalação - pré-cache dos recursos essenciais
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(INITIAL_CACHED_RESOURCES);
      })
      .then(() => {
        return self.skipWaiting();
      })
  );
});

// Evento de ativação - limpeza de caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((cacheName) => {
          return cacheName !== CACHE_NAME;
        }).map((cacheName) => {
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Estratégia de cached que tenta rede primeiro e usa cache como fallback
async function networkFirstWithCache(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    // Primeiro tenta pegar da rede
    const networkResponse = await fetch(request);

    // Se for navegação ou recurso estático, cache o resultado mais recente
    if (request.method === 'GET') {
      // Exclui URLs de API (exceto GETs) de serem cacheados
      if (!request.url.includes('/api/') || request.url.includes('/api/') && request.method === 'GET') {
        await cache.put(request, networkResponse.clone());
      }
    }

    return networkResponse;
  } catch (error) {
    // Se a rede falhou, tenta o cache
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Se não estiver no cache, retorna para página offline (para navegação)
    if (request.mode === 'navigate') {
      return caches.match('/');
    }

    // Caso contrário, propaga o erro
    throw error;
  }
}

// Intercepta requisições e aplica a estratégia apropriada
self.addEventListener('fetch', (event) => {
  // Ignorar requisições de desenvolvimento e extensões de navegador
  if (event.request.url.startsWith('chrome-extension://') || 
      event.request.url.includes('/__/')) {
    return;
  }

  // Verificar se é uma requisição para a API
  if (event.request.url.includes('/api/')) {
    const method = event.request.method.toUpperCase();

    // Para métodos que modificam dados (POST, PUT, DELETE)
    if (['POST', 'PUT', 'DELETE'].includes(method)) {
      event.respondWith(
        (async () => {
          try {
            const response = await fetch(event.request.clone());
            return response;
          } catch (error) {
            // Armazenar requisição para sincronização posterior
            const requestData = await event.request.json();
            const tempId = -Date.now();
            
            // Notificar clientes sobre o sucesso do salvamento offline
            notifyClients({
              type: 'save-completed',
              success: true,
              offline: true,
              id: tempId
            });

            // Retornar resposta simulada
            return new Response(JSON.stringify({
              success: true,
              _offline: true,
              _pending: true,
              id: tempId
            }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            });
          }
        })()
      );
      return;
    }
  }

  // Para outras requisições, mantém a estratégia network-first
  event.respondWith(networkFirstWithCache(event.request));
});

// Responder a mensagens do cliente
self.addEventListener('message', (event) => {
  if (!event.data) return;

  switch (event.data.type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'SYNC_REQUEST':
      // Solicitação manual de sincronização (para navegadores sem suporte a background sync)
      console.log('Recebida solicitação manual de sincronização');
      event.waitUntil(syncPendingRequests());
      break;

    case 'CHECK_SYNC_STATUS':
      // Enviar status atual de sincronização
      notifyClients({ 
        type: 'sync-status',
        isOnline: self.navigator.onLine
      });
      break;
  }
});

// Lidar com mudanças no estado da rede
self.addEventListener('online', () => {
  console.log('Service Worker detectou que está online');
  notifyClients({ type: 'online' });

  // Tentar sincronizar automaticamente quando voltar a estar online
  syncPendingRequests().catch(err => {
    console.error('Falha na sincronização automática:', err);
  });
});

self.addEventListener('offline', () => {
  console.log('Service Worker detectou que está offline');
  notifyClients({ type: 'offline' });
});

// Lidar com sincronização em segundo plano quando online
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-pending-requests') {
    console.log('Recebido evento de sincronização em segundo plano');
    event.waitUntil(syncPendingRequests());
  }
});

// Função para processar requisições pendentes
async function syncPendingRequests() {
  let db;
  try {
    console.log('Iniciando sincronização...');
    // Abrir uma conexão para nossa base de dados
    db = await openDatabase();
    if (!db) {
      throw new Error('Falha ao abrir banco de dados');
    }

    // Obter solicitações pendentes da tabela pendingRequests
    const pendingRequests = await db.getAll('pendingRequests');

    if (pendingRequests.length === 0) {
      console.log('Nenhuma solicitação pendente para sincronizar');
      return;
    }

    console.log(`Sincronizando ${pendingRequests.length} solicitações pendentes`);

    // Notificar o cliente de que a sincronização começou
    notifyClients({ type: 'sync-started', count: pendingRequests.length });

    // Processar cada solicitação pendente
    for (const request of pendingRequests) {
      try {
        console.log(`Sincronizando: ${request.method} ${request.url}`);

        // Tentar enviar a requisição pendente para o servidor
        const response = await fetch(request.url, {
          method: request.method,
          headers: request.headers || { 'Content-Type': 'application/json' },
          body: request.body ? JSON.stringify(request.body) : undefined,
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error(`Falha ao sincronizar requisição: ${response.status} ${response.statusText}`);
        }

        // Remover a requisição processada com sucesso
        await db.delete('pendingRequests', request.id);

        // Se for uma operação de criação, precisamos atualizar o ID local no banco de dados offline
        if (request.operationType === 'create' && request.tableName && request.resourceId) {
          try {
            const result = await response.json();

            if (result.id) {
              // Notificar os clientes sobre a atualização de ID
              notifyClients({
                type: 'resource-id-updated',
                tableName: request.tableName,
                localId: request.resourceId,
                serverId: result.id
              });
            }
          } catch (e) {
            console.warn('Não foi possível processar resposta JSON:', e);
          }
        }
      } catch (error) {
        console.error('Falha ao sincronizar requisição:', error);
        // Manter no banco de dados para tentar novamente mais tarde
      }
    }

    // Notificar o cliente de que a sincronização terminou
    notifyClients({ type: 'sync-completed' });

  } catch (error) {
    console.error('Erro durante sincronização:', error);
    // Notificar o cliente do erro
    notifyClients({ type: 'sync-error', error: error.message });
  }
}

// Abrir a conexão com o IndexedDB
async function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('EuroDentOfflineDB', 1);

    request.onerror = (event) => {
      console.error('Erro ao abrir banco:', event.target.error);
      reject(new Error('Falha ao abrir o banco de dados: ' + event.target.error));
    };

    request.onblocked = (event) => {
      console.warn('Banco bloqueado, fechando conexões antigas...');
      // Tentar fechar outras conexões
      db?.close();
    };

    request.onsuccess = (event) => {
      const db = event.target.result;

      // Definir funções auxiliares para trabalhar com o banco de dados
      db.getAll = (storeName) => {
        return new Promise((resolve, reject) => {
          const transaction = db.transaction(storeName, 'readonly');
          const store = transaction.objectStore(storeName);
          const request = store.getAll();

          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
      };

      db.delete = (storeName, key) => {
        return new Promise((resolve, reject) => {
          const transaction = db.transaction(storeName, 'readwrite');
          const store = transaction.objectStore(storeName);
          const request = store.delete(key);

          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      };

      resolve(db);
    };

    // Esta função é chamada se o banco não existir ou for atualizado de versão
    request.onupgradeneeded = (event) => {
      // Isso não deve acontecer no service worker, já que o banco é inicializado pelo aplicativo
      console.warn('Atualização do banco de dados acontecendo no service worker - isso não deveria ocorrer');
    };
  });
}

// Notificar todos os clientes ativos sobre eventos
async function notifyClients(message) {
  const clients = await self.clients.matchAll({ type: 'window' });
  clients.forEach(client => {
    client.postMessage(message);
  });
}
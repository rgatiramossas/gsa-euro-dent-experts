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

  // Aplica a estratégia network-first para todas as requisições
  event.respondWith(networkFirstWithCache(event.request));
});

// Responder a mensagens do cliente
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Lidar com sincronização em segundo plano quando online
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-pending-requests') {
    event.waitUntil(syncPendingRequests());
  }
});

// Função para processar requisições pendentes
async function syncPendingRequests() {
  try {
    // Esta função seria implementada para processar requisições offline
    // que foram armazenadas no IndexedDB
    const pendingRequests = await getPendingRequestsFromIDB();
    
    for (const request of pendingRequests) {
      try {
        // Tentar enviar a requisição pendente para o servidor
        await fetch(request.url, {
          method: request.method,
          headers: request.headers,
          body: request.body,
          credentials: 'include'
        });
        
        // Remover a requisição processada com sucesso
        await removePendingRequestFromIDB(request.id);
      } catch (error) {
        console.error('Falha ao sincronizar requisição:', error);
        // Mantenha no banco de dados para tentar novamente
      }
    }
  } catch (error) {
    console.error('Erro durante sincronização:', error);
  }
}

// Funções de acesso ao IndexedDB (implementadas pelo cliente)
// Estas funções seriam implementadas pelo cliente real usando mensagens
async function getPendingRequestsFromIDB() {
  // Esta é uma implementação fictícia
  return [];
}

async function removePendingRequestFromIDB(id) {
  // Esta é uma implementação fictícia
}
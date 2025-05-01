const CACHE_NAME = 'eurodent-cache-v2';
const SYNC_TIMEOUT = 30000; // 30 segundos para timeout de sincronização

// Recursos para cache inicial
const INITIAL_CACHED_RESOURCES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-512x512.svg'
];

// Evento de instalação
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(INITIAL_CACHED_RESOURCES))
      .then(() => self.skipWaiting())
  );
});

// Evento de ativação
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Estratégia de rede primeiro com fallback para cache
async function networkFirstWithCache(request) {
  const cache = await caches.open(CACHE_NAME);
  
  try {
    const networkResponse = await fetch(request);
    
    // Cache apenas requisições GET que não são APIs
    if (request.method === 'GET' && !request.url.includes('/api/')) {
      await cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    const cachedResponse = await cache.match(request);
    if (cachedResponse) return cachedResponse;
    
    if (request.mode === 'navigate') {
      return caches.match('/');
    }
    
    throw error;
  }
}

// Tratamento de requisições de API
async function handleApiRequest(event) {
  const { request } = event;
  const method = request.method.toUpperCase();

  // Métodos que modificam dados (POST, PUT, DELETE)
  if (['POST', 'PUT', 'DELETE'].includes(method)) {
    try {
      // Tenta fazer a requisição online primeiro
      const response = await fetch(request.clone());
      return response;
    } catch (error) {
      // Modo offline - armazena para sincronização posterior
      return handleOfflineRequest(request);
    }
  }
  
  // Para GETs de API, usa estratégia normal
  return networkFirstWithCache(request);
}

// Tratamento de requisições offline
async function handleOfflineRequest(request) {
  const requestData = await request.json();
  const tempId = 'offline-' + Date.now();
  const url = new URL(request.url);
  
  // Extrai o nome da tabela da URL
  const tableName = getTableNameFromUrl(url.pathname);

  // Notificação IMEDIATA antes de qualquer processamento
  await notifyClients({
    type: 'offline-operation-started',
    tempId,
    tableName,
    method: request.method
  });
  
  // Armazena a requisição no IndexedDB
  await storePendingRequest({
    id: tempId,
    url: request.url,
    method: request.method,
    headers: { 'Content-Type': 'application/json' },
    body: requestData,
    tableName,
    timestamp: Date.now()
  });
  
  console.log(`[SW] Operação offline armazenada: ${request.method} ${request.url} (ID: ${tempId})`);
  
  // Notifica o cliente novamente sobre o salvamento offline, com mais detalhes
  notifyClients({
    type: 'operation-queued',
    status: 'offline',
    tempId,
    tableName,
    method: request.method
  });
  
  // Retorna resposta simples indicando que foi aceita para processamento offline
  // Resposta SIMPLES sem dados extras para evitar problemas de parsing
  return new Response(JSON.stringify({
    status: 'accepted',
    offline: true
  }), {
    status: 202, // Accepted
    headers: { 'Content-Type': 'application/json' }
  });
}

// Evento fetch principal
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Ignora requisições de extensões e desenvolvimento
  if (request.url.startsWith('chrome-extension://') || 
      request.url.includes('/__/')) {
    return;
  }
  
  // Trata requisições de API separadamente
  if (request.url.includes('/api/')) {
    event.respondWith(handleApiRequest(event));
    return;
  }
  
  // Estratégia padrão para outros recursos
  event.respondWith(networkFirstWithCache(request));
});

// Sincronização de requisições pendentes
async function syncPendingRequests() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SYNC_TIMEOUT);
  
  try {
    const db = await openDatabase();
    if (!db) throw new Error('Database not available');
    
    const pendingRequests = await db.getAll('pendingRequests');
    if (pendingRequests.length === 0) return;
    
    // Agrupar requisições por tabela para notificação posterior
    const affectedTables = new Set();
    
    notifyClients({ 
      type: 'sync-status',
      status: 'in-progress',
      count: pendingRequests.length
    });
    
    for (const request of pendingRequests) {
      try {
        console.log(`[SW] Sincronizando: ${request.method} ${request.url}`);
        
        // Adicionar a tabela à lista de tabelas afetadas
        if (request.tableName) {
          affectedTables.add(request.tableName);
        }
        
        const response = await fetch(request.url, {
          method: request.method,
          headers: request.headers,
          body: request.body ? JSON.stringify(request.body) : undefined,
          credentials: 'include',
          signal: controller.signal
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        // Remove do banco de dados offline
        await db.delete('pendingRequests', request.id);
        
        // Se for uma criação, notifica sobre o novo ID
        if (request.method === 'POST') {
          const result = await response.json();
          notifyClients({
            type: 'operation-synced',
            status: 'completed',
            tempId: request.id,
            serverId: result.id,
            tableName: request.tableName
          });
        } else {
          // Para outros métodos (PUT, DELETE), envia notificação genérica
          notifyClients({
            type: 'operation-synced',
            status: 'completed',
            tempId: request.id,
            tableName: request.tableName
          });
        }
      } catch (error) {
        console.error(`[SW] Falha na sincronização: ${error}`);
        // Mantém no banco para tentar novamente depois
      }
    }
    
    // Após todas as sincronizações, notificar que está online para atualizar dados
    notifyClients({ 
      type: 'connection-status',
      online: true
    });
    
    // Notificar sobre cada tabela que foi atualizada
    affectedTables.forEach(tableName => {
      notifyClients({
        type: 'data-updated',
        tableName
      });
    });
    
    notifyClients({ 
      type: 'sync-status',
      status: 'completed'
    });
    
  } catch (error) {
    console.error('[SW] Erro durante sincronização:', error);
    notifyClients({
      type: 'sync-status',
      status: 'error',
      error: error.message
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

// Helper para extrair nome da tabela da URL
function getTableNameFromUrl(pathname) {
  const pathSegments = pathname.split('/').filter(Boolean);
  if (pathSegments[0] !== 'api' || pathSegments.length < 2) return 'unknown';
  
  const resource = pathSegments[1];
  const tableMap = {
    'clients': 'clients',
    'services': 'services',
    'budgets': 'budgets',
    'vehicles': 'vehicles',
    'users': 'technicians',
    'technicians': 'technicians',
    'events': 'events'
  };
  
  return tableMap[resource] || resource;
}

// Armazena requisição no IndexedDB
async function storePendingRequest(request) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('pendingRequests', 'readwrite');
    const store = transaction.objectStore('pendingRequests');
    const operation = store.put(request);
    
    operation.onsuccess = () => resolve();
    operation.onerror = () => reject(operation.error);
  });
}

// Conexão com IndexedDB
async function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('EuroDentOfflineDB', 10);
    
    request.onerror = () => reject('Failed to open DB');
    request.onsuccess = () => {
      const db = request.result;
      
      // Adiciona métodos úteis
      db.getAll = (storeName) => new Promise((res, rej) => {
        const tx = db.transaction(storeName, 'readonly');
        tx.objectStore(storeName).getAll().onsuccess = e => res(e.target.result);
        tx.onerror = () => rej(tx.error);
      });
      
      db.delete = (storeName, key) => new Promise((res, rej) => {
        const tx = db.transaction(storeName, 'readwrite');
        tx.objectStore(storeName).delete(key).onsuccess = () => res();
        tx.onerror = () => rej(tx.error);
      });
      
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pendingRequests')) {
        db.createObjectStore('pendingRequests', { keyPath: 'id' });
      }
    };
  });
}

// Notificação para clients
async function notifyClients(message) {
  const clients = await self.clients.matchAll({ type: 'window' });
  clients.forEach(client => client.postMessage(message));
}

// Event listeners para sincronização
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-pending-requests') {
    event.waitUntil(syncPendingRequests());
  }
});

self.addEventListener('online', () => {
  notifyClients({ type: 'connection-status', online: true });
  syncPendingRequests().catch(console.error);
});

self.addEventListener('offline', () => {
  notifyClients({ type: 'connection-status', online: false });
});

// Responder a mensagens do cliente
self.addEventListener('message', (event) => {
  if (!event.data) return;
  
  switch (event.data.type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
    
    case 'SYNC_REQUEST':
      // Solicitação manual de sincronização
      console.log('[SW] Recebida solicitação manual de sincronização');
      event.waitUntil(syncPendingRequests());
      break;
      
    case 'CHECK_SYNC_STATUS':
      // Enviar status atual de sincronização
      notifyClients({ 
        type: 'sync-status',
        online: navigator.onLine
      });
      break;
  }
});
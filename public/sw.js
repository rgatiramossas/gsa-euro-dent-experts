// Service Worker para Euro Dent Experts - VERSÃO 2.0 (COMPLETAMENTE REESCRITO)
const CACHE_NAME = 'eurodent-cache-v2';
const DB_NAME = 'EuroDentOfflineDB';
const DB_VERSION = 1;

// Lista de recursos estáticos que serão cacheados na instalação
const STATIC_RESOURCES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets',
  '/src',
  '/favicon.ico'
];

// Lista de rotas de API que serão interceptadas para funcionamento offline
const API_ROUTES = [
  { url: '/api/services', methods: ['GET', 'POST'], store: 'services' },
  { url: '/api/clients', methods: ['GET'], store: 'clients' },
  { url: '/api/service-types', methods: ['GET'], store: 'serviceTypes' },
  { url: '/api/users', methods: ['GET'], store: 'users' },
  { url: '/api/clients/', methods: ['GET'], store: 'clientVehicles', pattern: /\/api\/clients\/(\d+)\/vehicles/ }
];

// Esquema do banco de dados
const DB_SCHEMA = {
  pendingRequests: { keyPath: 'id', autoIncrement: false },
  services: { keyPath: 'id', autoIncrement: false, indices: [{ name: 'by_status', keyPath: 'status' }] },
  clients: { keyPath: 'id', autoIncrement: false },
  clientVehicles: { keyPath: 'id', autoIncrement: false, indices: [{ name: 'by_client', keyPath: 'client_id' }] },
  serviceTypes: { keyPath: 'id', autoIncrement: false },
  users: { keyPath: 'id', autoIncrement: false }
};

// Evento de instalação - configuração inicial
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Instalando versão 2.0');
  
  event.waitUntil(
    Promise.all([
      // Cachear recursos estáticos
      caches.open(CACHE_NAME).then(cache => {
        console.log('[Service Worker] Cacheando recursos estáticos');
        return cache.addAll(STATIC_RESOURCES);
      }),
      
      // Inicializar o banco de dados IndexedDB
      initializeDatabase().then(() => {
        console.log('[Service Worker] Banco de dados inicializado');
      })
    ])
    .then(() => self.skipWaiting())
    .catch(error => {
      console.error('[Service Worker] Erro na instalação:', error);
    })
  );
});

// Evento de ativação - limpar caches antigos
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Ativando versão 2.0');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => cacheName !== CACHE_NAME)
          .map(cacheName => {
            console.log('[Service Worker] Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          })
      );
    })
    .then(() => self.clients.claim())
    .then(() => {
      console.log('[Service Worker] Agora controlando todas as abas');
      // Notificar todos os clientes que o service worker foi atualizado
      return notifyAllClients({ type: 'sw-updated', version: '2.0' });
    })
  );
});

// Evento de fetch - intercepta todas as requisições
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  
  // Ignorar requisições para extensões ou de desenvolvimento
  if (url.origin !== location.origin || 
      url.pathname.startsWith('/node_modules/') || 
      url.pathname.startsWith('/__/')) {
    return;
  }
  
  // Verificar se é uma requisição de API
  const isApiRequest = url.pathname.startsWith('/api/');
  
  if (isApiRequest) {
    // Processar requisições de API (GET, POST, PUT, DELETE)
    event.respondWith(handleApiRequest(request));
  } else {
    // Recursos estáticos e navegação (HTML, CSS, JS, imagens, etc.)
    event.respondWith(handleStaticRequest(request));
  }
});

// Manipular requisições de API
async function handleApiRequest(request) {
  const url = new URL(request.url);
  const method = request.method;
  
  // Identificar que tipo de endpoint de API está sendo acessado
  const apiRoute = findMatchingApiRoute(url.pathname, method);
  
  if (!apiRoute) {
    console.log(`[Service Worker] Rota de API não registrada: ${url.pathname} [${method}]`);
    // Para rotas não registradas, tentamos primeiro a rede e depois o cache
    return networkFirstWithCache(request);
  }
  
  // Verificar se está online
  if (navigator.onLine) {
    try {
      // Se estiver online, tenta a requisição real
      console.log(`[Service Worker] Online - Tentando API real: ${url.pathname} [${method}]`);
      const networkResponse = await fetch(request.clone());
      
      // Se for uma requisição GET bem-sucedida, armazena no IndexedDB para uso offline
      if (method === 'GET' && networkResponse.status === 200 && apiRoute.store) {
        const responseData = await networkResponse.clone().json();
        await saveResponseToIndexedDB(apiRoute.store, responseData, url.pathname);
      }
      
      return networkResponse;
    } catch (error) {
      console.warn(`[Service Worker] Falha de rede, usando dados offline: ${error.message}`);
      // Se falhar, cai para o modo offline
    }
  }
  
  console.log(`[Service Worker] Offline - Usando IndexedDB para: ${url.pathname} [${method}]`);
  
  // Processar conforme o método HTTP
  if (method === 'GET') {
    return handleOfflineGet(apiRoute, url);
  } else if (method === 'POST') {
    return handleOfflinePost(apiRoute, request);
  } else if (method === 'PUT') {
    return handleOfflinePut(apiRoute, request);
  } else if (method === 'DELETE') {
    return handleOfflineDelete(apiRoute, request);
  }
  
  // Método não suportado offline
  return new Response(JSON.stringify({ 
    error: 'Método não suportado em modo offline' 
  }), {
    status: 503,
    headers: { 'Content-Type': 'application/json' }
  });
}

// Manipular requisições estáticas (recursos da aplicação)
async function handleStaticRequest(request) {
  const url = new URL(request.url);
  
  // Para requisições de navegação (HTML), usar estratégia cache primeiro
  if (request.mode === 'navigate') {
    const cachedResponse = await caches.match('/index.html');
    if (cachedResponse) {
      return cachedResponse;
    }
  }
  
  // Para outros recursos estáticos, tentar primeiro o cache, depois a rede
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Se não estiver no cache, tentar a rede
    const networkResponse = await fetch(request);
    
    // Guardar no cache para a próxima vez
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, networkResponse.clone());
    
    return networkResponse;
  } catch (error) {
    // Se falhar completamente, retornar uma resposta de erro
    console.error(`[Service Worker] Falha ao buscar recurso: ${url.pathname}`, error);
    
    if (request.mode === 'navigate') {
      // Para navegação, tenta uma página offline
      return caches.match('/index.html') || new Response('Offline - Não foi possível carregar a página solicitada', {
        status: 503,
        headers: { 'Content-Type': 'text/plain' }
      });
    }
    
    return new Response('Recurso não disponível offline', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

// Método GET offline
async function handleOfflineGet(apiRoute, url) {
  try {
    let data;
    
    // Verificar se é uma rota com parâmetro (por exemplo, /api/clients/:id/vehicles)
    if (apiRoute.pattern) {
      const match = url.pathname.match(apiRoute.pattern);
      if (match && match[1]) {
        const paramId = parseInt(match[1]);
        data = await getFromIndexedDBByIndex(apiRoute.store, 'by_client', paramId);
      }
    } else {
      // Buscar todos os dados do store
      data = await getAllFromIndexedDB(apiRoute.store);
    }
    
    if (!data || (Array.isArray(data) && data.length === 0)) {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error(`[Service Worker] Erro ao buscar dados offline para ${url.pathname}:`, error);
    return new Response(JSON.stringify({ error: 'Erro ao acessar dados offline' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Método POST offline
async function handleOfflinePost(apiRoute, request) {
  try {
    const content = await request.json();
    
    // Gerar ID temporário negativo para identificar como item offline
    const tempId = -Date.now();
    const data = { ...content, id: tempId, _offline: true, created_at: new Date().toISOString() };
    
    // Armazenar no IndexedDB
    await addToIndexedDB(apiRoute.store, data);
    
    // Adicionar à fila de sincronização
    await addPendingRequest({
      id: `post-${tempId}`,
      url: new URL(request.url).pathname,
      method: 'POST',
      body: { ...content, _isOffline: undefined, id: undefined },
      headers: { 'Content-Type': 'application/json' },
      timestamp: Date.now(),
      operationType: 'create',
      tableName: apiRoute.store,
      resourceId: tempId
    });
    
    // Responder com sucesso e o ID temporário
    return new Response(JSON.stringify({ ...data, _pendingSave: true }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error(`[Service Worker] Erro ao processar POST offline:`, error);
    return new Response(JSON.stringify({ error: 'Erro ao salvar dados offline' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Método PUT offline
async function handleOfflinePut(apiRoute, request) {
  try {
    const content = await request.json();
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const id = parseInt(pathParts[pathParts.length - 1]);
    
    if (!id) {
      throw new Error('ID inválido para atualização');
    }
    
    // Buscar o item existente para mesclar com as alterações
    const existingItem = await getFromIndexedDB(apiRoute.store, id);
    
    if (!existingItem) {
      return new Response(JSON.stringify({ error: 'Item não encontrado' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Mesclar o item existente com as alterações
    const updatedItem = { 
      ...existingItem, 
      ...content,
      _offline: true, 
      updated_at: new Date().toISOString() 
    };
    
    // Atualizar no IndexedDB
    await updateInIndexedDB(apiRoute.store, updatedItem);
    
    // Adicionar à fila de sincronização
    await addPendingRequest({
      id: `put-${id}-${Date.now()}`,
      url: url.pathname,
      method: 'PUT',
      body: content,
      headers: { 'Content-Type': 'application/json' },
      timestamp: Date.now(),
      operationType: 'update',
      tableName: apiRoute.store,
      resourceId: id
    });
    
    // Responder com sucesso
    return new Response(JSON.stringify({ ...updatedItem, _pendingSave: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error(`[Service Worker] Erro ao processar PUT offline:`, error);
    return new Response(JSON.stringify({ error: 'Erro ao atualizar dados offline' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Método DELETE offline
async function handleOfflineDelete(apiRoute, request) {
  try {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const id = parseInt(pathParts[pathParts.length - 1]);
    
    if (!id) {
      throw new Error('ID inválido para exclusão');
    }
    
    // Verificar se o item existe
    const existingItem = await getFromIndexedDB(apiRoute.store, id);
    
    if (!existingItem) {
      return new Response(JSON.stringify({ error: 'Item não encontrado' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Se o item foi criado offline (ID negativo), pode ser removido diretamente
    if (id < 0) {
      // Remover do IndexedDB
      await deleteFromIndexedDB(apiRoute.store, id);
      
      // Remover qualquer solicitação pendente relacionada
      await removePendingRequestsForResource(apiRoute.store, id);
      
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Se o item existe online, marcar como deletado offline
    await markAsDeletedInIndexedDB(apiRoute.store, id);
    
    // Adicionar à fila de sincronização
    await addPendingRequest({
      id: `delete-${id}-${Date.now()}`,
      url: url.pathname,
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      timestamp: Date.now(),
      operationType: 'delete',
      tableName: apiRoute.store,
      resourceId: id
    });
    
    // Responder com sucesso
    return new Response(JSON.stringify({ success: true, _pendingDelete: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error(`[Service Worker] Erro ao processar DELETE offline:`, error);
    return new Response(JSON.stringify({ error: 'Erro ao excluir dados offline' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Estratégia de cached que tenta rede primeiro e usa cache como fallback
async function networkFirstWithCache(request) {
  const cache = await caches.open(CACHE_NAME);
  
  try {
    // Primeiro tenta pegar da rede
    const networkResponse = await fetch(request);
    
    // Cache a resposta se for um GET
    if (request.method === 'GET') {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Se a rede falhou, tenta o cache
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Caso contrário, retorna um erro formatado como JSON
    return new Response(JSON.stringify({
      error: 'Sem conexão de rede e nenhum dado em cache disponível'
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Encontrar rota da API que corresponda ao caminho e método
function findMatchingApiRoute(pathname, method) {
  // Primeiro verificar correspondências exatas
  const exactMatch = API_ROUTES.find(route => 
    pathname === route.url && route.methods.includes(method)
  );
  
  if (exactMatch) return exactMatch;
  
  // Depois verificar rotas com padrões (usando regex)
  return API_ROUTES.find(route => 
    route.pattern && route.pattern.test(pathname) && route.methods.includes(method)
  );
}

// Inicializar o banco de dados
async function initializeDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = (event) => {
      console.error('[Service Worker] Erro ao abrir banco de dados:', event.target.error);
      reject(event.target.error);
    };
    
    request.onsuccess = (event) => {
      console.log('[Service Worker] Banco de dados aberto com sucesso');
      resolve(event.target.result);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      console.log('[Service Worker] Atualizando esquema do banco de dados');
      
      // Criar todas as object stores conforme o esquema
      Object.entries(DB_SCHEMA).forEach(([storeName, config]) => {
        if (!db.objectStoreNames.contains(storeName)) {
          const store = db.createObjectStore(storeName, { 
            keyPath: config.keyPath,
            autoIncrement: config.autoIncrement 
          });
          
          // Criar índices, se existirem
          if (config.indices) {
            config.indices.forEach(index => {
              store.createIndex(index.name, index.keyPath, { unique: index.unique || false });
            });
          }
          
          console.log(`[Service Worker] Object store '${storeName}' criada`);
        }
      });
    };
  });
}

// Abrir o banco de dados
async function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = (event) => {
      console.error('[Service Worker] Erro ao abrir banco de dados:', event.target.error);
      reject(event.target.error);
    };
    
    request.onsuccess = (event) => {
      resolve(event.target.result);
    };
  });
}

// Adicionar item ao IndexedDB
async function addToIndexedDB(storeName, data) {
  const db = await openDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    
    const request = store.add(data);
    
    transaction.oncomplete = () => resolve(data);
    request.onerror = (event) => reject(event.target.error);
  });
}

// Atualizar item no IndexedDB
async function updateInIndexedDB(storeName, data) {
  const db = await openDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    
    const request = store.put(data);
    
    transaction.oncomplete = () => resolve(data);
    request.onerror = (event) => reject(event.target.error);
  });
}

// Buscar item no IndexedDB por chave primária
async function getFromIndexedDB(storeName, key) {
  const db = await openDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    
    const request = store.get(key);
    
    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
}

// Buscar todos os itens de um store
async function getAllFromIndexedDB(storeName) {
  const db = await openDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    
    const request = store.getAll();
    
    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
}

// Buscar itens por índice
async function getFromIndexedDBByIndex(storeName, indexName, value) {
  const db = await openDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const index = store.index(indexName);
    
    const request = index.getAll(value);
    
    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
}

// Excluir item do IndexedDB
async function deleteFromIndexedDB(storeName, key) {
  const db = await openDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    
    const request = store.delete(key);
    
    transaction.oncomplete = () => resolve();
    request.onerror = (event) => reject(event.target.error);
  });
}

// Marcar item como excluído (soft delete)
async function markAsDeletedInIndexedDB(storeName, key) {
  const item = await getFromIndexedDB(storeName, key);
  
  if (item) {
    item._deleted = true;
    item._deletedAt = new Date().toISOString();
    return updateInIndexedDB(storeName, item);
  }
  
  return Promise.resolve();
}

// Salvar resposta da API no IndexedDB
async function saveResponseToIndexedDB(storeName, data, url) {
  try {
    // Verificar se os dados são um array ou um único objeto
    if (Array.isArray(data)) {
      // Para arrays, salvamos cada item individualmente
      const savePromises = data.map(item => updateInIndexedDB(storeName, item));
      await Promise.all(savePromises);
    } else {
      // Para um único objeto, salvamos diretamente
      await updateInIndexedDB(storeName, data);
    }
    
    console.log(`[Service Worker] Dados da API salvos no IndexedDB: ${url} (${storeName})`);
  } catch (error) {
    console.error(`[Service Worker] Erro ao salvar dados no IndexedDB: ${url}`, error);
  }
}

// Adicionar requisição pendente
async function addPendingRequest(request) {
  try {
    const db = await openDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('pendingRequests', 'readwrite');
      const store = transaction.objectStore('pendingRequests');
      
      const storeRequest = store.add(request);
      
      transaction.oncomplete = () => {
        console.log(`[Service Worker] Requisição pendente adicionada: ${request.method} ${request.url}`);
        resolve(request);
      };
      
      storeRequest.onerror = (event) => {
        console.error('[Service Worker] Erro ao adicionar requisição pendente:', event.target.error);
        reject(event.target.error);
      };
    });
  } catch (error) {
    console.error('[Service Worker] Erro ao adicionar requisição pendente:', error);
    throw error;
  }
}

// Remover requisições pendentes para um recurso específico
async function removePendingRequestsForResource(tableName, resourceId) {
  try {
    const db = await openDatabase();
    const pendingRequests = await getAllFromIndexedDB('pendingRequests');
    
    // Filtrar requisições relacionadas ao recurso
    const requestsToRemove = pendingRequests.filter(req => 
      req.tableName === tableName && req.resourceId === resourceId
    );
    
    // Excluir cada requisição encontrada
    const deletePromises = requestsToRemove.map(req => 
      deleteFromIndexedDB('pendingRequests', req.id)
    );
    
    await Promise.all(deletePromises);
    
    console.log(`[Service Worker] ${deletePromises.length} requisições pendentes removidas para ${tableName}/${resourceId}`);
  } catch (error) {
    console.error('[Service Worker] Erro ao remover requisições pendentes:', error);
  }
}

// EVENTOS DE SINCRONIZAÇÃO E STATUS DE REDE

// Lidar com mudanças no estado da rede
self.addEventListener('online', () => {
  console.log('[Service Worker] Conexão restaurada, sincronizando dados...');
  notifyAllClients({ type: 'online' });
  
  // Tentar sincronizar automaticamente 
  syncPendingRequests().catch(err => {
    console.error('[Service Worker] Falha na sincronização automática:', err);
  });
});

self.addEventListener('offline', () => {
  console.log('[Service Worker] Modo offline ativado');
  notifyAllClients({ type: 'offline' });
});

// Sincronização em segundo plano
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-pending-requests') {
    console.log('[Service Worker] Executando sincronização em segundo plano');
    event.waitUntil(syncPendingRequests());
  }
});

// Processar requisições pendentes
async function syncPendingRequests() {
  // Verifica se está online
  if (!navigator.onLine) {
    console.log('[Service Worker] Offline, adiando sincronização');
    return;
  }
  
  try {
    console.log('[Service Worker] Iniciando sincronização de requisições pendentes');
    notifyAllClients({ type: 'sync-started' });
    
    const pendingRequests = await getAllFromIndexedDB('pendingRequests');
    
    if (pendingRequests.length === 0) {
      console.log('[Service Worker] Não há requisições pendentes para sincronizar');
      notifyAllClients({ type: 'sync-completed', count: 0 });
      return;
    }
    
    console.log(`[Service Worker] Sincronizando ${pendingRequests.length} requisições pendentes`);
    
    // Ordenar por timestamp (as mais antigas primeiro)
    pendingRequests.sort((a, b) => a.timestamp - b.timestamp);
    
    let successCount = 0;
    let failureCount = 0;
    
    for (const request of pendingRequests) {
      try {
        console.log(`[Service Worker] Processando: ${request.method} ${request.url}`);
        
        // Construir headers
        const headers = new Headers(request.headers || {
          'Content-Type': 'application/json'
        });
        
        // Adicionar cookies de autenticação
        const authCookie = await getAuthCookieFromClient();
        if (authCookie) {
          headers.append('Cookie', authCookie);
        }
        
        // Enviar a requisição
        const response = await fetch(request.url, {
          method: request.method,
          headers: headers,
          body: request.body ? JSON.stringify(request.body) : undefined,
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error(`Falha na requisição: ${response.status} ${response.statusText}`);
        }
        
        // Processar resposta
        let responseData;
        try {
          responseData = await response.json();
        } catch (e) {
          console.log('[Service Worker] Resposta não é JSON, ignorando processamento');
        }
        
        // Para operações de criação, atualizar o ID local para o ID do servidor
        if (request.operationType === 'create' && responseData && responseData.id) {
          await updateResourceId(request.tableName, request.resourceId, responseData.id);
          
          // Notificar clientes sobre atualização de ID
          notifyAllClients({
            type: 'resource-id-updated',
            tableName: request.tableName,
            localId: request.resourceId,
            serverId: responseData.id
          });
        }
        
        // Remover a requisição processada
        await deleteFromIndexedDB('pendingRequests', request.id);
        successCount++;
        
      } catch (error) {
        console.error(`[Service Worker] Falha ao sincronizar ${request.method} ${request.url}:`, error);
        failureCount++;
        
        // Se falhou por questão de autenticação, notificar os clientes
        if (error.message && error.message.includes('401')) {
          notifyAllClients({ 
            type: 'auth-required',
            requestId: request.id,
            url: request.url
          });
        }
      }
    }
    
    console.log(`[Service Worker] Sincronização concluída: ${successCount} sucesso, ${failureCount} falhas`);
    notifyAllClients({ 
      type: 'sync-completed', 
      successCount, 
      failureCount,
      timestamp: Date.now() 
    });
    
  } catch (error) {
    console.error('[Service Worker] Erro durante sincronização:', error);
    notifyAllClients({ 
      type: 'sync-error', 
      error: error.message,
      timestamp: Date.now() 
    });
  }
}

// Atualizar o ID de um recurso após sincronização
async function updateResourceId(storeName, oldId, newId) {
  try {
    // Buscar o item com o ID temporário
    const item = await getFromIndexedDB(storeName, oldId);
    
    if (!item) {
      console.warn(`[Service Worker] Item não encontrado para atualização de ID: ${storeName}/${oldId}`);
      return;
    }
    
    // Criar uma cópia do item com o novo ID
    const updatedItem = {
      ...item,
      id: newId,
      _offline: false,
      _pendingSave: false
    };
    
    // Adicionar o item com o novo ID
    await updateInIndexedDB(storeName, updatedItem);
    
    // Remover o item com o ID temporário
    await deleteFromIndexedDB(storeName, oldId);
    
    console.log(`[Service Worker] ID atualizado: ${storeName}/${oldId} -> ${newId}`);
  } catch (error) {
    console.error(`[Service Worker] Erro ao atualizar ID: ${storeName}/${oldId}`, error);
  }
}

// Obter cookie de autenticação de um cliente ativo
async function getAuthCookieFromClient() {
  try {
    const clients = await self.clients.matchAll();
    
    if (clients.length === 0) {
      return null;
    }
    
    // Solicitar o cookie de autenticação do primeiro cliente ativo
    const client = clients[0];
    return new Promise((resolve) => {
      let timeoutId;
      
      const messageChannel = new MessageChannel();
      messageChannel.port1.onmessage = (event) => {
        clearTimeout(timeoutId);
        resolve(event.data.authCookie);
      };
      
      // Definir timeout para evitar bloqueio
      timeoutId = setTimeout(() => {
        resolve(null);
      }, 500);
      
      client.postMessage({ type: 'get-auth-cookie' }, [messageChannel.port2]);
    });
  } catch (error) {
    console.error('[Service Worker] Erro ao obter cookie de autenticação:', error);
    return null;
  }
}

// Notificar todos os clientes ativos
async function notifyAllClients(message) {
  const clients = await self.clients.matchAll({ type: 'window' });
  
  clients.forEach(client => {
    client.postMessage(message);
  });
}
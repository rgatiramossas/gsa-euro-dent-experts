const CACHE_NAME = 'eurodent-cache-v4';
const SYNC_TIMEOUT = 20000; // 20 segundos para timeout de sincronização (reduzido para evitar CPU excessivo)

// Recursos para cache inicial
const INITIAL_CACHED_RESOURCES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-512x512.svg',
  '/eurodent-logo.png',
  '/images/logo.png'
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
  
  // Verificar se está no modo de manutenção da sessão (usando flag no localStorage)
  // Necessário verificar isso aqui usando mensagens já que o SW não tem acesso ao localStorage
  const isCriticalAuth = self._authSessionMaintenanceMode === true;
  
  // Durante modo de manutenção de sessão ou requisições de autenticação, sempre usar a rede diretamente
  if (isCriticalAuth || request.url.includes('/api/auth/')) {
    console.log('[SW] Passando requisição diretamente para a rede (autenticação):', request.url);
    event.respondWith(fetch(request));
    return;
  }
  
  // Sempre deixar passar requisições POST com cookies para evitar problemas de sessão
  if (request.method === 'POST' && request.headers.has('cookie')) {
    console.log('[SW] Passando requisição POST com cookies diretamente:', request.url);
    event.respondWith(fetch(request));
    return;
  }
  
  // Trata outras requisições de API separadamente
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
    console.log('[SW] Iniciando sincronização de requisições pendentes');
    
    // Verificar se IndexedDB está disponível e acessível
    if (!('indexedDB' in self)) {
      console.error('[SW] IndexedDB não está disponível neste ambiente');
      notifyClients({ 
        type: 'sync-status',
        status: 'error',
        error: 'IndexedDB não disponível'
      });
      return;
    }
    
    // Tentar abrir o banco com tratamento de erro melhorado
    let db;
    try {
      db = await openDatabase();
      if (!db) throw new Error('Database not available');
      console.log('[SW] Banco aberto com sucesso para sincronização');
    } catch (dbError) {
      console.error('[SW] Erro ao abrir database para sincronização:', dbError);
      notifyClients({ 
        type: 'sync-status',
        status: 'error',
        error: 'Falha ao abrir banco de dados: ' + dbError.message
      });
      return;
    }
    
    // Buscar requisições pendentes
    let pendingRequests;
    try {
      pendingRequests = await db.getAll('pendingRequests');
      console.log(`[SW] Encontradas ${pendingRequests.length} requisições pendentes para sincronizar`);
    } catch (getError) {
      console.error('[SW] Erro ao buscar requisições pendentes:', getError);
      notifyClients({ 
        type: 'sync-status',
        status: 'error',
        error: 'Falha ao ler dados pendentes: ' + getError.message
      });
      return;
    }
    
    if (pendingRequests.length === 0) {
      console.log('[SW] Nenhuma requisição pendente para sincronizar');
      notifyClients({ 
        type: 'sync-status',
        status: 'completed',
        message: 'Nenhuma operação pendente'
      });
      return;
    }
    
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
        
        // Verificar se a requisição já falhou muitas vezes
        const retryCount = request.retryCount || 0;
        if (retryCount >= 3) {
          console.log(`[SW] Abandonando requisição após ${retryCount} tentativas: ${request.url}`);
          
          // Remover a requisição do banco para não tentar novamente
          await db.delete('pendingRequests', request.id);
          
          // Notificar sobre a falha permanente, mas com mensagem simplificada
          // para economizar recursos de memória e processamento
          notifyClients({
            type: 'operation-failed',
            status: 'abandoned',
            tempId: request.id,
            tableName: request.tableName
          });
          
          continue; // Pular para a próxima requisição
        }
        
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
        
        // Se a requisição não foi bem-sucedida, incrementar o contador de tentativas
        if (!response.ok) {
          const responseBody = await response.text();
          console.error(`[SW] Falha na sincronização: HTTP ${response.status} - ${responseBody}`);
          
          // Atualizar o objeto com a nova contagem de tentativas
          const updatedRequest = {
            ...request,
            retryCount: retryCount + 1,
            lastErrorMessage: `HTTP ${response.status} - ${responseBody.substring(0, 200)}`,
            lastAttempt: Date.now()
          };
          
          // Salvar a atualização no IndexedDB
          await db.put('pendingRequests', updatedRequest);
          
          throw new Error(`HTTP ${response.status}`);
        }
        
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
        console.error(`[SW] Erro durante sincronização: ${error}`);
        
        // Incrementar contagem de tentativas
        const retryCount = request.retryCount || 0;
        const updatedRequest = {
          ...request,
          retryCount: retryCount + 1,
          lastErrorMessage: error.message,
          lastAttempt: Date.now()
        };
        
        // Atualizar registro com a nova contagem de tentativas
        await db.put('pendingRequests', updatedRequest);
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
  try {
    console.log('[SW] Tentando armazenar requisição pendente:', request.id);
    const db = await openDatabase();
    if (!db) {
      console.error('[SW] Banco de dados não disponível para armazenar requisição');
      throw new Error('Database not available');
    }

    return new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction('pendingRequests', 'readwrite');
        
        transaction.onerror = (event) => {
          console.error('[SW] Erro na transação de armazenamento:', event.target.error);
          reject(event.target.error);
        };
        
        const store = transaction.objectStore('pendingRequests');
        const operation = store.put(request);
        
        operation.onsuccess = () => {
          console.log('[SW] Requisição armazenada com sucesso:', request.id);
          resolve();
        };
        
        operation.onerror = (event) => {
          console.error('[SW] Erro ao armazenar requisição:', event.target.error);
          reject(event.target.error);
        };
      } catch (error) {
        console.error('[SW] Erro crítico ao tentar armazenar requisição:', error);
        reject(error);
      }
    });
  } catch (outerError) {
    console.error('[SW] Falha geral ao tentar armazenar requisição:', outerError);
    // Falhar silenciosamente para o usuário, mas registrar erro no console
    return Promise.resolve(); // Não rejeitar para evitar erro visível ao usuário
  }
}

// Conexão com IndexedDB
async function openDatabase() {
  return new Promise((resolve, reject) => {
    try {
      // Atualizamos a versão para 30 para resolver o erro "version (20) is less than the existing version (30)"
      const request = indexedDB.open('EuroDentOfflineDB', 30);
      
      request.onerror = (event) => {
        console.error('[SW] Erro ao abrir banco de dados:', event.target.error);
        reject('Failed to open DB: ' + (event.target.error ? event.target.error.message : 'Unknown error'));
      };
      
      request.onsuccess = () => {
        const db = request.result;
        
        // Adiciona métodos úteis
        db.getAll = (storeName) => new Promise((res, rej) => {
          try {
            const tx = db.transaction(storeName, 'readonly');
            const request = tx.objectStore(storeName).getAll();
            request.onsuccess = e => res(e.target.result);
            request.onerror = e => rej(e.target.error);
            tx.onerror = e => rej(e.target.error);
          } catch (error) {
            console.error(`[SW] Erro em getAll(${storeName}):`, error);
            rej(error);
          }
        });
        
        db.delete = (storeName, key) => new Promise((res, rej) => {
          try {
            const tx = db.transaction(storeName, 'readwrite');
            const request = tx.objectStore(storeName).delete(key);
            request.onsuccess = () => res();
            request.onerror = e => rej(e.target.error);
            tx.onerror = e => rej(e.target.error);
          } catch (error) {
            console.error(`[SW] Erro em delete(${storeName}, ${key}):`, error);
            rej(error);
          }
        });
        
        db.put = (storeName, value) => new Promise((res, rej) => {
          try {
            const tx = db.transaction(storeName, 'readwrite');
            const request = tx.objectStore(storeName).put(value);
            request.onsuccess = () => res();
            request.onerror = e => rej(e.target.error);
            tx.onerror = e => rej(e.target.error);
          } catch (error) {
            console.error(`[SW] Erro em put(${storeName}):`, error);
            rej(error);
          }
        });
        
        console.log('[SW] Banco de dados aberto com sucesso');
        resolve(db);
      };
      
      request.onupgradeneeded = (event) => {
        console.log('[SW] Atualizando estrutura do banco de dados de versão', event.oldVersion, 'para', event.newVersion);
        const db = event.target.result;
        
        // Se não existir o objectStore para requisições pendentes, cria
        if (!db.objectStoreNames.contains('pendingRequests')) {
          console.log('[SW] Criando object store pendingRequests');
          db.createObjectStore('pendingRequests', { keyPath: 'id' });
        }
        
        // Se tiver outras atualizações estruturais futuras, pode fazer condicionais baseadas na versão
        console.log('[SW] Estrutura do banco atualizada com sucesso');
      };
      
      request.onblocked = (event) => {
        console.warn('[SW] Abertura do banco bloqueada, fechando conexões...');
        // Tentar fechar outras conexões que possam estar bloqueando
        indexedDB.databases().then(dbs => {
          dbs.forEach(db => {
            if (db.name === 'EuroDentOfflineDB') {
              console.log('[SW] Tentando fechar conexão bloqueadora');
              indexedDB.deleteDatabase('EuroDentOfflineDB');
            }
          });
        });
      };
    } catch (error) {
      console.error('[SW] Erro crítico ao configurar IndexedDB:', error);
      reject('Critical error setting up IndexedDB: ' + error.message);
    }
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

// Inicializar estado global para o modo de manutenção de sessão
self._authSessionMaintenanceMode = false;

// Função para precarregar e atualizar o cache de imagens importantes
async function precacheImportantImages() {
  try {
    const cache = await caches.open(CACHE_NAME);
    
    // Lista de imagens importantes para funcionamento offline
    const importantImages = [
      '/eurodent-logo.png',
      '/images/logo.png'
    ];
    
    console.log('[SW] Precarregando imagens importantes...');
    
    // Usando Promise.all para paralelizar os fetchs
    await Promise.all(
      importantImages.map(async imageUrl => {
        try {
          // Tentar buscar da rede primeiro
          const response = await fetch(imageUrl, { cache: 'no-cache' });
          if (response.ok) {
            await cache.put(imageUrl, response.clone());
            console.log(`[SW] Imagem cacheada com sucesso: ${imageUrl}`);
          } else {
            console.warn(`[SW] Falha ao buscar imagem da rede: ${imageUrl}`);
          }
        } catch (error) {
          console.warn(`[SW] Erro ao cachear imagem ${imageUrl}:`, error);
        }
      })
    );
    
    console.log('[SW] Precarregamento de imagens concluído');
  } catch (error) {
    console.error('[SW] Erro ao precachear imagens:', error);
  }
}

// Executar o precache durante a instalação e também mediante solicitação
precacheImportantImages();

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
      
    case 'PRECACHE_IMAGES':
      // Solicitação manual para precarregar imagens
      console.log('[SW] Recebida solicitação para precarregar imagens');
      event.waitUntil(precacheImportantImages());
      break;
      
    case 'ENABLE_AUTH_SESSION_MAINTENANCE':
      // Ativar modo de manutenção de sessão para evitar interferências em operações de autenticação
      console.log('[SW] Ativando modo de manutenção de sessão');
      self._authSessionMaintenanceMode = true;
      notifyClients({ 
        type: 'auth-session-maintenance',
        enabled: true
      });
      break;
      
    case 'DISABLE_AUTH_SESSION_MAINTENANCE':
      // Desativar modo de manutenção de sessão
      console.log('[SW] Desativando modo de manutenção de sessão');
      self._authSessionMaintenanceMode = false;
      notifyClients({ 
        type: 'auth-session-maintenance',
        enabled: false
      });
      break;
  }
});
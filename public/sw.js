importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js');

// Definição da versão do cache
const CACHE_VERSION = '1.0.0';

// Configuração básica do Workbox
workbox.setConfig({
  debug: false
});

// Precachear os assets core da aplicação
workbox.precaching.precacheAndRoute(self.__WB_MANIFEST || []);

// Cache para assets estáticos
workbox.routing.registerRoute(
  ({ request }) => request.destination === 'style' || 
                   request.destination === 'script' || 
                   request.destination === 'font',
  new workbox.strategies.CacheFirst({
    cacheName: `static-assets-${CACHE_VERSION}`,
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 dias
      }),
    ],
  })
);

// Cache para imagens
workbox.routing.registerRoute(
  ({ request }) => request.destination === 'image',
  new workbox.strategies.CacheFirst({
    cacheName: `images-${CACHE_VERSION}`,
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 dias
      }),
    ],
  })
);

// Cache para fontes do Google
workbox.routing.registerRoute(
  ({url}) => url.origin === 'https://fonts.googleapis.com' || 
             url.origin === 'https://fonts.gstatic.com',
  new workbox.strategies.StaleWhileRevalidate({
    cacheName: `google-fonts-${CACHE_VERSION}`,
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 30,
        maxAgeSeconds: 60 * 60 * 24 * 365, // 1 ano
      }),
    ],
  })
);

// Estratégia para API: NetworkFirst com fallback para cache
workbox.routing.registerRoute(
  ({url}) => url.pathname.startsWith('/api/'),
  new workbox.strategies.NetworkFirst({
    cacheName: `api-cache-${CACHE_VERSION}`,
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 7 * 24 * 60 * 60, // 7 dias
      }),
    ],
  })
);

// Configuração de background sync para operações que modificam dados
const bgSyncPlugin = new workbox.backgroundSync.BackgroundSyncPlugin('offline-mutations-queue', {
  maxRetentionTime: 24 * 60, // 24 horas em minutos
  onSync: async ({queue}) => {
    let entry;
    while ((entry = await queue.shiftRequest())) {
      try {
        await fetch(entry.request);
        console.log('Requisição sincronizada com sucesso', entry.request);
      } catch (error) {
        console.error('Erro ao sincronizar requisição', error);
        await queue.unshiftRequest(entry);
        throw error;
      }
    }
  }
});

// Capturar e enfileirar requisições de escrita (POST, PUT, DELETE) para sincronização
workbox.routing.registerRoute(
  ({url}) => url.pathname.startsWith('/api/') &&
             (self.navigator.onLine === false),
  new workbox.strategies.NetworkOnly({
    plugins: [bgSyncPlugin],
  }),
  'POST'
);

workbox.routing.registerRoute(
  ({url}) => url.pathname.startsWith('/api/') &&
             (self.navigator.onLine === false),
  new workbox.strategies.NetworkOnly({
    plugins: [bgSyncPlugin],
  }),
  'PUT'
);

workbox.routing.registerRoute(
  ({url}) => url.pathname.startsWith('/api/') &&
             (self.navigator.onLine === false),
  new workbox.strategies.NetworkOnly({
    plugins: [bgSyncPlugin],
  }),
  'DELETE'
);

// Navegação: StaleWhileRevalidate para navegação
workbox.routing.registerRoute(
  ({request}) => request.mode === 'navigate',
  new workbox.strategies.StaleWhileRevalidate({
    cacheName: `navigations-${CACHE_VERSION}`,
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 24 * 60 * 60, // 1 dia
      }),
    ],
  })
);

// Gerenciar atualizações do Service Worker
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Evento activate - limpar caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            // Remover caches antigos que não correspondem à versão atual
            return cacheName.includes('-') && !cacheName.includes(CACHE_VERSION);
          })
          .map((cacheName) => {
            return caches.delete(cacheName);
          })
      );
    })
  );
});

// Implementar verificação periódica de conectividade e sincronização
setInterval(() => {
  if (self.navigator.onLine) {
    self.registration.sync.register('sync-data');
  }
}, 60000); // Verificar a cada minuto

// Lidar com eventos de sincronização
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    // A sincronização já está sendo gerenciada pelo bgSyncPlugin
    console.log('Sincronização periódica iniciada');
  }
});
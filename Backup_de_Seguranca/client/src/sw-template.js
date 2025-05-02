// This file will be preprocessed by Vite and injected with __WB_MANIFEST
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { BackgroundSyncPlugin } from 'workbox-background-sync';

// Precache os ativos estáticos (controlado pelo Vite)
precacheAndRoute(self.__WB_MANIFEST || []);

// Cache para arquivos estáticos
registerRoute(
  ({ request }) => 
    request.destination === 'style' || 
    request.destination === 'script' || 
    request.destination === 'font',
  new CacheFirst({
    cacheName: 'static-resources',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 dias
      }),
    ],
  })
);

// Cache para imagens
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 dias
      }),
    ],
  })
);

// Cache para fontes
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com' || 
              url.origin === 'https://fonts.gstatic.com',
  new StaleWhileRevalidate({
    cacheName: 'google-fonts',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 30,
        maxAgeSeconds: 60 * 60 * 24 * 365, // 1 ano
      }),
    ],
  })
);

// Estratégia para API: NetworkFirst com fallback para cache
// Nunca interceptar rotas de autenticação ou requisições com cookies
registerRoute(
  ({ url, request }) => {
    // Não interceptar rotas de autenticação, deixe o navegador lidar com isso
    if (url.pathname.includes('/api/auth/')) {
      return false;
    }
    
    // Não interceptar requisições que tenham cookies de autenticação
    if (request.headers && request.headers.has('cookie') && 
        request.headers.get('cookie').includes('eurodent.sid')) {
      return false;
    }
    
    // Interceptar outras requisições de API
    return url.pathname.startsWith('/api/');
  },
  new NetworkFirst({
    cacheName: 'api-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 7 * 24 * 60 * 60, // 7 dias
      }),
    ],
  })
);

// Configuração de background sync para operações que modificam dados
// Aumentado para 48 horas (2 dias) conforme solicitado para sessões offline
const bgSyncPlugin = new BackgroundSyncPlugin('offline-mutations-queue', {
  maxRetentionTime: 48 * 60, // 48 horas em minutos
});

// Capturar e enfileirar requisições POST
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/') &&
               (self.navigator.onLine === false),
  new NetworkOnly({
    plugins: [bgSyncPlugin],
  }),
  'POST'
);

// Capturar e enfileirar requisições PUT
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/') &&
               (self.navigator.onLine === false),
  new NetworkOnly({
    plugins: [bgSyncPlugin],
  }),
  'PUT'
);

// Capturar e enfileirar requisições DELETE
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/') &&
               (self.navigator.onLine === false),
  new NetworkOnly({
    plugins: [bgSyncPlugin],
  }),
  'DELETE'
);

// Navegação: StaleWhileRevalidate para páginas
registerRoute(
  ({ request }) => request.mode === 'navigate',
  new StaleWhileRevalidate({
    cacheName: 'navigation',
  })
);

// Evento activate - limpar caches antigos
self.addEventListener('activate', (event) => {
  const cacheWhitelist = ['static-resources', 'images', 'google-fonts', 'api-cache', 'navigation'];
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Lidar com solicitações de skipWaiting do cliente
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
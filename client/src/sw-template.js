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
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
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
const bgSyncPlugin = new BackgroundSyncPlugin('offline-mutations-queue', {
  maxRetentionTime: 24 * 60, // 24 horas em minutos
});

// Estratégia para requisições que modificam dados (POST, PUT, DELETE)
registerRoute(
  ({ url, method }) => {
    return url.pathname.startsWith('/api/') && 
           ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method);
  },
  new NetworkFirst({
    plugins: [bgSyncPlugin],
    networkTimeoutSeconds: 3,
    cacheName: 'api-mutations',
    matchOptions: {
      ignoreVary: true
    },
    fetchOptions: {
      credentials: 'include'
    }
  })
);

// Estratégia para requisições GET da API
registerRoute(
  ({ url, method }) => url.pathname.startsWith('/api/') && method === 'GET',
  new NetworkFirst({
    cacheName: 'api-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 7 * 24 * 60 * 60, // 7 dias
      }),
    ],
    networkTimeoutSeconds: 3,
    matchOptions: {
      ignoreVary: true
    },
    fetchOptions: {
      credentials: 'include'
    }
  })
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
const CACHE_NAME = 'gerente-lavagem-v2-final';

// Instalação: ativa imediatamente sem esperar abas antigas
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Ativação: limpa imediatamente qualquer cache antigo (ex: v1)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Removendo cache antigo:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Interceptação de requisições:
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. NUNCA fazer cache de chamadas da API (/api/) - sempre rede direta para garantir dados sincronizados
  if (url.pathname.startsWith('/api')) {
    return;
  }

  // 2. Para requisições de navegação (HTML principal): SEMPRE REDE PRIMEIRO
  // Isso garante que após um deploy no Render o usuário sempre receba a versão mais recente
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(() => {
          // Se estiver totalmente sem internet, aí sim usa o cache
          return caches.match(event.request).then((cached) => cached || caches.match('/index.html'));
        })
    );
    return;
  }

  // 3. Para assets estáticos (js, css, imagens): Cache com atualização de rede
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Retorna o cache imediatamente mas atualiza em segundo plano
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => {});
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return networkResponse;
      });
    })
  );
});

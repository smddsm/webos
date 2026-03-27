/* ═══════════════════════════════════════════════════════════
   КиберОС — Service Worker v1.0
   Стратегия: Cache-First для самого файла,
              Network-First для всего остального
   ═══════════════════════════════════════════════════════════ */

const CACHE_NAME    = 'kiberos-v1';
const CORE_ASSETS   = [
  './',
  './KiberOS_v6-4.html',
  // если добавишь иконки/шрифты — допиши сюда
];

/* ─── Установка: кэшируем ядро ─────────────────────────── */
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())   // активируемся сразу
  );
});

/* ─── Активация: удаляем старые кэши ───────────────────── */
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

/* ─── Перехват запросов ─────────────────────────────────── */
self.addEventListener('fetch', e => {
  const { request } = e;

  // Только GET, blob: и chrome-extension: пропускаем
  if (request.method !== 'GET') return;
  if (!request.url.startsWith('http')) return;

  e.respondWith(
    caches.match(request).then(cached => {
      // Есть в кэше → отдаём сразу + обновляем в фоне (stale-while-revalidate)
      if (cached) {
        const refresh = fetch(request)
          .then(res => {
            if (res && res.status === 200) {
              caches.open(CACHE_NAME)
                .then(c => c.put(request, res.clone()));
            }
            return res;
          })
          .catch(() => {});   // офлайн — не страшно
        return cached;        // сразу отдаём кэшированное
      }

      // Нет в кэше → идём в сеть, кэшируем успешный ответ
      return fetch(request).then(res => {
        if (!res || res.status !== 200 || res.type === 'opaque') return res;
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(request, clone));
        return res;
      }).catch(() =>
        // Офлайн и нет в кэше → fallback на главную страницу
        caches.match('./')
      );
    })
  );
});

/* ─── Пуш-уведомления (задел на будущее) ───────────────── */
self.addEventListener('push', e => {
  const data = e.data?.json() ?? { title: 'КиберОС', body: 'Новое уведомление' };
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body:    data.body,
      icon:    data.icon    ?? './icon-192.png',
      badge:   data.badge   ?? './icon-96.png',
      vibrate: [100, 50, 100],
    })
  );
});

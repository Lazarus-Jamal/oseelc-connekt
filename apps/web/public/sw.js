const CACHE_NAME = 'oseelc-v1'

// Assets statiques à mettre en cache immédiatement
const PRECACHE = ['/offline.html', '/logo.png']

// ── Installation ──────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE).catch(() => {}))
  )
})

// ── Activation : nettoyage des anciens caches ─────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  )
})

// ── Fetch : stratégie hybride ─────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Ne pas intercepter les requêtes non-GET
  if (request.method !== 'GET') return

  // Ne pas cacher les appels API (données toujours fraîches)
  if (url.pathname.startsWith('/api/')) return

  // Ne pas cacher les routes d'auth NextAuth
  if (url.pathname.startsWith('/api/auth')) return

  // Cache-first pour les assets statiques Next.js (_next/static, icons, images publiques)
  const isStaticAsset =
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/uploads/') ||
    url.pathname === '/logo.png' ||
    url.pathname === '/favicon.ico'

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          }
          return response
        })
      })
    )
    return
  }

  // Network-first pour les pages (avec fallback offline si réseau indisponible)
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
        }
        return response
      })
      .catch(() =>
        caches.match(request).then((cached) => cached || caches.match('/offline.html'))
      )
  )
})

// ── Push notifications ────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return
  let data = {}
  try { data = event.data.json() } catch { data = { title: 'Oseelc-connekt', body: event.data.text() } }

  const { title = 'Oseelc-connekt', body = '', url = '/notifications', icon = '/icons/icon-192.png', badge = '/icons/icon-192.png' } = data

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge,
      data: { url },
      vibrate: [100, 50, 100],
      requireInteraction: false,
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/notifications'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      const existing = wins.find((w) => w.url.includes(url))
      if (existing) return existing.focus()
      return clients.openWindow(url)
    })
  )
})

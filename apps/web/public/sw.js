const CACHE_NAME = 'oseelc-v2'

const PRECACHE = ['/offline.html', '/shell.html', '/logo.png']

// Pages à mettre en cache dès que l'utilisateur est connecté
const APP_PAGES = [
  '/dashboard',
  '/declarations',
  '/declarations/new',
  '/expenses',
  '/expenses/new',
  '/statistics',
  '/statistics/new',
  '/messages',
]

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
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

// ── Message depuis l'app : pré-cacher les pages après login ───────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'PRECACHE_APP_PAGES') {
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) =>
        Promise.all(
          APP_PAGES.map((url) =>
            fetch(url, { credentials: 'include' })
              .then((res) => { if (res.ok && res.status === 200) cache.put(url, res) })
              .catch(() => {})
          )
        )
      )
    )
  }
})

// ── Fetch : stratégie hybride ─────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Ignorer les méthodes non-GET
  if (request.method !== 'GET') return

  // Ignorer les appels API (toujours frais) et auth
  if (url.pathname.startsWith('/api/')) return

  // Ignorer les requêtes RSC de Next.js (navigation client-side interne)
  if (url.searchParams.has('_rsc')) return
  if (request.headers.get('RSC') === '1') return
  if (request.headers.get('Next-Router-Prefetch') === '1') return

  // Assets statiques : cache-first
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
            caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()))
          }
          return response
        })
      })
    )
    return
  }

  // Pages de navigation : network-first avec fallback intelligent
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && response.status === 200) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
        }
        return response
      })
      .catch(async () => {
        // 1. Page exacte demandée
        const exact = await caches.match(request)
        if (exact) return exact

        // 2. Sans les query params
        const cleanUrl = url.origin + url.pathname
        const clean = await caches.match(cleanUrl)
        if (clean) return clean

        // 3. Pour les pages de saisie : servir le shell offline autonome
        const isFormPage =
          url.pathname.startsWith('/declarations') ||
          url.pathname.startsWith('/expenses') ||
          url.pathname.startsWith('/statistics') ||
          url.pathname.startsWith('/dashboard') ||
          url.pathname.startsWith('/messages') ||
          url.pathname.startsWith('/reports') ||
          url.pathname.startsWith('/budget') ||
          url.pathname.startsWith('/admin')
        if (isFormPage) {
          const shell = await caches.match('/shell.html')
          if (shell) return shell
        }

        // 4. Dernier recours
        return caches.match('/offline.html') || new Response('Hors ligne', { status: 503 })
      })
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
      body, icon, badge,
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

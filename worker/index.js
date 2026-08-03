// Custom service-worker logic injected into the PWA service worker by
// @ducanh2912/next-pwa (customWorkerSrc: "worker"). Handles incoming Web Push
// messages and notification clicks. Only active in a production build
// (next-pwa is disabled in development).

const STALE_RUNTIME_CACHES = new Set([
  'apis',
  'next-data',
  'pages',
  'pages-rsc',
  'pages-rsc-prefetch',
  'start-url',
])

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((cacheName) => STALE_RUNTIME_CACHES.has(cacheName))
            .map((cacheName) => caches.delete(cacheName))
        )
      )
  )
})

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { title: 'E-Report', body: event.data ? event.data.text() : '' }
  }

  const title = data.title || 'E-Report'
  const options = {
    body: data.body || '',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    tag: data.tag || undefined,
    renotify: Boolean(data.tag),
    data: { url: data.url || '/' },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const requestedUrl = (event.notification.data && event.notification.data.url) || '/'
  let targetUrl = '/'

  try {
    const parsedUrl = new URL(requestedUrl, self.location.origin)
    if (parsedUrl.origin === self.location.origin) {
      targetUrl = `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`
    }
  } catch {
    targetUrl = '/'
  }

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Focus an existing tab and navigate it if one is open.
        for (const client of clientList) {
          if ('focus' in client) {
            if ('navigate' in client) {
              client.navigate(targetUrl).catch(() => {})
            }
            return client.focus()
          }
        }
        // Otherwise open a new window.
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl)
        }
      })
  )
})

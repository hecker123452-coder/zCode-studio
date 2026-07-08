// ZCode Studio Service Worker
// Caches app shell for offline use

const CACHE_NAME = 'zcode-studio-v1'
const APP_SHELL = [
  '/',
  '/logo.svg',
  '/manifest.json',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const req = event.request

  // Skip non-GET requests
  if (req.method !== 'GET') return

  // Skip API requests (always go to network)
  if (req.url.includes('/api/')) return

  // Skip Supabase
  if (req.url.includes('supabase.co')) return

  // Skip Monaco CDN
  if (req.url.includes('cdn.jsdelivr.net')) return

  // Network-first for navigation, cache-first for assets
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const clone = res.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone))
          return res
        })
        .catch(() => caches.match(req).then((c) => c || caches.match('/')))
    )
  } else {
    event.respondWith(
      caches.match(req).then((cached) => {
        return (
          cached ||
          fetch(req).then((res) => {
            const clone = res.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone))
            return res
          })
        )
      })
    )
  }
})

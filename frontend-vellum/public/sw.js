/* Vellum · service worker
 * - Imágenes (portadas y páginas de capítulos): cache-first con límite -> releer sin gastar datos.
 * - Navegación: red primero; si falla, la última versión guardada o /offline.html.
 * - La API NO se cachea (datos de usuario y contadores en vivo). */
const IMG = 'vellum-img-v1'
const PAGES = 'vellum-pages-v1'
const MAX_IMG = 300

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(PAGES).then((c) => c.add('/offline.html')).then(() => self.skipWaiting()))
})
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => ![IMG, PAGES].includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

async function trim(cache) {
  const keys = await cache.keys()
  if (keys.length > MAX_IMG) await Promise.all(keys.slice(0, keys.length - MAX_IMG).map((k) => cache.delete(k)))
}

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)

  if (req.destination === 'image') {
    e.respondWith((async () => {
      const cache = await caches.open(IMG)
      const hit = await cache.match(req)
      if (hit) return hit
      try {
        const res = await fetch(req)
        if (res.ok || res.type === 'opaque') { cache.put(req, res.clone()).then(() => trim(cache)).catch(() => {}) }
        return res
      } catch (err) { return hit || Response.error() }
    })())
    return
  }

  if (req.mode === 'navigate' && url.origin === self.location.origin) {
    e.respondWith((async () => {
      try {
        const res = await fetch(req)
        // guardamos solo páginas de lectura/obra para releerlas sin conexión
        if (res.ok && /^\/(leer|obra)\//.test(url.pathname)) (await caches.open(PAGES)).put(req, res.clone())
        return res
      } catch {
        const cache = await caches.open(PAGES)
        return (await cache.match(req)) || (await cache.match('/offline.html')) || Response.error()
      }
    })())
  }
})

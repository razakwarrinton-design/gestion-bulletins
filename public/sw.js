const CACHE_NAME = "bulletins-v1";
const STATIC_ASSETS = ["/", "/index.html"];

// ── Installation ──────────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }),
  );
  self.skipWaiting();
});

// ── Activation ────────────────────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name)),
      );
    }),
  );
  self.clients.claim();
});

// ── Fetch : Network First avec fallback cache ─────────────────────────────────
self.addEventListener("fetch", (event) => {
  // Ignorer les requêtes non-GET et les requêtes API Supabase
  if (event.request.method !== "GET") return;
  if (event.request.url.includes("supabase.co")) return;
  if (event.request.url.includes("api.anthropic.com")) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Mettre en cache les nouvelles ressources
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // En cas d'absence de réseau, retourner depuis le cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          // Fallback vers la page d'accueil pour les navigations
          if (event.request.mode === "navigate") {
            return caches.match("/");
          }
          return new Response("Hors ligne", { status: 503 });
        });
      }),
  );
});

// ── Message handler ───────────────────────────────────────────────────────────
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Service worker for handling model loading requests
const CACHE_NAME = "daemon-assets-v1"; // Same as in assetPreloader.ts

self.addEventListener("install", (event) => {
  // console.log('[Model Worker] Installing...');
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  // console.log('[Model Worker] Activating...');
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  const path = url.pathname;

  if (path.includes("/models/drive.gltf") || path.includes("/program-parts/")) {
    // console.log(`[Model Worker] Intercepting model request for: ${path}`);

    if (path.endsWith(".meta")) {
      // console.log(
      //   `[Model Worker] Intentionally blocking .meta request for: ${path}`
      // );
      event.respondWith(
        new Response("Blocked by service worker to test default loading", {
          status: 404,
          statusText: "Not Found",
          headers: { "Content-Type": "text/plain" },
        }),
      );
      return;
    }

    if (path.endsWith(".bin")) {
      // For .bin files, also try cache-first as assetPreloader might not list them explicitly
      // but they are often fetched relative to the .gltf
      event.respondWith(
        caches.open(CACHE_NAME).then((cache) => {
          return cache.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
              // console.log(`[Model Worker] Serving ${path} from cache.`);
              return cachedResponse;
            }
            // console.log(
            //   `[Model Worker] ${path} not in cache, fetching from network.`,
            // );
            return fetch(event.request).then((networkResponse) => {
              if (networkResponse.ok) {
                // Cache the .bin file as well if fetched
                cache.put(event.request, networkResponse.clone());
              }
              return networkResponse;
            });
          });
        }),
      );
      return;
    }

    // For the .gltf file itself
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            // console.log(`[Model Worker] Serving ${path} from cache.`);
            return cachedResponse;
          }
          // console.log(
          //   `[Model Worker] ${path} not in cache, fetching from network.`,
          // );
          return fetch(event.request)
            .then((networkResponse) => {
              if (!networkResponse.ok) {
                throw new Error(
                  `[Model Worker] Failed to fetch ${path}: ${networkResponse.status} ${networkResponse.statusText}`,
                );
              }
              // Cache GLTF files (both drive and program parts)
              if (
                path === "/models/drive.gltf" ||
                path.includes("/program-parts/")
              ) {
                cache.put(event.request, networkResponse.clone());
              }
              return networkResponse;
            })
            .catch((error) => {
              console.error(`[Model Worker] Error fetching ${path}:`, error);
              return new Response(
                `Error loading from network: ${error.message}`,
                {
                  status: 500,
                  headers: { "Content-Type": "text/plain" },
                },
              );
            });
        });
      }),
    );
  }
});

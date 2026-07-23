const CACHE_NAME = "balai-crm-v21-superior";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./src/app.js",
  "./src/styles.css",
  "./src/japanese-theme.css",
  "./assets/balai-logo.png",
  "./assets/balai-final-emblem.svg",
  "./assets/balai-orbit-logo.png",
  "./manifest.webmanifest"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).catch(() => undefined));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).catch(() => caches.match("./index.html")))
  );
});

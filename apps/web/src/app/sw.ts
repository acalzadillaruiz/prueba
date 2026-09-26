/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { CacheFirst, ExpirationPlugin, NetworkFirst, NetworkOnly, Serwist, StaleWhileRevalidate } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}
declare const self: ServiceWorkerGlobalScope;

/**
 * New Place service worker (brief §11): app-shell + fonts cache-first, API network-first,
 * offline shell for home + saved. Auth routes are never cached.
 */
const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    { matcher: ({ url }) => url.pathname.startsWith("/api/auth"), handler: new NetworkOnly() },
    {
      matcher: ({ url, request }) => url.pathname.startsWith("/api/v1/") && request.method === "GET",
      handler: new NetworkFirst({ cacheName: "np-api", networkTimeoutSeconds: 6, plugins: [new ExpirationPlugin({ maxEntries: 120, maxAgeSeconds: 24 * 3600 })] }),
    },
    {
      matcher: ({ url }) => url.pathname.startsWith("/uploads/") || url.pathname.startsWith("/photos/") || url.pathname.startsWith("/icons/"),
      handler: new CacheFirst({ cacheName: "np-media", plugins: [new ExpirationPlugin({ maxEntries: 400, maxAgeSeconds: 30 * 24 * 3600 })] }),
    },
    {
      matcher: ({ url }) => url.origin === "https://fonts.gstatic.com" || url.origin === "https://fonts.googleapis.com",
      handler: new StaleWhileRevalidate({ cacheName: "np-fonts" }),
    },
    {
      matcher: ({ request }) => request.mode === "navigate",
      handler: new NetworkFirst({ cacheName: "np-pages", networkTimeoutSeconds: 5, plugins: [new ExpirationPlugin({ maxEntries: 60 })] }),
    },
    ...defaultCache,
  ],
  fallbacks: {
    entries: [{ url: "/es/offline", matcher: ({ request }) => request.destination === "document" }],
  },
});

// Warm the offline shell: home + saved in both locales.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open("np-pages").then((c) => Promise.all(["/es", "/en", "/es/saved", "/en/saved", "/es/offline"].map((u) => c.add(new Request(u, { credentials: "include" })).catch(() => undefined)))),
  );
});

serwist.addEventListeners();

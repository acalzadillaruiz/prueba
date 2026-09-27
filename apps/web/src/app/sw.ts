/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig, SerwistPlugin } from "serwist";
import { CacheFirst, ExpirationPlugin, NetworkFirst, NetworkOnly, Serwist, StaleWhileRevalidate } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}
declare const self: ServiceWorkerGlobalScope;

/**
 * New Place service worker (brief §11).
 * - Only PUBLIC content is ever cached (pages, listings API, media). Private areas and user APIs are network-only,
 *   and the app clears runtime caches on sign-out, so nothing personal survives on a shared device.
 * - Offline fallback: static /offline/{es,en} pages, precached at build time.
 * - Updates wait for the user ("Nueva versión disponible") instead of swapping code under open tabs.
 */
const PRIVATE_PAGE = /^\/(es|en)\/(agency|platform|account|owner|app|saved|alerts|login|register)(\/|$)/;
const PUBLIC_API = /^\/api\/v1\/(listings(\/[^/]+(\/slots)?)?|fx)$/;

/** Never store redirects (e.g. auth redirects) or errors. */
const okOnly: SerwistPlugin = {
  cacheWillUpdate: async ({ response }) => (response.ok && !response.redirected && response.type !== "opaqueredirect" ? response : null),
};

const STATIC_DEFAULTS = ["static-font-assets", "static-image-assets", "next-static-js-assets", "next-image", "static-js-assets", "static-style-assets", "static-audio-assets", "static-video-assets"];
const staticDefaults = defaultCache.filter((r: RuntimeCaching) => STATIC_DEFAULTS.includes((r.handler as { cacheName?: string }).cacheName ?? ""));

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: false,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    { matcher: ({ url }) => url.pathname.startsWith("/api/auth"), handler: new NetworkOnly() },
    {
      matcher: ({ url, request, sameOrigin }) => sameOrigin && request.method === "GET" && PUBLIC_API.test(url.pathname),
      handler: new NetworkFirst({ cacheName: "np-api", networkTimeoutSeconds: 6, plugins: [okOnly, new ExpirationPlugin({ maxEntries: 120, maxAgeSeconds: 24 * 3600 })] }),
    },
    { matcher: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith("/api/"), handler: new NetworkOnly() },
    {
      matcher: ({ url, sameOrigin }) => sameOrigin && (url.pathname.startsWith("/uploads/") || url.pathname.startsWith("/photos/")),
      handler: new StaleWhileRevalidate({ cacheName: "np-media", plugins: [okOnly, new ExpirationPlugin({ maxEntries: 400, maxAgeSeconds: 30 * 24 * 3600 })] }),
    },
    { matcher: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith("/icons/"), handler: new CacheFirst({ cacheName: "np-icons", plugins: [okOnly] }) },
    { matcher: ({ request, url }) => request.mode === "navigate" && PRIVATE_PAGE.test(url.pathname), handler: new NetworkOnly() },
    {
      matcher: ({ request }) => request.mode === "navigate",
      handler: new NetworkFirst({ cacheName: "np-pages", networkTimeoutSeconds: 5, plugins: [okOnly, new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 7 * 24 * 3600 })] }),
    },
    ...staticDefaults,
  ],
  fallbacks: {
    entries: [
      { url: "/offline/en", matcher: ({ request }) => request.destination === "document" && new URL(request.url).pathname.startsWith("/en") },
      { url: "/offline/es", matcher: ({ request }) => request.destination === "document" },
    ],
  },
});

// The page asks the waiting worker to take over once the user accepts the update.
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") void self.skipWaiting();
});

serwist.addEventListeners();

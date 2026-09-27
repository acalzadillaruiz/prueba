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
// `preview` = authenticated preview of unpublished listings (drafts, under review, taken down): never cached.
const PRIVATE_PAGE = /^\/(es|en)\/(agency|platform|account|owner|app|saved|alerts|login|register|preview)(\/|$)/;
const PUBLIC_API = /^\/api\/v1\/(listings(\/[^/]+(\/slots)?)?|fx)$/;

/** Never store redirects (e.g. auth redirects) or errors. */
const okOnly: SerwistPlugin = {
  cacheWillUpdate: async ({ response }) => (response.ok && !response.redirected && response.type !== "opaqueredirect" ? response : null),
};

/**
 * GET /api/v1/listings/:id also answers staff with unpublished listings (drafts, under review, taken down):
 * only published + approved ones may be stored on the device.
 */
const PUBLISHED = ["COMING_SOON", "ACTIVE", "UNDER_OFFER", "SOLD", "RENTED"];
const publicListingOnly: SerwistPlugin = {
  cacheWillUpdate: async ({ request, response }) => {
    if (!/^\/api\/v1\/listings\/[^/]+$/.test(new URL(request.url).pathname)) return response;
    try {
      const l = (await response.clone().json()) as { status?: string; review?: string };
      return l && PUBLISHED.includes(l.status ?? "") && l.review === "APPROVED" ? response : null;
    } catch {
      return null;
    }
  },
};

const STATIC_DEFAULTS = ["static-font-assets", "static-image-assets", "next-static-js-assets", "next-image", "static-js-assets", "static-style-assets", "static-audio-assets", "static-video-assets"];
const staticDefaults = defaultCache.filter((r: RuntimeCaching) => STATIC_DEFAULTS.includes((r.handler as { cacheName?: string }).cacheName ?? ""));

const serwist: Serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: false,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    { matcher: ({ url }) => url.pathname.startsWith("/api/auth"), handler: new NetworkOnly() },
    {
      // Anything a private page loads (photos of unpublished listings in the back-office, avatars…) is never stored.
      matcher: ({ request, sameOrigin }) => sameOrigin && request.mode !== "navigate" && !!request.referrer && PRIVATE_PAGE.test(new URL(request.referrer).pathname),
      handler: new NetworkOnly(),
    },
    {
      matcher: ({ url, request, sameOrigin }) => sameOrigin && request.method === "GET" && PUBLIC_API.test(url.pathname),
      handler: new NetworkFirst({ cacheName: "np-api", networkTimeoutSeconds: 6, plugins: [okOnly, publicListingOnly, new ExpirationPlugin({ maxEntries: 120, maxAgeSeconds: 24 * 3600 })] }),
    },
    { matcher: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith("/api/"), handler: new NetworkOnly() },
    {
      matcher: ({ url, sameOrigin }) => sameOrigin && (url.pathname.startsWith("/uploads/") || url.pathname.startsWith("/photos/")),
      handler: new StaleWhileRevalidate({ cacheName: "np-media", plugins: [okOnly, new ExpirationPlugin({ maxEntries: 400, maxAgeSeconds: 30 * 24 * 3600 })] }),
    },
    { matcher: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith("/icons/"), handler: new CacheFirst({ cacheName: "np-icons", plugins: [okOnly] }) },
    { matcher: ({ request, url }) => request.mode === "navigate" && PRIVATE_PAGE.test(url.pathname), handler: new NetworkOnly() },
    {
      // The installed app starts at "/" (start_url), which the server redirects to /es or /en: redirects are never
      // cached, so offline it would always land on the offline page. Serve the cached home in the device language.
      matcher: ({ request, url, sameOrigin }) => sameOrigin && request.mode === "navigate" && url.pathname === "/",
      handler: async ({ request, event }): Promise<Response> => {
        try {
          const preloaded = await (event as FetchEvent).preloadResponse;
          return (preloaded as Response | undefined) ?? (await fetch(request));
        } catch {
          const lang = self.navigator.language?.toLowerCase().startsWith("en") ? "en" : "es";
          const cached = (await caches.match(`/${lang}`, { cacheName: "np-pages" })) ?? (await caches.match(`/${lang === "en" ? "es" : "en"}`, { cacheName: "np-pages" }));
          return cached ?? (await serwist.matchPrecache(`/offline/${lang}`)) ?? Response.error();
        }
      },
    },
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

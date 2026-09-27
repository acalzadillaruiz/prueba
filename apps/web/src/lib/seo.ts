import type { Metadata } from "next";
import type { Locale } from "@/types/domain";

/**
 * Canonical origin, first match wins: APP_URL (server-only, read at runtime and at build) → NEXT_PUBLIC_APP_URL →
 * Vercel's production domain → the deployment's own Vercel URL → localhost. Static pages (sitemap, robots, ISR
 * canonicals) bake this in at build time, so a production build without any of them warns loudly.
 */
export function resolveSiteUrl(env: Record<string, string | undefined> = process.env): { url: string; fallback: boolean } {
  const url =
    env.APP_URL ||
    env.NEXT_PUBLIC_APP_URL ||
    (env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}` : "") ||
    (env.VERCEL_URL ? `https://${env.VERCEL_URL}` : "");
  return { url: (url || "http://localhost:3000").replace(/\/$/, ""), fallback: !url };
}

const site = resolveSiteUrl();
if (site.fallback && process.env.NODE_ENV === "production" && typeof window === "undefined") {
  console.warn(
    "[seo] APP_URL is not set (nor NEXT_PUBLIC_APP_URL / VERCEL_*): sitemap, robots and canonical URLs will point to http://localhost:3000. Set APP_URL at build and runtime.",
  );
}
export const SITE_URL = site.url;

/** Canonical + hreflang for a locale-independent path ("/search?type=SALE", "/luxury", ""). */
export function alternates(locale: Locale, path: string): Metadata["alternates"] {
  return { canonical: `/${locale}${path}`, languages: { es: `/es${path}`, en: `/en${path}`, "x-default": `/es${path}` } };
}

type PageMetaOpts = { index?: boolean; description?: string };

/** Shared Open Graph fields: a page-level `openGraph` replaces the layout's whole object (no deep merge). */
export const ogBase = (locale: Locale) => ({ type: "website" as const, siteName: "New Place", locale: locale === "es" ? "es_VE" : "en_US" });
export const OG_IMAGE = { url: "/icons/og.png", width: 1200, height: 630, alt: "New Place" };

export function pageMeta(locale: Locale, title: string, path: string, opts: PageMetaOpts = {}): Metadata {
  const description = opts.description ? { description: opts.description } : {};
  return {
    title,
    ...description,
    alternates: alternates(locale, path),
    openGraph: { ...ogBase(locale), title, url: `/${locale}${path}`, ...description, images: [OG_IMAGE] },
    twitter: { card: "summary_large_image", title, ...description, images: [OG_IMAGE.url] },
    ...(opts.index === false ? { robots: { index: false, follow: false } } : {}),
  };
}

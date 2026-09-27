import type { Metadata } from "next";
import type { Locale } from "@/types/domain";

/**
 * Canonical origin. Server-only APP_URL is read at runtime (not inlined at build), then Vercel's production
 * domain, then the public build-time URL.
 */
export const SITE_URL = (
  process.env.APP_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "") ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "http://localhost:3000"
).replace(/\/$/, "");

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

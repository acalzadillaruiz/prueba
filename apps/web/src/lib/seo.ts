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

export function pageMeta(locale: Locale, title: string, path: string, opts: PageMetaOpts = {}): Metadata {
  return {
    title,
    ...(opts.description ? { description: opts.description } : {}),
    alternates: alternates(locale, path),
    openGraph: { title, url: `/${locale}${path}`, ...(opts.description ? { description: opts.description } : {}) },
    ...(opts.index === false ? { robots: { index: false, follow: false } } : {}),
  };
}

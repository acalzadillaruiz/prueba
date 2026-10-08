import type { Metadata } from "next";
import type { Locale } from "@/types/domain";

/** Public production origin, used when a production build/runtime has no APP_URL configured. */
export const PRODUCTION_FALLBACK_URL = "https://newplace.site";

/**
 * Canonical origin, first match wins: APP_URL (server-only, read at runtime and at build) → NEXT_PUBLIC_APP_URL →
 * Vercel's production domain → the deployment's own Vercel URL → (production) https://newplace.site, or
 * (development/test only) http://localhost:3000. A production origin must never be localhost: canonicals, hreflang,
 * sitemap and robots pointing there would deindex the site. Static pages bake this in at build time.
 */
export function resolveSiteUrl(env: Record<string, string | undefined> = process.env): { url: string; fallback: boolean } {
  const url =
    env.APP_URL ||
    env.NEXT_PUBLIC_APP_URL ||
    (env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}` : "") ||
    (env.VERCEL_URL ? `https://${env.VERCEL_URL}` : "");
  const fallbackUrl = env.NODE_ENV === "production" ? PRODUCTION_FALLBACK_URL : "http://localhost:3000";
  return { url: (url || fallbackUrl).replace(/\/$/, ""), fallback: !url };
}

const site = resolveSiteUrl();
const g = globalThis as { __npSeoWarned?: boolean };
if (site.fallback && process.env.NODE_ENV === "production" && typeof window === "undefined" && !g.__npSeoWarned) {
  g.__npSeoWarned = true; // once per process (this module is evaluated in several bundles)
  console.error(
    `[seo] APP_URL is not set (nor NEXT_PUBLIC_APP_URL / VERCEL_*): canonical, hreflang, Open Graph, sitemap and robots URLs fall back to ${site.url}. Set APP_URL at build and runtime.`,
  );
}
export const SITE_URL = site.url;

/** Meta description: whitespace collapsed, cut at a word boundary (≤ max chars incl. the ellipsis). */
export function metaDescription(text: string, max = 155): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  const base = space > max * 0.6 ? cut.slice(0, space) : cut;
  return `${base.replace(/[\s,;:·.\-–—]+$/, "")}…`;
}

/** Fixes "1 baños" / "1 bathrooms" style counts in free text (lister/seed copy) used for meta and structured data. */
export function fixCountGrammar(text: string): string {
  const one: [RegExp, string][] = [
    [/\b1 baños\b/g, "1 baño"],
    [/\b1 habitaciones\b/g, "1 habitación"],
    [/\b1 puestos\b/g, "1 puesto"],
    [/\b1 bathrooms\b/g, "1 bathroom"],
    [/\b1 bedrooms\b/g, "1 bedroom"],
    [/\b1 parking spaces\b/g, "1 parking space"],
  ];
  return one.reduce((s, [re, to]) => s.replace(re, to), text);
}

/** Canonical + hreflang for a locale-independent path ("/search?type=SALE", "/luxury", ""). */
export function alternates(locale: Locale, path: string): Metadata["alternates"] {
  return { canonical: `/${locale}${path}`, languages: { es: `/es${path}`, en: `/en${path}`, "x-default": `/es${path}` } };
}

type PageMetaOpts = { index?: boolean; description?: string };

/** Shared Open Graph fields: a page-level `openGraph` replaces the layout's whole object (no deep merge). */
export const ogBase = (locale: Locale) => ({ type: "website" as const, siteName: "New Place", locale: locale === "es" ? "es_VE" : "en_US" });
export const OG_IMAGE = { url: "/icons/og.jpg", width: 1200, height: 630, alt: "New Place", type: "image/jpeg" };

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

/** JSON-LD payload safe to inline in a <script> (no "</script>" breakout). */
export function jsonLdHtml(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

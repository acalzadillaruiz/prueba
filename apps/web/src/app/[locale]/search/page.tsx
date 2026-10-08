import { Suspense } from "react";
import type { Locale } from "@/types/domain";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { CompareTray } from "@/components/compare/CompareTray";
import { MobileTabBar } from "@/components/brand/PublicChrome";
import { SearchView, type ZoneGroup } from "@/components/search/SearchView";
import { filtersFromParams, searchListings } from "@/server/listings";
import { prisma } from "@newplace/db";
import { pageMeta } from "@/lib/seo";

export const dynamic = "force-dynamic";

const SEARCH_TITLE: Record<string, [string, string]> = {
  SALE: ["Casas y apartamentos en venta", "Homes for sale"],
  LONG_RENT: ["Casas y apartamentos en alquiler", "Homes for rent"],
  SHORT_RENT: ["Alquiler vacacional", "Holiday rentals"],
  COMMERCIAL: ["Locales y espacios comerciales", "Commercial spaces"],
};

export async function generateMetadata({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<Record<string, string>> }) {
  const { locale } = await params;
  const sp = await searchParams;
  const type = SEARCH_TITLE[sp.type ?? "SALE"] ? (sp.type ?? "SALE") : "SALE";
  const [es, en] = SEARCH_TITLE[type];
  const where = sp.zone ? ` · ${sp.zone}` : "";
  return pageMeta(locale, (locale === "es" ? es : en) + where, `/search?type=${type}${sp.zone ? `&zone=${encodeURIComponent(sp.zone)}` : ""}`, {
    description: locale === "es" ? `${es} en Venezuela, sobre el mapa, con precios verificados y lo que vale cada una según PlaceEstimate.` : `${en} in Venezuela, on the map, with verified prices and what each one is really worth, by PlaceEstimate.`,
  });
}

// Cities people look for first; the rest follow alphabetically.
const CITY_ORDER = ["Caracas", "Lechería", "Isla de Margarita"];

/** Distinct (zone, city) pairs → one group per city, cities in a stable order, zones alphabetical. */
function groupZones(rows: { zone: string; city: string }[]): ZoneGroup[] {
  const byCity = new Map<string, Set<string>>();
  for (const { zone, city } of rows) {
    const c = city?.trim();
    if (!c) continue;
    const set = byCity.get(c) ?? new Set<string>();
    const z = zone?.trim();
    if (z && z.toLowerCase() !== c.toLowerCase()) set.add(z);
    byCity.set(c, set);
  }
  const rank = (c: string) => {
    const i = CITY_ORDER.indexOf(c);
    return i === -1 ? CITY_ORDER.length : i;
  };
  return [...byCity.entries()]
    .sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b, "es"))
    .map(([city, zones]) => ({ city, zones: [...zones].sort((a, b) => a.localeCompare(b, "es")) }));
}

export default async function SearchPage({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<Record<string, string>> }) {
  const { locale } = await params;
  const sp = new URLSearchParams(await searchParams);
  if (!sp.get("type")) sp.set("type", "SALE");
  const [initial, zones] = await Promise.all([searchListings(filtersFromParams(sp)), prisma.listing.findMany({ where: { status: { in: ["ACTIVE", "COMING_SOON", "UNDER_OFFER"] } }, distinct: ["zone", "city"], select: { zone: true, city: true } })]);
  return (
    <div className="np-public">
      <PublicHeader locale={locale} />
      <main id="main">
      <h1 className="sr-only">{locale === "es" ? "Busca tu próxima casa" : "Find your next home"}</h1>
      <Suspense>
        <SearchView locale={locale} initial={{ items: initial.items, total: initial.total }} zones={groupZones(zones)} />
      </Suspense>
      </main>
      <CompareTray locale={locale} />
      {/* Phones: the bottom tab bar stays on search too (SearchView leaves room for it). */}
      <MobileTabBar locale={locale} />
    </div>
  );
}

import { Suspense } from "react";
import type { Locale } from "@/types/domain";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { SearchView } from "@/components/search/SearchView";
import { filtersFromParams, searchListings } from "@/server/listings";
import { prisma } from "@newplace/db";
import { pageMeta } from "@/lib/seo";

export const dynamic = "force-dynamic";

const SEARCH_TITLE: Record<string, [string, string]> = {
  SALE: ["Inmuebles en venta", "Homes for sale"],
  LONG_RENT: ["Inmuebles en alquiler", "Homes for rent"],
  SHORT_RENT: ["Alquiler vacacional", "Vacation rentals"],
  COMMERCIAL: ["Inmuebles comerciales", "Commercial property"],
};

export async function generateMetadata({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<Record<string, string>> }) {
  const { locale } = await params;
  const sp = await searchParams;
  const type = SEARCH_TITLE[sp.type ?? "SALE"] ? (sp.type ?? "SALE") : "SALE";
  const [es, en] = SEARCH_TITLE[type];
  const where = sp.zone ? ` · ${sp.zone}` : "";
  return pageMeta(locale, (locale === "es" ? es : en) + where, `/search?type=${type}${sp.zone ? `&zone=${encodeURIComponent(sp.zone)}` : ""}`, {
    description: locale === "es" ? `${es} en Venezuela con mapa, precios verificados y PlaceEstimate.` : `${en} in Venezuela with map, verified prices and PlaceEstimate.`,
  });
}

export default async function SearchPage({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<Record<string, string>> }) {
  const { locale } = await params;
  const sp = new URLSearchParams(await searchParams);
  if (!sp.get("type")) sp.set("type", "SALE");
  const [initial, zones] = await Promise.all([searchListings(filtersFromParams(sp)), prisma.listing.findMany({ where: { status: "ACTIVE" }, distinct: ["zone"], select: { zone: true }, orderBy: { zone: "asc" } })]);
  return (
    <div className="np-public">
      <PublicHeader locale={locale} />
      <main id="main">
      <h1 className="sr-only">{locale === "es" ? "Buscar inmuebles" : "Search properties"}</h1>
      <Suspense>
        <SearchView locale={locale} initial={{ items: initial.items, total: initial.total }} zones={zones.map((z) => z.zone)} />
      </Suspense>
      </main>
    </div>
  );
}

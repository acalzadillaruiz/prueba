import { Suspense } from "react";
import type { Locale } from "@/types/domain";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { SearchView } from "@/components/search/SearchView";
import { filtersFromParams, searchListings } from "@/server/listings";
import { prisma } from "@newplace/db";

export const dynamic = "force-dynamic";

export default async function SearchPage({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<Record<string, string>> }) {
  const { locale } = await params;
  const sp = new URLSearchParams(await searchParams);
  if (!sp.get("type")) sp.set("type", "SALE");
  const [initial, zones] = await Promise.all([searchListings(filtersFromParams(sp)), prisma.listing.findMany({ where: { status: "ACTIVE" }, distinct: ["zone"], select: { zone: true }, orderBy: { zone: "asc" } })]);
  return (
    <>
      <PublicHeader locale={locale} />
      <Suspense>
        <SearchView locale={locale} initial={{ items: initial.items, total: initial.total }} zones={zones.map((z) => z.zone)} />
      </Suspense>
    </>
  );
}

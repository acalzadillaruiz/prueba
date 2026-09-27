import "server-only";
import { prisma, type Prisma } from "@newplace/db";
import { CLASS_FACTOR, kindClass, kindsOfClass, type EstimateResult } from "@newplace/ai";
import { aiProvider } from "./ai";

export type EstimateArgs = {
  kind: string;
  listingType: string;
  zone: string;
  city?: string;
  areaM2: number;
  beds: number;
  baths: number;
  parking: number;
  yearBuilt: number;
  amenities: string[];
  luxury: boolean;
  lat?: number | null;
  lng?: number | null;
  excludeId?: string;
};

export async function estimateFor(a: EstimateArgs): Promise<{ provider: string; estimate: EstimateResult; poolSize: number }> {
  const zone = await prisma.zone.findUnique({ where: { name: a.zone } });
  const group = a.listingType === "SALE" || a.listingType === "COMMERCIAL_SALE" ? "sale" : a.listingType === "SHORT_RENT" ? "short" : "rent";
  const types = group === "sale" ? ["SALE", "COMMERCIAL_SALE"] : group === "short" ? ["SHORT_RENT"] : ["LONG_RENT", "COMMERCIAL_RENT"];
  const cls = kindClass(a.kind);
  const pool = await prisma.listing.findMany({
    where: {
      ...(a.excludeId ? { id: { not: a.excludeId } } : {}),
      city: a.city ?? zone?.city ?? "Caracas",
      listingType: { in: types as Prisma.EnumListingTypeFilter["in"] },
      kind: { in: kindsOfClass(cls) },
      ...(cls === "residential" ? { luxury: a.luxury } : {}),
      status: { in: ["ACTIVE", "UNDER_OFFER", "SOLD", "RENTED"] },
    },
    select: { id: true, titleEs: true, zone: true, areaM2: true, priceAmount: true, lat: true, lng: true },
    take: 60,
  });
  const base = zone ? (group === "sale" ? zone.salePpm : group === "short" ? zone.rentPpm * 0.075 : zone.rentPpm) : 1000;
  const provider = await aiProvider();
  const land = cls === "land";
  const estimate = await provider.estimate({
    zone: a.zone,
    zonePricePerM2: base * CLASS_FACTOR[cls],
    areaM2: a.areaM2,
    beds: land ? 0 : a.beds,
    baths: land ? 0 : a.baths,
    parking: land ? 0 : a.parking,
    yearBuilt: land ? 2016 : a.yearBuilt,
    amenities: land ? [] : a.amenities,
    luxury: a.luxury,
    lat: a.lat ?? zone?.lat ?? 10.48,
    lng: a.lng ?? zone?.lng ?? -66.9,
    pool: pool.map((p) => ({ id: p.id, title: p.titleEs, zone: p.zone, areaM2: p.areaM2, priceAmount: p.priceAmount, lat: p.lat, lng: p.lng })),
  });
  return { provider: provider.id, estimate, poolSize: pool.length };
}

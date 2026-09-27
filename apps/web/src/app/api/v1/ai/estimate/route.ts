import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@newplace/db";
import { body, handler, ok } from "@/server/api";
import { aiProvider } from "@/server/ai";
import { limit } from "@/server/rate-limit";

const Input = z.object({
  zone: z.string(),
  listingType: z.enum(["SALE", "LONG_RENT", "SHORT_RENT", "COMMERCIAL_SALE", "COMMERCIAL_RENT"]).default("SALE"),
  areaM2: z.number().positive(),
  beds: z.number().int().min(0).default(0),
  baths: z.number().int().min(0).default(0),
  parking: z.number().int().min(0).default(0),
  yearBuilt: z.number().int().default(2005),
  amenities: z.array(z.string()).default([]),
  luxury: z.boolean().default(false),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

/** Live PlaceEstimate for the owner wizard (no listing yet). */
export const POST = handler(async (req: NextRequest) => {
  await limit(req, "ai-estimate", 60, 60);
  const b = await body(req, Input);
  const zone = await prisma.zone.findUnique({ where: { name: b.zone } });
  const sale = b.listingType === "SALE" || b.listingType === "COMMERCIAL_SALE";
  const pool = await prisma.listing.findMany({
    where: { city: zone?.city ?? "Caracas", listingType: { in: sale ? ["SALE", "COMMERCIAL_SALE"] : ["LONG_RENT", "COMMERCIAL_RENT", "SHORT_RENT"] }, luxury: b.luxury, kind: { not: "land" }, status: { in: ["ACTIVE", "UNDER_OFFER", "SOLD"] } },
    select: { id: true, titleEs: true, zone: true, areaM2: true, priceAmount: true, lat: true, lng: true },
    take: 60,
  });
  const p = await aiProvider();
  const est = await p.estimate({
    zone: b.zone,
    zonePricePerM2: zone ? (sale ? zone.salePpm : zone.rentPpm) : 1000,
    areaM2: b.areaM2,
    beds: b.beds,
    baths: b.baths,
    parking: b.parking,
    yearBuilt: b.yearBuilt,
    amenities: b.amenities,
    luxury: b.luxury,
    lat: b.lat ?? zone?.lat ?? 10.48,
    lng: b.lng ?? zone?.lng ?? -66.9,
    pool: pool.map((x) => ({ id: x.id, title: x.titleEs, zone: x.zone, areaM2: x.areaM2, priceAmount: x.priceAmount, lat: x.lat, lng: x.lng })),
  });
  return ok({ provider: p.id, estimate: est });
});

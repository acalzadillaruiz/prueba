import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@newplace/db";
import { ApiError, body, currentUser, handler, ok, requireUser } from "@/server/api";
import { isManager } from "@/server/access";
import { aiProvider } from "@/server/ai";
import { audit } from "@/server/data";
import { PROPERTY_KINDS } from "@newplace/config";
import { findDuplicate, fingerprintOf, qualityOf, scenesFor, slugify, snapshotEstimate, uniqueSlug } from "@/server/listing-service";

type Ctx = { params: Promise<{ id: string }> };

const Convert = z.object({ listingType: z.enum(["SALE", "LONG_RENT", "SHORT_RENT", "COMMERCIAL_SALE", "COMMERCIAL_RENT"]).default("SALE") });

/** "Convertir en inmueble": a PENDING capture becomes a DRAFT listing of the same agency (managers only). */
export const POST = handler(async (req: NextRequest, { params }: Ctx) => {
  const { id } = await params;
  const u = requireUser(await currentUser());
  if (!isManager(u) && u.role !== "SUPERADMIN") throw new ApiError("FORBIDDEN");
  const c = await prisma.captureLead.findUnique({ where: { id } });
  if (!c) throw new ApiError("NOT_FOUND");
  if (u.role !== "SUPERADMIN" && c.agencyId !== u.agencyId) throw new ApiError("FORBIDDEN");
  if (c.result !== "PENDING" || c.listingId) throw new ApiError("CONFLICT", { result: c.result, listingId: c.listingId });
  const b = await body(req, Convert);

  const zone = await prisma.zone.findUnique({ where: { name: c.zone } });
  if (!zone) throw new ApiError("VALIDATION", { zone: "unknown zone" });
  const lat = c.lat ?? zone.lat;
  const lng = c.lng ?? zone.lng;
  // One listing = one physical unit: a listing may have been published since the capture was logged.
  const dup = await findDuplicate(lat, lng, c.areaM2, c.address);
  if (dup) throw new ApiError("CONFLICT", { duplicateOf: { id: dup.id, slug: dup.slug, title: dup.titleEs } });

  const kind = (PROPERTY_KINDS as readonly string[]).includes(c.kind) ? c.kind : "apartment";
  const copy = await (await aiProvider()).writeListing({ kind, zone: zone.name, city: zone.city, areaM2: c.areaM2, beds: 0, baths: 0, parking: 0, amenities: [] });
  const category = kind === "land" ? "LAND" : b.listingType.startsWith("COMMERCIAL") ? "COMMERCIAL" : "RESIDENTIAL";
  const fp = fingerprintOf(lat, lng, c.areaM2, c.address);
  const slug = await uniqueSlug(`${slugify(zone.name)}-${kind}-${c.areaM2}m-${Math.random().toString(36).slice(2, 8)}`);

  const listing = await prisma.$transaction(async (tx) => {
    const l = await tx.listing.create({
      data: {
        slug,
        titleEs: copy.title_es,
        titleEn: copy.title_en,
        bodyEs: copy.body_es,
        bodyEn: copy.body_en,
        address: c.address,
        zone: zone.name,
        city: zone.city,
        state: zone.state,
        lat,
        lng,
        kind,
        listingType: b.listingType,
        category,
        priceAmount: c.askingPrice,
        pricePeriod: b.listingType === "SHORT_RENT" ? "night" : b.listingType.includes("RENT") ? "month" : null,
        areaM2: c.areaM2,
        yearBuilt: new Date().getFullYear(),
        amenities: [],
        status: "DRAFT",
        review: "APPROVED",
        agencyId: c.agencyId,
        scenes: scenesFor(kind, false),
        fingerprint: fp,
        quality: qualityOf({ photos: 0, titleEn: copy.title_en, bodyEn: copy.body_en, lat, hasFloorplan: false, hasVirtualTour: false }),
        priceHistory: { create: { amount: c.askingPrice, kind: "LISTED" } },
        fingerprints: { create: { fingerprint: fp } },
      },
    });
    // Guarded update: two managers converting at once → only one wins, the other rolls back with 409.
    const n = await tx.captureLead.updateMany({ where: { id, result: "PENDING", listingId: null }, data: { result: "CAPTURED", listingId: l.id } });
    if (n.count !== 1) throw new ApiError("CONFLICT", { capture: "already converted" });
    return l;
  });
  await snapshotEstimate(listing.id);
  await audit(u.id, "capture.convert", c.address, { listingId: listing.id, title: listing.titleEs });
  return ok({ id: listing.id, slug: listing.slug, title_es: listing.titleEs, title_en: listing.titleEn }, 201);
});

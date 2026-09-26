import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@newplace/db";
import { ApiError, body, currentUser, handler, ok, requireUser } from "@/server/api";
import { filtersFromParams, listingById, searchListings } from "@/server/listings";
import { draftCopy, findDuplicate, fingerprintOf, notifySavedSearches, qualityOf, scenesFor, slugify, snapshotEstimate, uniqueSlug } from "@/server/listing-service";
import { audit } from "@/server/data";
import { isStaff } from "@/server/access";

export const GET = handler(async (req: NextRequest) => {
  const f = filtersFromParams(req.nextUrl.searchParams);
  const res = await searchListings(f);
  // impressions (Rightmove-style performance stats)
  if (res.items.length) prisma.listing.updateMany({ where: { id: { in: res.items.slice(0, 40).map((l) => l.id) } }, data: { impressions: { increment: 1 } } }).catch(() => {});
  return ok(res);
});

const CreateSchema = z.object({
  mode: z.enum(["FSBO", "AGENCY", "MANDATE"]).default("FSBO"),
  agencyId: z.string().optional(),
  listingType: z.enum(["SALE", "LONG_RENT", "SHORT_RENT", "COMMERCIAL_SALE", "COMMERCIAL_RENT"]),
  kind: z.enum(["apartment", "penthouse", "house", "townhouse", "studio", "office", "retail", "warehouse", "land", "villa", "chalet"]),
  address: z.string().min(5).max(200),
  zone: z.string().min(2),
  city: z.string().min(2),
  state: z.string().default(""),
  countryCode: z.string().length(2).default("VE"),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  areaM2: z.number().int().positive().max(1_000_000),
  plotM2: z.number().int().positive().optional(),
  beds: z.number().int().min(0).max(30).default(0),
  baths: z.number().int().min(0).max(30).default(0),
  parking: z.number().int().min(0).max(50).default(0),
  yearBuilt: z.number().int().min(1800).max(2100).default(new Date().getFullYear()),
  amenities: z.array(z.string()).default([]),
  priceAmount: z.number().int().positive(),
  title_es: z.string().max(120).optional(),
  title_en: z.string().max(120).optional(),
  body_es: z.string().max(4000).optional(),
  body_en: z.string().max(4000).optional(),
  luxury: z.boolean().default(false),
  privateListing: z.boolean().default(false),
  agentId: z.string().optional(),
  publish: z.boolean().default(true),
});

export const POST = handler(async (req: NextRequest) => {
  const u = requireUser(await currentUser());
  const b = await body(req, CreateSchema);
  if (b.mode === "FSBO" && u.role !== "OWNER_PRIVATE" && u.role !== "SEEKER" && u.role !== "SUPERADMIN") throw new ApiError("FORBIDDEN");
  if (b.mode === "AGENCY" && !(isStaff(u) && u.role !== "CAPTOR" && u.role !== "PHOTOGRAPHER") && u.role !== "SUPERADMIN") throw new ApiError("FORBIDDEN");
  if (b.mode === "MANDATE" && !b.agencyId) throw new ApiError("VALIDATION", { agencyId: "required" });

  const dup = await findDuplicate(b.lat, b.lng, b.areaM2, b.address);
  if (dup) throw new ApiError("CONFLICT", { duplicateOf: { id: dup.id, slug: dup.slug, title: dup.titleEs } });

  // A seeker who publishes becomes a private owner.
  if (u.role === "SEEKER" && b.mode !== "AGENCY") await prisma.user.update({ where: { id: u.id }, data: { role: "OWNER_PRIVATE" } });

  const copy = b.title_es && b.body_es ? null : draftCopy(b);
  const agencyId = b.mode === "AGENCY" ? (u.role === "SUPERADMIN" ? b.agencyId : u.agencyId) : b.mode === "MANDATE" ? b.agencyId : null;
  const agentId = b.mode === "AGENCY" ? (u.role === "AGENT" ? u.id : b.agentId ?? null) : null;
  const category = b.luxury ? "LUXURY" : b.kind === "land" ? "LAND" : b.listingType.startsWith("COMMERCIAL") ? "COMMERCIAL" : "RESIDENTIAL";
  const fp = fingerprintOf(b.lat, b.lng, b.areaM2, b.address);
  const slug = await uniqueSlug(`${slugify(b.zone)}-${b.beds ? `${b.beds}h` : b.kind}-${b.areaM2}m-${Math.random().toString(36).slice(2, 8)}`);
  const status = b.mode === "MANDATE" || !b.publish ? "DRAFT" : "ACTIVE";
  const review = b.mode === "AGENCY" && u.role === "AGENT" ? "PENDING" : "APPROVED";
  const titleEs = b.title_es ?? copy!.title_es;
  const bodyEs = b.body_es ?? copy!.body_es;
  const titleEn = b.title_en ?? copy?.title_en ?? "";
  const bodyEn = b.body_en ?? copy?.body_en ?? "";

  const listing = await prisma.listing.create({
    data: {
      slug,
      titleEs,
      titleEn,
      bodyEs,
      bodyEn,
      address: b.address,
      zone: b.zone,
      city: b.city,
      state: b.state,
      countryCode: b.countryCode,
      lat: b.lat,
      lng: b.lng,
      kind: b.kind,
      listingType: b.listingType,
      category,
      luxury: b.luxury,
      furnished: b.amenities.includes("furnished"),
      pets: b.amenities.includes("pets"),
      priceAmount: b.priceAmount,
      pricePeriod: b.listingType === "SHORT_RENT" ? "night" : b.listingType.includes("RENT") ? "month" : null,
      areaM2: b.areaM2,
      plotM2: b.plotM2,
      beds: b.beds,
      baths: b.baths,
      parking: b.parking,
      yearBuilt: b.yearBuilt,
      amenities: b.amenities,
      status,
      review,
      publishedAt: status === "ACTIVE" ? new Date() : null,
      agencyId,
      agentId,
      ownerUserId: b.mode === "AGENCY" ? null : u.id,
      scenes: scenesFor(b.kind, b.luxury),
      privateListing: b.privateListing,
      fingerprint: fp,
      priceHistory: { create: { amount: b.priceAmount, kind: "LISTED" } },
      fingerprints: { create: { fingerprint: fp } },
    },
  });
  await prisma.listing.update({ where: { id: listing.id }, data: { quality: qualityOf({ photos: 0, titleEn, bodyEn, lat: b.lat, hasFloorplan: false, hasVirtualTour: false }) } });
  await snapshotEstimate(listing.id);
  if (b.mode === "MANDATE") await prisma.mandate.create({ data: { ownerUserId: u.id, agencyId: b.agencyId!, listingId: listing.id, status: "REQUESTED" } });
  if (status === "ACTIVE" && review === "APPROVED") await notifySavedSearches(listing.id, "new");
  await audit(u.id, `listing.create.${b.mode.toLowerCase()}`, titleEs);
  return ok(await listingById(listing.id), 201);
});


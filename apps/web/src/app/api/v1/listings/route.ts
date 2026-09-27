import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@newplace/db";
import { ApiError, body, currentUser, handler, ok, requireUser } from "@/server/api";
import { filtersFromParams, listingById, listingInclude, publicWhere, searchListings, toDomain } from "@/server/listings";
import { brochurePdfSchema, commercialSchema, shortRentSchema } from "@newplace/config";
import { draftCopy, findDuplicate, fingerprintOf, notifySavedSearches, refreshQuality, scenesFor, slugify, snapshotEstimate, uniqueSlug } from "@/server/listing-service";
import { audit } from "@/server/data";
import { isStaff } from "@/server/access";
import { bump } from "@/server/counters";

export const GET = handler(async (req: NextRequest) => {
  // ?ids=a,b,c → those published listings in that order (comparator for listings that aren't saved)
  const ids = req.nextUrl.searchParams.get("ids");
  if (ids) {
    const list = ids.split(",").filter(Boolean).slice(0, 10);
    const rows = await prisma.listing.findMany({ where: { AND: [{ id: { in: list } }, publicWhere()] }, include: listingInclude });
    const map = new Map(rows.map((r) => [r.id, toDomain(r)]));
    return ok({ items: list.map((id) => map.get(id)).filter(Boolean), total: rows.length, nextCursor: null });
  }
  const f = filtersFromParams(req.nextUrl.searchParams);
  const res = await searchListings(f);
  // impressions (Rightmove-style performance stats)
  if (res.items.length) bump(res.items.slice(0, 40).map((l) => l.id), ["impressions"]).catch(() => {});
  return ok(res);
});

const CreateSchema = z.object({
  mode: z.enum(["FSBO", "AGENCY", "MANDATE"]).default("FSBO"),
  agencyId: z.string().max(64).optional(),
  listingType: z.enum(["SALE", "LONG_RENT", "SHORT_RENT", "COMMERCIAL_SALE", "COMMERCIAL_RENT"]),
  kind: z.enum(["apartment", "penthouse", "house", "townhouse", "studio", "office", "retail", "warehouse", "land", "villa", "chalet"]),
  address: z.string().min(5).max(200),
  zone: z.string().min(2).max(80),
  city: z.string().min(2).max(80),
  state: z.string().max(80).default(""),
  countryCode: z.string().length(2).default("VE"),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  areaM2: z.number().int().positive().max(1_000_000),
  plotM2: z.number().int().positive().max(100_000_000).optional(),
  beds: z.number().int().min(0).max(30).default(0),
  baths: z.number().int().min(0).max(30).default(0),
  parking: z.number().int().min(0).max(50).default(0),
  yearBuilt: z.number().int().min(1800).max(2100).default(new Date().getFullYear()),
  amenities: z.array(z.string().max(60)).max(50).default([]),
  priceAmount: z.number().int().positive().max(1_000_000_000),
  title_es: z.string().max(120).optional(),
  title_en: z.string().max(120).optional(),
  body_es: z.string().max(4000).optional(),
  body_en: z.string().max(4000).optional(),
  luxury: z.boolean().default(false),
  privateListing: z.boolean().default(false),
  agentId: z.string().max(64).optional(),
  publish: z.boolean().default(true),
  /** SHORT_RENT only */
  shortRent: shortRentSchema.optional(),
  /** COMMERCIAL_SALE / COMMERCIAL_RENT only */
  commercial: commercialSchema.optional(),
  /** luxury only */
  brochurePdf: brochurePdfSchema.optional(),
});

export const POST = handler(async (req: NextRequest) => {
  const u = requireUser(await currentUser());
  const b = await body(req, CreateSchema);
  if (b.mode === "FSBO" && u.role !== "OWNER_PRIVATE" && u.role !== "SEEKER" && u.role !== "SUPERADMIN") throw new ApiError("FORBIDDEN");
  if (b.mode === "AGENCY" && !(isStaff(u) && u.role !== "CAPTOR" && u.role !== "PHOTOGRAPHER") && u.role !== "SUPERADMIN") throw new ApiError("FORBIDDEN");
  if (b.mode === "MANDATE" && u.role !== "OWNER_PRIVATE" && u.role !== "SEEKER" && u.role !== "SUPERADMIN") throw new ApiError("FORBIDDEN");
  if (b.mode === "MANDATE" && !b.agencyId) throw new ApiError("VALIDATION", { agencyId: "required" });
  // The agency named by the client must exist and be operating (a suspended agency can't take mandates or publish).
  if (b.agencyId && (b.mode === "MANDATE" || (b.mode === "AGENCY" && u.role === "SUPERADMIN"))) {
    const agency = await prisma.agency.findUnique({ where: { id: b.agencyId }, select: { status: true } });
    if (!agency || agency.status === "SUSPENDED") throw new ApiError("VALIDATION", { agencyId: "unknown or suspended agency" });
  }
  // Type-specific fields only where they apply (brief §5).
  if (b.shortRent && b.listingType !== "SHORT_RENT") throw new ApiError("VALIDATION", { shortRent: "only for SHORT_RENT" });
  if (b.commercial && !b.listingType.startsWith("COMMERCIAL")) throw new ApiError("VALIDATION", { commercial: "only for commercial listings" });
  if (b.brochurePdf && !b.luxury) throw new ApiError("VALIDATION", { brochurePdf: "only for luxury listings" });

  const dup = await findDuplicate(b.lat, b.lng, b.areaM2, b.address);
  if (dup) throw new ApiError("CONFLICT", { duplicateOf: { id: dup.id, slug: dup.slug, title: dup.titleEs } });

  // A seeker who publishes becomes a private owner.
  if (u.role === "SEEKER" && b.mode !== "AGENCY") await prisma.user.update({ where: { id: u.id }, data: { role: "OWNER_PRIVATE" } });

  const copy = b.title_es && b.body_es ? null : draftCopy(b);
  // A mandate is only a request: the listing stays the owner's (no agency, not public) until the agency accepts it
  // (PATCH /mandates/:id links agencyId on assignment and publishes on ACTIVE).
  const agencyId = b.mode === "AGENCY" ? (u.role === "SUPERADMIN" ? b.agencyId : u.agencyId) : null;
  const agentId = b.mode === "AGENCY" ? (u.role === "AGENT" ? u.id : b.agentId ?? null) : null;
  if (agentId && agentId !== u.id) {
    // Assigning someone else: they must be an AGENT of the listing's agency (otherwise leads would leak across agencies).
    const member = agencyId ? await prisma.agencyMember.findFirst({ where: { userId: agentId, agencyId, role: "AGENT" } }) : null;
    if (!member) throw new ApiError("VALIDATION", { agentId: "not an agent of this agency" });
  }
  const category = b.luxury ? "LUXURY" : b.kind === "land" ? "LAND" : b.listingType.startsWith("COMMERCIAL") ? "COMMERCIAL" : "RESIDENTIAL";
  const fp = fingerprintOf(b.lat, b.lng, b.areaM2, b.address);
  const slug = await uniqueSlug(`${slugify(b.zone)}-${b.beds ? `${b.beds}h` : b.kind}-${b.areaM2}m-${Math.random().toString(36).slice(2, 8)}`);
  const status = b.mode === "MANDATE" || !b.publish ? "DRAFT" : "ACTIVE";
  const review = (b.mode === "AGENCY" && u.role === "AGENT") || b.mode === "MANDATE" ? "PENDING" : "APPROVED";
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
      privateListing: b.mode === "MANDATE" ? true : b.privateListing,
      shortRent: b.shortRent,
      commercial: b.commercial,
      brochurePdf: b.brochurePdf,
      fingerprint: fp,
      priceHistory: { create: { amount: b.priceAmount, kind: "LISTED" } },
      fingerprints: { create: { fingerprint: fp } },
    },
  });
  await refreshQuality(listing.id);
  await snapshotEstimate(listing.id);
  if (b.mode === "MANDATE") await prisma.mandate.create({ data: { ownerUserId: u.id, agencyId: b.agencyId!, listingId: listing.id, status: "REQUESTED" } });
  if (status === "ACTIVE" && review === "APPROVED") await notifySavedSearches(listing.id, "new");
  await audit(u.id, `listing.create.${b.mode.toLowerCase()}`, titleEs);
  return ok(await listingById(listing.id), 201);
});


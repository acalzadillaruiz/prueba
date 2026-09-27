import type { NextRequest } from "next/server";
import { z } from "zod";
import { body, currentUser, handler, ok } from "@/server/api";
import { findDuplicate, fingerprintOf } from "@/server/listing-service";
import { isStaff } from "@/server/access";
import { publicWhere } from "@/server/listings";
import { prisma } from "@newplace/db";
import { limit } from "@/server/rate-limit";

const Check = z.object({ address: z.string().min(3), areaM2: z.number().int().positive(), lat: z.number().optional(), lng: z.number().optional() });

/** Anti-duplicate check (fingerprint lat/lng + m² + address hash). */
/** Duplicate check. Public (the owner wizard runs it before sign-in) but rate-limited; internals only for staff. */
export const POST = handler(async (req: NextRequest) => {
  await limit(req, "dup-check", 60, 60);
  const u = await currentUser();
  const b = await body(req, Check);
  const dup = await findDuplicate(b.lat ?? 0, b.lng ?? 0, b.areaM2, b.address);
  // Non-staff learn only that a duplicate exists; its link only when the listing is already public
  // (a hidden or link-only listing's slug is its access key).
  const sameAgency = !!u && !!dup && (u.role === "SUPERADMIN" || (isStaff(u) && dup.agencyId === u.agencyId));
  if (!sameAgency) {
    if (!dup) return ok({ duplicate: null });
    const pub = await prisma.listing.findFirst({ where: { AND: [{ id: dup.id }, publicWhere()] }, select: { id: true } });
    return ok({ duplicate: pub ? { slug: dup.slug, title: dup.titleEs } : { slug: null, title: null } });
  }
  return ok({ fingerprint: fingerprintOf(b.lat ?? 0, b.lng ?? 0, b.areaM2, b.address), duplicate: dup ? { id: dup.id, slug: dup.slug, title: dup.titleEs, zone: dup.zone, areaM2: dup.areaM2, fingerprint: dup.fingerprint } : null });
});

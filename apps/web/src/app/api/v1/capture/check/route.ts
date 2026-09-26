import type { NextRequest } from "next/server";
import { z } from "zod";
import { body, currentUser, handler, ok, requireUser } from "@/server/api";
import { findDuplicate, fingerprintOf } from "@/server/listing-service";

const Check = z.object({ address: z.string().min(3), areaM2: z.number().int().positive(), lat: z.number().optional(), lng: z.number().optional() });

/** Anti-duplicate check (fingerprint lat/lng + m² + address hash). */
export const POST = handler(async (req: NextRequest) => {
  requireUser(await currentUser());
  const b = await body(req, Check);
  const dup = await findDuplicate(b.lat ?? 0, b.lng ?? 0, b.areaM2, b.address);
  return ok({ fingerprint: fingerprintOf(b.lat ?? 0, b.lng ?? 0, b.areaM2, b.address), duplicate: dup ? { id: dup.id, slug: dup.slug, title: dup.titleEs, zone: dup.zone, areaM2: dup.areaM2, fingerprint: dup.fingerprint } : null });
});

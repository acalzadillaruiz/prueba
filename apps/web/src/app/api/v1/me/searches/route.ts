import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@newplace/db";
import { body, currentUser, handler, ok, requireUser } from "@/server/api";
import { limit } from "@/server/rate-limit";

export const GET = handler(async () => {
  const u = requireUser(await currentUser());
  return ok({ items: await prisma.savedSearch.findMany({ where: { userId: u.id }, orderBy: { createdAt: "desc" } }) });
});

const Create = z.object({
  name: z.string().min(2).max(120),
  // Filters as a URL query. A drawn radius travels here as `radius=lat,lng,km` (SavedSearch has no column for it).
  query: z.string().max(4000),
  polygon: z.array(z.object({ lat: z.number(), lng: z.number() })).min(3).max(200).optional(),
  frequency: z.enum(["INSTANT", "DAILY", "WEEKLY"]).default("DAILY"),
});

/** Same filters regardless of parameter order; UI-only keys (sort, cursor) don't make a search different. */
function canonicalQuery(q: string) {
  const p = new URLSearchParams(q);
  for (const k of ["sort", "cursor", "take"]) p.delete(k);
  p.sort();
  return p.toString();
}

export const POST = handler(async (req: NextRequest) => {
  const u = requireUser(await currentUser());
  await limit(req, "saved-search", 30, 60 * 60);
  const b = await body(req, Create);
  const query = canonicalQuery(b.query);
  const polygon = b.polygon ? JSON.stringify(b.polygon) : null;
  // Clicking "Save search" twice (or on two devices) returns the identical search instead of duplicating the alert.
  const mine = await prisma.savedSearch.findMany({ where: { userId: u.id }, orderBy: { createdAt: "asc" } });
  const same = mine.find((s) => canonicalQuery(s.query) === query && (s.polygon ? JSON.stringify(s.polygon) : null) === polygon);
  if (same) return ok({ ...same, existing: true });
  const s = await prisma.savedSearch.create({ data: { userId: u.id, name: b.name, query, polygon: b.polygon, frequency: b.frequency } });
  return ok(s, 201);
});

import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@newplace/db";
import { body, currentUser, handler, ok, requireUser } from "@/server/api";
import { bump } from "@/server/counters";

export const GET = handler(async () => {
  const u = requireUser(await currentUser());
  const rows = await prisma.savedListing.findMany({ where: { userId: u.id }, orderBy: { createdAt: "desc" } });
  return ok({ ids: rows.map((r) => r.listingId) });
});

const Toggle = z.object({ listingId: z.string(), saved: z.boolean() });

export const POST = handler(async (req: NextRequest) => {
  const u = requireUser(await currentUser());
  const { listingId, saved } = await body(req, Toggle);
  if (saved) {
    const r = await prisma.savedListing.upsert({ where: { userId_listingId: { userId: u.id, listingId } }, create: { userId: u.id, listingId }, update: {} });
    if (r.createdAt.getTime() > Date.now() - 5000) await bump([listingId], ["saves"]);
  } else {
    const d = await prisma.savedListing.deleteMany({ where: { userId: u.id, listingId } });
    if (d.count) await prisma.listing.update({ where: { id: listingId }, data: { saves: { decrement: 1 } } });
  }
  const rows = await prisma.savedListing.findMany({ where: { userId: u.id }, orderBy: { createdAt: "desc" } });
  return ok({ ids: rows.map((r) => r.listingId) });
});

import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@newplace/db";
import { body, currentUser, handler, ok, requireUser } from "@/server/api";
import { getUser } from "@/server/data";

export const GET = handler(async () => {
  const u = requireUser(await currentUser());
  const [user, saved] = await Promise.all([getUser(u.id), prisma.savedListing.findMany({ where: { userId: u.id }, select: { listingId: true }, orderBy: { createdAt: "desc" } })]);
  return ok({ user, saved: saved.map((s) => s.listingId) });
});

const Patch = z.object({
  name: z.string().min(2).max(80).optional(),
  phone: z.string().max(30).optional(),
  budget: z.number().int().positive().nullable().optional(),
  interests: z.string().max(200).optional(),
  locale: z.enum(["es", "en"]).optional(),
});

export const PATCH = handler(async (req: NextRequest) => {
  const u = requireUser(await currentUser());
  const b = await body(req, Patch);
  await prisma.user.update({ where: { id: u.id }, data: b });
  return ok(await getUser(u.id));
});

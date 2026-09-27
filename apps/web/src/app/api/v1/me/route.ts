import type { NextRequest } from "next/server";
import { z } from "zod";
import { prequalSchema } from "@newplace/config";
import { prisma } from "@newplace/db";
import { body, currentUser, handler, ok, requireUser } from "@/server/api";
import { getUser } from "@/server/data";

export const GET = handler(async () => {
  const u = requireUser(await currentUser());
  const [user, saved, row] = await Promise.all([
    getUser(u.id),
    prisma.savedListing.findMany({ where: { userId: u.id }, select: { listingId: true }, orderBy: { createdAt: "desc" } }),
    prisma.user.findUnique({ where: { id: u.id }, select: { prequal: true } }),
  ]);
  return ok({ user: user ? { ...user, prequal: row?.prequal ?? null } : null, saved: saved.map((s) => s.listingId) });
});

const Patch = z.object({
  name: z.string().min(2).max(80).optional(),
  phone: z.string().max(30).optional(),
  budget: z.number().int().positive().nullable().optional(),
  interests: z.string().max(200).optional(),
  locale: z.enum(["es", "en"]).optional(),
  /** Homebuyer Hub pre-qualification (mock): restored on load so the step survives a reload. */
  prequal: prequalSchema.optional(),
});

export const PATCH = handler(async (req: NextRequest) => {
  const u = requireUser(await currentUser());
  const b = await body(req, Patch);
  await prisma.user.update({ where: { id: u.id }, data: b });
  const [user, row] = await Promise.all([getUser(u.id), prisma.user.findUnique({ where: { id: u.id }, select: { prequal: true } })]);
  return ok({ ...user, prequal: row?.prequal ?? null });
});

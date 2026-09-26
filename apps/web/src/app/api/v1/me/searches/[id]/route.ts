import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@newplace/db";
import { ApiError, body, currentUser, handler, ok, requireUser } from "@/server/api";

type Ctx = { params: Promise<{ id: string }> };

async function own(id: string, userId: string) {
  const s = await prisma.savedSearch.findUnique({ where: { id } });
  if (!s || s.userId !== userId) throw new ApiError("NOT_FOUND");
  return s;
}

export const PATCH = handler(async (req: NextRequest, { params }: Ctx) => {
  const { id } = await params;
  const u = requireUser(await currentUser());
  await own(id, u.id);
  const b = await body(req, z.object({ frequency: z.enum(["INSTANT", "DAILY", "WEEKLY"]).optional(), name: z.string().min(2).max(120).optional() }));
  return ok(await prisma.savedSearch.update({ where: { id }, data: b }));
});

export const DELETE = handler(async (_req: NextRequest, { params }: Ctx) => {
  const { id } = await params;
  const u = requireUser(await currentUser());
  await own(id, u.id);
  await prisma.savedSearch.delete({ where: { id } });
  return ok({ ok: true });
});

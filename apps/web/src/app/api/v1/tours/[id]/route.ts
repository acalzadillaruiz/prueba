import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@newplace/db";
import { ApiError, body, currentUser, handler, ok, requireUser } from "@/server/api";
import { isManager } from "@/server/access";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handler(async (req: NextRequest, { params }: Ctx) => {
  const { id } = await params;
  const u = requireUser(await currentUser());
  const t = await prisma.tour.findUnique({ where: { id }, include: { listing: { select: { agencyId: true } } } });
  if (!t) throw new ApiError("NOT_FOUND");
  const allowed = u.role === "SUPERADMIN" || t.agentId === u.id || t.seekerUserId === u.id || (isManager(u) && t.listing.agencyId === u.agencyId);
  if (!allowed) throw new ApiError("FORBIDDEN");
  const b = await body(req, z.object({ status: z.enum(["CONFIRMED", "DONE", "CANCELLED"]) }));
  if (t.seekerUserId === u.id && b.status !== "CANCELLED") throw new ApiError("FORBIDDEN");
  return ok(await prisma.tour.update({ where: { id }, data: { status: b.status } }));
});

import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@newplace/db";
import { ApiError, body, currentUser, handler, ok, requireUser } from "@/server/api";
import { audit } from "@/server/data";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handler(async (req: NextRequest, { params }: Ctx) => {
  const { id } = await params;
  const u = requireUser(await currentUser());
  if (u.role !== "SUPERADMIN") throw new ApiError("FORBIDDEN");
  if (id === u.id) throw new ApiError("VALIDATION", { id: "cannot modify yourself" });
  const b = await body(req, z.object({ suspended: z.boolean().optional(), role: z.enum(["SEEKER", "OWNER_PRIVATE", "SUPERADMIN"]).optional() }));
  const r = await prisma.user.update({ where: { id }, data: b, select: { id: true, suspended: true, role: true, email: true } });
  await audit(u.id, b.suspended !== undefined ? (b.suspended ? "user.suspend" : "user.restore") : "user.role", r.email, b);
  return ok(r);
});

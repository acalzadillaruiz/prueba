import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@newplace/db";
import { ApiError, body, currentUser, handler, ok, requireUser } from "@/server/api";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handler(async (req: NextRequest, { params }: Ctx) => {
  const { id } = await params;
  const u = requireUser(await currentUser());
  const c = await prisma.captureLead.findUnique({ where: { id } });
  if (!c) throw new ApiError("NOT_FOUND");
  if (u.role !== "SUPERADMIN" && c.agencyId !== u.agencyId) throw new ApiError("FORBIDDEN");
  const b = await body(req, z.object({ result: z.enum(["PENDING", "CAPTURED", "REJECTED", "DUPLICATE"]) }));
  return ok(await prisma.captureLead.update({ where: { id }, data: b }));
});

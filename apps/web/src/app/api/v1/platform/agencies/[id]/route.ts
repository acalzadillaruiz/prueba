import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@newplace/db";
import { ApiError, body, currentUser, handler, ok, requireUser } from "@/server/api";
import { audit } from "@/server/data";

type Ctx = { params: Promise<{ id: string }> };

/** Plan flags (no billing), verification and status. Superadmin only. */
export const PATCH = handler(async (req: NextRequest, { params }: Ctx) => {
  const { id } = await params;
  const user = requireUser(await currentUser());
  if (user.role !== "SUPERADMIN") throw new ApiError("FORBIDDEN");
  const b = await body(req, z.object({ plan: z.enum(["FREE", "PRO", "ENTERPRISE"]).optional(), verified: z.boolean().optional(), status: z.enum(["ACTIVE", "SUSPENDED", "TRIAL"]).optional() }));
  if (!(await prisma.agency.findUnique({ where: { id }, select: { id: true } }))) throw new ApiError("NOT_FOUND");
  const a = await prisma.agency.update({ where: { id }, data: b });
  await audit(user.id, "agency.flags", a.name, b);
  return ok(a);
});

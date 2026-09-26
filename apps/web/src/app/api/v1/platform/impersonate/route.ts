import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@newplace/db";
import { ApiError, body, currentUser, handler, ok, requireUser } from "@/server/api";
import { audit } from "@/server/data";
import { unstable_update } from "@/auth";

/** Superadmin impersonates a tenant: the session's agencyId switches (role stays SUPERADMIN). null = exit. */
export const POST = handler(async (req: NextRequest) => {
  const u = requireUser(await currentUser());
  if (u.role !== "SUPERADMIN") throw new ApiError("FORBIDDEN");
  const { agencyId } = await body(req, z.object({ agencyId: z.string().nullable() }));
  if (agencyId && !(await prisma.agency.findUnique({ where: { id: agencyId } }))) throw new ApiError("NOT_FOUND");
  await unstable_update({ agencyId } as never);
  await audit(u.id, agencyId ? "tenant.impersonate" : "tenant.impersonate.exit", agencyId ?? "-");
  return ok({ agencyId });
});

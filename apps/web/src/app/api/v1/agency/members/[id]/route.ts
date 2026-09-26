import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@newplace/db";
import { ApiError, body, currentUser, handler, ok, requireUser } from "@/server/api";
import { isManager } from "@/server/access";
import { audit } from "@/server/data";

type Ctx = { params: Promise<{ id: string }> };

/** Change a member's role / verify an agent (VERIFIED badge). id = userId. */
export const PATCH = handler(async (req: NextRequest, { params }: Ctx) => {
  const { id } = await params;
  const u = requireUser(await currentUser());
  if (!isManager(u) && u.role !== "SUPERADMIN") throw new ApiError("FORBIDDEN");
  const b = await body(req, z.object({ role: z.enum(["AGENCY_OWNER", "AGENT", "CAPTOR", "PHOTOGRAPHER", "BACKOFFICE"]).optional(), verified: z.boolean().optional() }));
  if (b.role === "AGENCY_OWNER" && u.role === "BACKOFFICE") throw new ApiError("FORBIDDEN");
  const m = await prisma.agencyMember.findFirst({ where: { userId: id, agencyId: u.agencyId ?? "" } });
  if (!m) throw new ApiError("NOT_FOUND");
  const r = await prisma.agencyMember.update({ where: { id: m.id }, data: b });
  if (b.role) await prisma.user.update({ where: { id }, data: { role: b.role } });
  await audit(u.id, "member.update", id, b);
  return ok(r);
});

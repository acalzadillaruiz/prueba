import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@newplace/db";
import { ApiError, body, currentUser, handler, ok, requireUser } from "@/server/api";
import { AGENCY_STAFF } from "@/server/access";
import { audit } from "@/server/data";

type Ctx = { params: Promise<{ id: string }> };

const PERSONAL_ROLES = ["SEEKER", "OWNER_PRIVATE", "SUPERADMIN"] as const;
const Patch = z
  .object({
    suspended: z.boolean().optional(),
    role: z.enum(["SUPERADMIN", "AGENCY_OWNER", "AGENT", "CAPTOR", "PHOTOGRAPHER", "BACKOFFICE", "OWNER_PRIVATE", "SEEKER"]).optional(),
  })
  .refine((b) => b.suspended !== undefined || b.role !== undefined, { message: "empty" });

export const PATCH = handler(async (req: NextRequest, { params }: Ctx) => {
  const { id } = await params;
  const u = requireUser(await currentUser());
  if (u.role !== "SUPERADMIN") throw new ApiError("FORBIDDEN");
  // A superadmin never suspends or demotes itself (the platform always keeps the acting admin).
  if (id === u.id) throw new ApiError("VALIDATION", { id: "cannot modify yourself" });
  const b = await body(req, Patch);
  const target = await prisma.user.findUnique({ where: { id }, include: { memberships: { orderBy: { createdAt: "asc" }, include: { agency: { select: { name: true } } } } } });
  if (!target) throw new ApiError("NOT_FOUND");

  if (b.role !== undefined) {
    // Same rule as liveIdentity: the first membership is the one that defines the user's agency role.
    const m = target.memberships[0];
    const current = target.role === "SUPERADMIN" ? "SUPERADMIN" : (m?.role ?? target.role);
    if (b.role !== current) {
      const agencyRole = (AGENCY_STAFF as readonly string[]).includes(b.role);
      if (m && !agencyRole) throw new ApiError("VALIDATION", { role: "agency member needs an agency role" });
      if (!m && !(PERSONAL_ROLES as readonly string[]).includes(b.role)) throw new ApiError("VALIDATION", { role: "no agency membership" });
      if (m && m.role === "AGENCY_OWNER" && b.role !== "AGENCY_OWNER") {
        const owners = await prisma.agencyMember.count({ where: { agencyId: m.agencyId, role: "AGENCY_OWNER" } });
        if (owners <= 1) throw new ApiError("VALIDATION", { role: "last owner" });
      }
      // Keep User.role and AgencyMember.role in sync.
      await prisma.$transaction([
        ...(m ? [prisma.agencyMember.update({ where: { id: m.id }, data: { role: b.role } })] : []),
        prisma.user.update({ where: { id }, data: { role: b.role } }),
      ]);
      await audit(u.id, "user.role", target.email, { from: current, to: b.role, ...(m ? { agency: m.agency.name } : {}) });
    }
  }
  if (b.suspended !== undefined && b.suspended !== target.suspended) {
    await prisma.user.update({ where: { id }, data: { suspended: b.suspended } });
    await audit(u.id, b.suspended ? "user.suspend" : "user.restore", target.email);
  }
  const r = await prisma.user.findUniqueOrThrow({ where: { id }, select: { id: true, suspended: true, role: true, email: true } });
  return ok(r);
});

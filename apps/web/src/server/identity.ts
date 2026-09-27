import "server-only";
import { prisma } from "@newplace/db";
import type { Role } from "@newplace/config";

/**
 * Re-reads role / agency / suspension from the DB on every request so a JWT can never outlive a
 * demotion, suspension or membership change. Superadmins keep the token's agencyId (impersonation).
 */
export async function liveIdentity(uid: string, tokenAgencyId: string | null) {
  const u = await prisma.user.findUnique({
    where: { id: uid },
    select: { id: true, name: true, email: true, hue: true, phone: true, role: true, suspended: true, memberships: { orderBy: { createdAt: "asc" }, take: 1, select: { role: true, agencyId: true } } },
  });
  if (!u || u.suspended) return null;
  const m = u.memberships[0];
  const role = (u.role === "SUPERADMIN" ? "SUPERADMIN" : (m?.role ?? u.role)) as Role;
  const agencyId = role === "SUPERADMIN" ? tokenAgencyId : (m?.agencyId ?? null);
  return { ...u, role, agencyId };
}

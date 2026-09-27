import "server-only";
import { prisma } from "@newplace/db";
import { ApiError } from "./api";

/** A shoot can be logged up to 30 days back (late entry) and scheduled up to 180 days ahead. */
export function assertMediaDate(iso: string) {
  const d = new Date(iso);
  const now = Date.now();
  if (Number.isNaN(d.getTime()) || d.getTime() < now - 30 * 864e5 || d.getTime() > now + 180 * 864e5) throw new ApiError("VALIDATION", { date: "out of range" });
  return d;
}

/** The photographer must be a PHOTOGRAPHER member of this agency. */
export async function assertPhotographer(agencyId: string, userId: string) {
  const m = await prisma.agencyMember.findFirst({ where: { agencyId, userId, role: "PHOTOGRAPHER" }, include: { user: { select: { id: true, name: true, email: true, suspended: true } } } });
  if (!m || m.user.suspended) throw new ApiError("VALIDATION", { photographerId: "not a photographer of this agency" });
  return { id: m.user.id, name: m.user.name ?? m.user.email };
}

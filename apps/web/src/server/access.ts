import "server-only";
import { prisma } from "@newplace/db";
import { ApiError, type SessionUser } from "./api";

export const AGENCY_STAFF = ["AGENCY_OWNER", "AGENT", "CAPTOR", "PHOTOGRAPHER", "BACKOFFICE"] as const;
export const isStaff = (u: SessionUser) => (AGENCY_STAFF as readonly string[]).includes(u.role);
export const isManager = (u: SessionUser) => u.role === "AGENCY_OWNER" || u.role === "BACKOFFICE";

type Mode = "view" | "edit" | "photos" | "assign" | "approve";

/** Never trust the client: every write re-checks role + agencyId + ownership (brief §4). */
export async function listingForUser(id: string, u: SessionUser, mode: Mode) {
  const l = await prisma.listing.findUnique({ where: { id } });
  if (!l) throw new ApiError("NOT_FOUND");
  if (u.role === "SUPERADMIN") return l;
  const sameAgency = !!l.agencyId && l.agencyId === u.agencyId;
  const ok =
    (u.role === "OWNER_PRIVATE" && l.ownerUserId === u.id && mode !== "assign" && mode !== "approve") ||
    (isManager(u) && sameAgency) ||
    (u.role === "AGENT" && sameAgency && l.agentId === u.id && (mode === "view" || mode === "edit" || mode === "photos")) ||
    (u.role === "PHOTOGRAPHER" && sameAgency && (mode === "view" || mode === "photos")) ||
    (u.role === "CAPTOR" && sameAgency && mode === "view");
  if (!ok) throw new ApiError("FORBIDDEN");
  return l;
}

export function requireAgency(u: SessionUser) {
  if (!u.agencyId) throw new ApiError("FORBIDDEN");
  return u.agencyId;
}

export async function leadForUser(id: string, u: SessionUser) {
  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) throw new ApiError("NOT_FOUND");
  const ok = u.role === "SUPERADMIN" || (isManager(u) && lead.agencyId === u.agencyId) || lead.agentId === u.id;
  if (!ok) throw new ApiError("FORBIDDEN");
  return lead;
}


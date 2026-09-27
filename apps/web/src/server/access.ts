import "server-only";
import { prisma } from "@newplace/db";
import { ApiError, type SessionUser } from "./api";
import { publicWhere } from "./listings";

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

/**
 * Read gate for listing sub-resources (photos, slots…): public listings are open to anyone; hidden ones
 * (draft, in review, private, withdrawn/taken down, suspended agency) only to users who may `view` them.
 * Everyone else gets 404 so hidden listings do not even reveal that they exist.
 */
export async function visibleListingId(id: string, u: SessionUser | null): Promise<string> {
  const pub = await prisma.listing.findFirst({ where: { AND: [{ id }, publicWhere()] }, select: { id: true } });
  if (pub) return pub.id;
  if (!u) throw new ApiError("NOT_FOUND");
  try {
    return (await listingForUser(id, u, "view")).id;
  } catch {
    throw new ApiError("NOT_FOUND");
  }
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


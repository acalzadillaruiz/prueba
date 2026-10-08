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
 * Read gate for listing sub-resources (photos, slots…): public and link-only private listings are open to anyone; hidden ones
 * (draft, in review, private, withdrawn/taken down, suspended agency) only to users who may `view` them.
 * Everyone else gets 404 so hidden listings do not even reveal that they exist.
 */
export async function visibleListingId(id: string, u: SessionUser | null): Promise<string> {
  const pub = await prisma.listing.findFirst({ where: { AND: [{ id }, publicWhere({ byLink: true })] }, select: { id: true } });
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
  // The assigned agent only while they work for the lead's agency: `agentId` alone is not proof of tenancy
  // (an agent who changed agency, or a foreign user id stored as agent, must not read the buyer's PII).
  const ok =
    u.role === "SUPERADMIN" ||
    (isManager(u) && !!lead.agencyId && lead.agencyId === u.agencyId) ||
    (lead.agentId === u.id && !!lead.agencyId && lead.agencyId === u.agencyId);
  if (!ok && !(await ownsFsboLead(lead, u))) throw new ApiError("FORBIDDEN");
  return lead;
}

/**
 * A private owner answers the enquiries of their own FSBO listing (no agency, no agent on the lead nor on the listing).
 * Once an agency takes the listing over (mandate linked), its leads belong to the agency.
 */
async function ownsFsboLead(lead: { listingId: string; agencyId: string | null; agentId: string | null }, u: SessionUser) {
  if (u.role !== "OWNER_PRIVATE" || lead.agencyId || lead.agentId) return false;
  const l = await prisma.listing.findUnique({ where: { id: lead.listingId }, select: { ownerUserId: true, agencyId: true, agentId: true } });
  return !!l && l.ownerUserId === u.id && !l.agencyId && !l.agentId;
}

/** Tours of a private owner's FSBO listing: the owner confirms or cancels them (they attend the visits themselves). */
export function ownsFsboTour(listing: { ownerUserId: string | null; agencyId: string | null; agentId: string | null }, u: SessionUser) {
  return u.role === "OWNER_PRIVATE" && listing.ownerUserId === u.id && !listing.agencyId && !listing.agentId;
}


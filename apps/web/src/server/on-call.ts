import "server-only";
import { prisma } from "@newplace/db";
import { ApiError } from "./api";
import { publicWhere } from "./listings";
import { ON_CALL_DAYS, onCallUserId, waLink, type OnCallAdvisor, type OnCallRotation } from "@/lib/on-call";

export type { OnCallAdvisor };

/** Roles that can be put on call: advisors and the agency owner (never captors, photographers or back office). */
export const ON_CALL_ROLES = ["AGENT", "AGENCY_OWNER"] as const;

/**
 * Server-side check of a Guardia rotation: every user id must be an active AGENT / AGENCY_OWNER member of
 * `agencyId`. Throws VALIDATION naming the offending weekdays (a foreign or unknown id is never stored).
 */
export async function assertOnCallMembers(agencyId: string, rotation: OnCallRotation): Promise<void> {
  const ids = [...new Set(Object.values(rotation).filter((v): v is string => !!v))];
  const members = ids.length
    ? await prisma.agencyMember.findMany({
        where: { agencyId, userId: { in: ids }, role: { in: [...ON_CALL_ROLES] }, user: { suspended: false } },
        select: { userId: true },
      })
    : [];
  const ok = new Set(members.map((m) => m.userId));
  const bad = ON_CALL_DAYS.filter((d) => rotation[d] && !ok.has(rotation[d]!));
  if (bad.length) throw new ApiError("VALIDATION", { onCall: Object.fromEntries(bad.map((d) => [d, "not an advisor of this agency"])) });
}

const initialsOf = (name: string) => name.split(/\s+/).filter(Boolean).map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "?";

/**
 * Today's on-call advisor per verified, active agency (Caracas weekday). Only fields already public on a listing's
 * contact panel: advisor name/avatar/verified tick, phone and WhatsApp (advisor's, else the agency's). Never emails.
 * `agencyId` restricts to one agency; `listingSlug` (a publicly served listing) restricts to that listing's agency
 * only, so a listing's Guardia never shows advisors of other agencies (unknown listing or owner-listed → []).
 */
export async function onCallAdvisors(opts: { agencyId?: string; listingSlug?: string; now?: number | Date } = {}): Promise<OnCallAdvisor[]> {
  const now = opts.now ?? Date.now();
  let agencyId = opts.agencyId;
  if (opts.listingSlug) {
    const l = await prisma.listing.findFirst({ where: { AND: [{ slug: opts.listingSlug }, publicWhere({ byLink: true })] }, select: { agencyId: true } });
    if (!l?.agencyId || (agencyId && agencyId !== l.agencyId)) return [];
    agencyId = l.agencyId;
  }
  const agencies = await prisma.agency.findMany({
    where: { verified: true, status: "ACTIVE", ...(agencyId ? { id: agencyId } : {}) },
    select: { id: true, name: true, initials: true, color: true, phone: true, whatsapp: true, onCall: true },
    orderBy: { name: "asc" },
  });
  const today = agencies.map((a) => ({ a, userId: onCallUserId(a.onCall, now) })).filter((x): x is { a: (typeof agencies)[number]; userId: string } => !!x.userId);
  if (!today.length) return [];
  // The rotation is re-checked at read time: someone who left the agency or was suspended is never shown.
  const members = await prisma.agencyMember.findMany({
    where: { OR: today.map((t) => ({ agencyId: t.a.id, userId: t.userId })), role: { in: [...ON_CALL_ROLES] }, user: { suspended: false } },
    select: { agencyId: true, userId: true, verified: true, user: { select: { name: true, hue: true, phone: true } } },
  });
  const out: OnCallAdvisor[] = [];
  for (const { a, userId } of today) {
    const m = members.find((x) => x.agencyId === a.id && x.userId === userId);
    if (!m) continue;
    const name = m.user.name ?? a.name;
    const phone = m.user.phone || a.phone || null;
    out.push({
      agency: { id: a.id, name: a.name, initials: a.initials, color: a.color },
      advisor: {
        name,
        initials: initialsOf(name),
        hue: m.user.hue,
        verified: m.verified,
        phone,
        tel: phone ? `tel:${phone.replace(/[^\d+]/g, "")}` : null,
        whatsapp: waLink(m.user.phone || a.whatsapp),
      },
    });
  }
  return out;
}

import "server-only";
import { prisma, type Prisma } from "@newplace/db";
import { AGENCY_PAGE_ROLES } from "@/lib/agency-pages";
import { mean, median, pct, responseMinutes, slaPct, type AuditPeriod } from "@/lib/team-metrics";
import { ApiError, requireUser, type SessionUser } from "./api";
import { audit } from "./data";
import { closingsByAgent } from "./agency-stats";

/**
 * "Auditoría del gerente": per-advisor performance and read-only access to the team's chats.
 * Every query here is scoped to ONE agency id that comes from the caller's session (never from the request).
 */

const DAY = 864e5;

/** Owner of the agency (or a superadmin impersonating it). Agents, backoffice and other roles are refused. */
export function requireAuditor(u: SessionUser | null): { user: SessionUser; agencyId: string } {
  const user = requireUser(u);
  if (!AGENCY_PAGE_ROLES.auditoria.includes(user.role)) throw new ApiError("FORBIDDEN");
  if (!user.agencyId) throw new ApiError("FORBIDDEN");
  return { user, agencyId: user.agencyId };
}

export type AdvisorRow = {
  id: string;
  name: string;
  email: string;
  hue: number;
  role: "AGENT" | "AGENCY_OWNER";
  verified: boolean;
  suspended: boolean;
  lastSeenAt: string;
  listings: number;
  captures: number;
  closings: number;
  leads: number;
  answered: number;
  respMedianMin: number | null;
  respMeanMin: number | null;
  slaPct: number | null;
  toursBooked: number;
  toursDone: number;
  leadToTourPct: number | null;
  quality: number | null;
};

const PAST_TOUR = ["TOUR", "OFFER", "WON"];

/** One row per AGENT member (plus owners who have listings assigned), with metrics computed from live data only. */
export async function advisorPerformance(agencyId: string, days: AuditPeriod, now: number = Date.now()): Promise<AdvisorRow[]> {
  const since = new Date(now - days * DAY);
  const until = new Date(now);
  const members = await prisma.agencyMember.findMany({
    where: { agencyId, role: { in: ["AGENT", "AGENCY_OWNER"] } },
    include: { user: { select: { id: true, name: true, email: true, hue: true, lastSeenAt: true, suspended: true } } },
  });
  const ids = members.map((m) => m.userId);
  if (!ids.length) return [];
  const [listings, closed, leads, tours, captures] = await Promise.all([
    prisma.listing.findMany({ where: { agencyId, agentId: { in: ids } }, select: { id: true, agentId: true, createdAt: true, status: true, quality: true } }),
    // Same definition as the dashboard ranking and the reports (agency-stats.closingsByAgent).
    closingsByAgent(agencyId, since, until, ids),
    prisma.lead.findMany({ where: { agencyId, agentId: { in: ids }, createdAt: { gte: since, lte: until } }, select: { id: true, agentId: true, stage: true, createdAt: true, firstResponseAt: true } }),
    prisma.tour.findMany({ where: { agentId: { in: ids }, listing: { agencyId }, OR: [{ createdAt: { gte: since, lte: until } }, { start: { gte: since, lte: until } }] }, select: { agentId: true, status: true, createdAt: true, start: true } }),
    // Captures logged by the advisor and converted into a listing of the agency (CaptureLead links to its captor).
    prisma.captureLead.findMany({ where: { agencyId, captorId: { in: ids }, listingId: { not: null }, createdAt: { gte: since, lte: until } }, select: { captorId: true, listingId: true } }),
  ]);
  const toured = new Set(
    (await prisma.tour.findMany({ where: { leadId: { in: leads.map((l) => l.id) }, status: { not: "CANCELLED" } }, select: { leadId: true } })).map((t) => t.leadId),
  );
  const inPeriod = (t: number) => t >= since.getTime() && t <= now;

  return members
    .map((m): AdvisorRow | null => {
      const mine = listings.filter((l) => l.agentId === m.userId);
      if (m.role === "AGENCY_OWNER" && !mine.length) return null;
      const captured = new Set(mine.filter((l) => inPeriod(l.createdAt.getTime())).map((l) => l.id));
      for (const c of captures) if (c.captorId === m.userId && c.listingId) captured.add(c.listingId);
      const closings = closed.get(m.userId)?.count ?? 0;
      const myLeads = leads.filter((l) => l.agentId === m.userId);
      const resp = responseMinutes(myLeads);
      const myTours = tours.filter((t) => t.agentId === m.userId);
      const rated = mine.filter((l) => l.status !== "WITHDRAWN");
      const toLead = myLeads.filter((l) => toured.has(l.id) || PAST_TOUR.includes(l.stage)).length;
      const med = median(resp);
      const avg = mean(resp);
      return {
        id: m.userId,
        name: m.user.name ?? m.user.email,
        email: m.user.email,
        hue: m.user.hue,
        role: m.role as "AGENT" | "AGENCY_OWNER",
        verified: m.verified,
        suspended: m.user.suspended,
        lastSeenAt: m.user.lastSeenAt.toISOString(),
        listings: mine.length,
        captures: captured.size,
        closings,
        leads: myLeads.length,
        answered: resp.length,
        respMedianMin: med == null ? null : Math.round(med * 10) / 10,
        respMeanMin: avg == null ? null : Math.round(avg * 10) / 10,
        slaPct: slaPct(myLeads, now),
        toursBooked: myTours.filter((t) => t.status !== "CANCELLED" && inPeriod(t.createdAt.getTime())).length,
        toursDone: myTours.filter((t) => t.status === "DONE" && inPeriod(t.start.getTime())).length,
        leadToTourPct: pct(toLead, myLeads.length),
        quality: rated.length ? Math.round(rated.reduce((s, l) => s + l.quality, 0) / rated.length) : null,
      };
    })
    .filter((r): r is AdvisorRow => !!r)
    .sort((a, b) => b.leads - a.leads || a.name.localeCompare(b.name));
}

/** Advisors the chat list can be filtered by: agents and owners of the agency. */
export async function auditAdvisors(agencyId: string) {
  const ms = await prisma.agencyMember.findMany({ where: { agencyId, role: { in: ["AGENT", "AGENCY_OWNER"] } }, include: { user: { select: { id: true, name: true, email: true } } } });
  return ms.map((m) => ({ id: m.userId, name: m.user.name ?? m.user.email, role: m.role })).sort((a, b) => a.name.localeCompare(b.name));
}

/** A thread belongs to the agency when a participant is a member, or its lead / listing is the agency's. */
export const threadScope = (agencyId: string): Prisma.MessageThreadWhereInput => ({
  OR: [{ participants: { some: { user: { memberships: { some: { agencyId } } } } } }, { lead: { agencyId } }, { listing: { agencyId } }],
});

export type ChatParticipant = { id: string; name: string; role: string; member: boolean };
export type ChatSummary = {
  id: string;
  subject: string | null;
  listing: { id: string; slug: string; titleEs: string; titleEn: string } | null;
  lead: { id: string; name: string } | null;
  participants: ChatParticipant[];
  last: { body: string; at: string; senderName: string } | null;
  messages: number;
  updatedAt: string;
};

const PARTICIPANTS = (agencyId: string) =>
  ({ select: { user: { select: { id: true, name: true, email: true, role: true, memberships: { where: { agencyId }, select: { role: true } } } } } }) satisfies Prisma.MessageThread$participantsArgs;
const LISTING = { select: { id: true, slug: true, titleEs: true, titleEn: true } } as const;
const LEAD = { select: { id: true, name: true } } as const;

type PartRow = { user: { id: string; name: string | null; email: string; role: string; memberships: { role: string }[] } };
const participant = (p: PartRow): ChatParticipant => ({ id: p.user.id, name: p.user.name ?? p.user.email, role: p.user.memberships[0]?.role ?? p.user.role, member: p.user.memberships.length > 0 });

/** Team threads, newest activity first; `agentId` (a member of the agency) narrows to that advisor's chats. */
export async function teamThreads(agencyId: string, opts: { agentId?: string | null } = {}): Promise<ChatSummary[]> {
  const where: Prisma.MessageThreadWhereInput[] = [threadScope(agencyId)];
  if (opts.agentId) {
    const member = await prisma.agencyMember.findFirst({ where: { agencyId, userId: opts.agentId }, select: { id: true } });
    if (!member) throw new ApiError("VALIDATION", { agentId: "not a member of this agency" });
    where.push({ OR: [{ participants: { some: { userId: opts.agentId } } }, { lead: { agentId: opts.agentId } }] });
  }
  const rows = await prisma.messageThread.findMany({
    where: { AND: where },
    include: {
      listing: LISTING,
      lead: LEAD,
      participants: PARTICIPANTS(agencyId),
      messages: { orderBy: { createdAt: "desc" }, take: 1, include: { sender: { select: { name: true, email: true } } } },
      _count: { select: { messages: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });
  const items = rows.map((t) => ({
    id: t.id,
    subject: t.subject,
    listing: t.listing,
    lead: t.lead,
    participants: t.participants.map(participant),
    last: t.messages[0] ? { body: t.messages[0].body.slice(0, 160), at: t.messages[0].createdAt.toISOString(), senderName: t.messages[0].sender.name ?? t.messages[0].sender.email } : null,
    messages: t._count.messages,
    updatedAt: t.updatedAt.toISOString(),
  }));
  // Latest conversation activity first (a thread's updatedAt also moves on metadata changes).
  const last = (t: ChatSummary) => new Date(t.last?.at ?? t.updatedAt).getTime();
  return items.sort((a, b) => last(b) - last(a));
}

export type ChatDetail = {
  id: string;
  subject: string | null;
  listing: ChatSummary["listing"];
  lead: ChatSummary["lead"];
  participants: ChatParticipant[];
  messages: { id: string; body: string; at: string; senderId: string; senderName: string }[];
  loggedAt: string;
};

/**
 * Full conversation, read-only, for the agency's auditor. Threads outside the agency are a 404 (existence is not revealed).
 * Every open writes an AuditLog entry ("chat.audit.view"). Participants' read state (ThreadParticipant.lastRead) is never touched.
 */
export async function openTeamThread(agencyId: string, threadId: string, actor: SessionUser): Promise<ChatDetail> {
  const t = await prisma.messageThread.findFirst({
    where: { AND: [{ id: threadId }, threadScope(agencyId)] },
    include: {
      listing: LISTING,
      lead: LEAD,
      participants: PARTICIPANTS(agencyId),
      messages: { orderBy: { createdAt: "asc" }, include: { sender: { select: { name: true, email: true } } } },
    },
  });
  if (!t) throw new ApiError("NOT_FOUND");
  const participants = t.participants.map(participant);
  const names = participants.map((p) => p.name).join(" ↔ ");
  const target = [names || threadId, t.listing?.titleEs ?? t.subject].filter(Boolean).join(" · ");
  await audit(actor.id, "chat.audit.view", target.slice(0, 240), { threadId: t.id, agencyId, listingId: t.listing?.id ?? null, leadId: t.lead?.id ?? null, messages: t.messages.length });
  return {
    id: t.id,
    subject: t.subject,
    listing: t.listing,
    lead: t.lead,
    participants,
    messages: t.messages.map((m) => ({ id: m.id, body: m.body, at: m.createdAt.toISOString(), senderId: m.senderId, senderName: m.sender.name ?? m.sender.email })),
    loggedAt: new Date().toISOString(),
  };
}

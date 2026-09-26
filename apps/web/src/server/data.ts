import "server-only";
import { prisma, type Prisma } from "@newplace/db";
import type { Role } from "@newplace/config";
import type { Agency, CaptureLead, EmailOutbox, Kind, Lead, MediaJob, Message, Offer, Tour, User, Zone } from "@/types/domain";

const initials = (name?: string | null) =>
  (name ?? "?")
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

type UserRow = Awaited<ReturnType<typeof prisma.user.findFirstOrThrow>> & { memberships?: { agencyId: string; role: Role; verified: boolean }[] };

export function userToDomain(u: UserRow): User {
  const m = u.memberships?.[0];
  return {
    id: u.id,
    name: u.name ?? u.email,
    email: u.email,
    role: (m?.role ?? u.role) as Role,
    agencyId: m?.agencyId,
    initials: initials(u.name ?? u.email),
    hue: u.hue,
    verified: m?.verified ?? !!u.emailVerified,
    phone: u.phone ?? undefined,
    lastSeen: u.lastSeenAt.toISOString(),
  };
}

export async function getUsers(where: Prisma.UserWhereInput = {}): Promise<User[]> {
  const rows = await prisma.user.findMany({ where, include: { memberships: { select: { agencyId: true, role: true, verified: true } } }, orderBy: { createdAt: "asc" } });
  return rows.map(userToDomain);
}

export async function getUser(id: string): Promise<User | null> {
  const u = await prisma.user.findUnique({ where: { id }, include: { memberships: { select: { agencyId: true, role: true, verified: true } } } });
  return u ? userToDomain(u) : null;
}

export async function getAgencies(): Promise<Agency[]> {
  const rows = await prisma.agency.findMany({ include: { commission: true }, orderBy: { createdAt: "asc" } });
  return rows.map((a) => ({
    id: a.id,
    name: a.name,
    slug: a.slug,
    verified: a.verified,
    plan: a.plan,
    city: a.city,
    phone: a.phone ?? "",
    whatsapp: a.whatsapp ?? "",
    color: a.color,
    initials: a.initials,
    commissionPct: a.commission?.salePct ?? 5,
    agentSplitPct: a.commission?.agentSplitPct ?? 50,
    createdAt: a.createdAt.toISOString(),
    status: a.status,
  }));
}

export async function getZones(): Promise<Zone[]> {
  const rows = await prisma.zone.findMany({ orderBy: { activeListings: "desc" } });
  return rows.map(({ id: _id, ...z }) => z);
}

type LeadRow = Awaited<ReturnType<typeof prisma.lead.findFirstOrThrow>>;
export function leadToDomain(l: LeadRow): Lead & { score?: number | null; nextAction?: string | null; reason?: string | null; priority?: boolean } {
  return {
    id: l.id,
    name: l.name,
    email: l.email,
    phone: l.phone ?? undefined,
    listingId: l.listingId,
    agentId: l.agentId ?? "",
    agencyId: l.agencyId ?? "",
    stage: l.stage,
    source: l.source,
    budget: l.budget ?? undefined,
    message: l.message,
    createdAt: l.createdAt.toISOString(),
    firstResponseMin: l.firstResponseAt ? Math.round((l.firstResponseAt.getTime() - l.createdAt.getTime()) / 60000) : undefined,
    messages: l.messagesCount,
    toursRequested: l.toursRequested,
    score: l.score,
    nextAction: l.nextAction,
    reason: l.reason,
    priority: l.priority,
  };
}

export async function getLeads(where: { agencyId?: string | null; agentId?: string; seekerUserId?: string }) {
  const rows = await prisma.lead.findMany({
    where: { ...(where.agencyId ? { agencyId: where.agencyId } : {}), ...(where.agentId ? { agentId: where.agentId } : {}), ...(where.seekerUserId ? { seekerUserId: where.seekerUserId } : {}) },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(leadToDomain);
}

export async function getTours(where: { agentId?: string; agencyId?: string | null; seekerUserId?: string }) {
  const rows = await prisma.tour.findMany({
    where: {
      ...(where.agentId ? { agentId: where.agentId } : {}),
      ...(where.seekerUserId ? { seekerUserId: where.seekerUserId } : {}),
      ...(where.agencyId ? { listing: { agencyId: where.agencyId } } : {}),
    },
    orderBy: { start: "asc" },
  });
  return rows.map<Tour>((t) => ({ id: t.id, listingId: t.listingId, leadId: t.leadId ?? undefined, agentId: t.agentId, seekerName: t.seekerName, start: t.start.toISOString(), status: t.status }));
}

export async function getSlots(agentId: string) {
  const rows = await prisma.tourSlot.findMany({ where: { agentId }, orderBy: [{ weekday: "asc" }, { hour: "asc" }] });
  const days: { day: number; hours: number[] }[] = [];
  for (let d = 0; d < 5; d++) days.push({ day: d, hours: rows.filter((r) => r.weekday === d).map((r) => r.hour) });
  return days;
}

export async function getCaptures(agencyId: string) {
  const rows = await prisma.captureLead.findMany({ where: { agencyId }, orderBy: { createdAt: "desc" } });
  return rows.map<CaptureLead>((c) => ({ id: c.id, address: c.address, zone: c.zone, ownerName: c.ownerName, phone: c.phone, kind: c.kind as Kind, areaM2: c.areaM2, askingPrice: c.askingPrice, result: c.result, duplicateOf: c.duplicateOfId ?? undefined, createdAt: c.createdAt.toISOString(), captorId: c.captorId }));
}

export async function getMediaJobs(where: { agencyId?: string | null; photographerId?: string }) {
  const rows = await prisma.mediaJob.findMany({
    where: { ...(where.photographerId ? { photographerId: where.photographerId } : {}), ...(where.agencyId ? { listing: { agencyId: where.agencyId } } : {}) },
    orderBy: { date: "asc" },
  });
  return rows.map<MediaJob>((m) => ({ id: m.id, listingId: m.listingId, photographerId: m.photographerId, date: m.date.toISOString(), status: m.status, checklist: { photos: m.photos, cover: m.cover, floorplan: m.floorplan, video: m.video } }));
}

export async function getOffers(listingIds: string[]) {
  const rows = await prisma.offer.findMany({ where: { listingId: { in: listingIds } }, orderBy: { createdAt: "desc" } });
  return rows.map<Offer>((o) => ({ id: o.id, listingId: o.listingId, bidder: o.bidderName, amount: o.amount, createdAt: o.createdAt.toISOString(), status: o.status, note: o.note ?? "" }));
}

export async function getThreadsFor(userId: string) {
  const threads = await prisma.messageThread.findMany({
    where: { participants: { some: { userId } } },
    include: { messages: { orderBy: { createdAt: "asc" }, include: { sender: { select: { name: true } } } }, participants: { include: { user: { select: { id: true, name: true, hue: true } } } } },
    orderBy: { updatedAt: "desc" },
  });
  return threads.map((t) => ({
    id: t.id,
    subject: t.subject,
    listingId: t.listingId,
    leadId: t.leadId,
    participants: t.participants.map((p) => ({ id: p.user.id, name: p.user.name ?? "", hue: p.user.hue })),
    messages: t.messages.map<Message>((m) => ({ id: m.id, from: m.sender.name ?? "", body: m.body, at: m.createdAt.toISOString(), mine: m.senderId === userId })),
  }));
}

export async function getEmails(to?: string) {
  const rows = await prisma.emailOutbox.findMany({ where: to ? { to } : {}, orderBy: { createdAt: "desc" }, take: 50 });
  return rows.map<EmailOutbox>((e) => ({ id: e.id, to: e.to, subject: e.subject, at: e.createdAt.toISOString(), kind: e.kind as EmailOutbox["kind"], status: e.status }));
}

export async function getFx() {
  const rows = await prisma.fxRate.findMany({ orderBy: { code: "desc" } });
  return rows.map((r) => ({ code: r.code, perUsd: r.perUsd, updatedAt: r.updatedAt.toISOString(), source: r.source }));
}

export async function getAudit(take = 12) {
  const rows = await prisma.auditLog.findMany({ include: { actor: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take });
  return rows.map((a) => ({ at: a.createdAt.toISOString(), actor: a.actor?.name ?? "Sistema", action: a.action, target: a.target }));
}

export async function getModeration() {
  const rows = await prisma.moderationReport.findMany({ where: { resolved: false }, orderBy: { createdAt: "desc" } });
  return rows.map((m) => ({ id: m.id, listingId: m.listingId, title: m.title, reason: { es: m.reasonEs, en: m.reasonEn }, reporter: m.reporter, agency: m.agency, at: m.createdAt.toISOString(), severity: m.severity as "high" | "medium" | "low" }));
}

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const s = await prisma.platformSetting.findUnique({ where: { key } });
  return (s?.value as T) ?? fallback;
}

export async function audit(actorId: string | null, action: string, target: string, data?: object) {
  await prisma.auditLog.create({ data: { actorId, action, target, data: data ?? undefined } });
}

export async function queueEmail(to: string, subject: string, kind: "ALERT" | "TOUR" | "INVITE" | "VERIFY" | "LEAD", body = "") {
  // v1: no SMTP. Emails are written to email_outbox and marked SENT (visible in /alerts → "Enviados").
  await prisma.emailOutbox.create({ data: { to, subject, kind, body, status: "SENT", sentAt: new Date() } });
}

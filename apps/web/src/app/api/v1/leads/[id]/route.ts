import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@newplace/db";
import { ApiError, body, currentUser, handler, ok, requireUser, type SessionUser } from "@/server/api";
import { isManager, leadForUser } from "@/server/access";
import { audit, leadToDomain } from "@/server/data";
import { commissionAmount } from "@/lib/commission";

type Ctx = { params: Promise<{ id: string }> };

const Patch = z.object({ stage: z.enum(["NEW", "CONTACTED", "TOUR", "OFFER", "WON", "LOST"]).optional(), priority: z.boolean().optional(), agentId: z.string().min(1).optional() });

/** Agents of the lead's agency a manager can hand the lead to. */
const assignableAgents = (agencyId: string) =>
  prisma.agencyMember.findMany({ where: { agencyId, role: "AGENT", user: { suspended: false } }, include: { user: { select: { id: true, name: true, email: true } } }, orderBy: { createdAt: "asc" } });
const canReassign = (u: SessionUser, lead: { agencyId: string | null }) => !!lead.agencyId && (u.role === "SUPERADMIN" || (isManager(u) && lead.agencyId === u.agencyId));

export const PATCH = handler(async (req: NextRequest, { params }: Ctx) => {
  const { id } = await params;
  const u = requireUser(await currentUser());
  const lead = await leadForUser(id, u);
  const b = await body(req, Patch);
  let reassign: { from: string | null; to: string; toName: string; fromName: string | null } | null = null;
  if (b.agentId !== undefined && b.agentId !== lead.agentId) {
    // Only managers of the lead's agency (or the platform) reassign, and only to an AGENT of that same agency.
    if (!canReassign(u, lead)) throw new ApiError("FORBIDDEN");
    const target = (await assignableAgents(lead.agencyId!)).find((m) => m.userId === b.agentId);
    if (!target) throw new ApiError("VALIDATION", { agentId: "not an agent of this agency" });
    const prev = lead.agentId ? await prisma.user.findUnique({ where: { id: lead.agentId }, select: { name: true, email: true } }) : null;
    reassign = { from: lead.agentId, to: target.userId, toName: target.user.name ?? target.user.email, fromName: prev ? prev.name ?? prev.email : null };
  }
  const updated = await prisma.lead.update({
    where: { id },
    data: { ...b, ...(b.stage && lead.stage === "NEW" && !lead.firstResponseAt ? { firstResponseAt: new Date() } : {}) },
  });
  if (reassign) {
    await prisma.leadEvent.create({ data: { leadId: id, type: "ASSIGN", data: reassign, actorId: u.id } });
    await audit(u.id, "lead.assign", lead.name, { from: reassign.fromName, to: reassign.toName });
    // Upcoming tours move with the lead, unless the new agent is already busy at that time (then they stay and are flagged in the timeline).
    const upcoming = await prisma.tour.findMany({ where: { leadId: id, start: { gt: new Date() }, status: { in: ["REQUESTED", "CONFIRMED"] } } });
    for (const t of upcoming) {
      const clash = await prisma.tour.findFirst({ where: { agentId: reassign.to, id: { not: t.id }, status: { in: ["REQUESTED", "CONFIRMED"] }, start: { gte: new Date(t.start.getTime() - 59 * 60e3), lte: new Date(t.start.getTime() + 59 * 60e3) } } });
      if (!clash) await prisma.tour.update({ where: { id: t.id }, data: { agentId: reassign.to } });
    }
    // The new agent joins the lead's conversation.
    const threads = await prisma.messageThread.findMany({ where: { leadId: id }, select: { id: true } });
    for (const t of threads) await prisma.threadParticipant.upsert({ where: { threadId_userId: { threadId: t.id, userId: reassign.to } }, create: { threadId: t.id, userId: reassign.to }, update: {} });
  }
  if (b.stage && b.stage !== lead.stage) {
    await prisma.leadEvent.create({ data: { leadId: id, type: "STAGE", data: { from: lead.stage, to: b.stage }, actorId: u.id } });
    await audit(u.id, "lead.stage", lead.name, { from: lead.stage, to: b.stage });
    if (b.stage === "WON") {
      const l = await prisma.listing.findUniqueOrThrow({ where: { id: lead.listingId }, include: { agency: { include: { commission: true } } } });
      const rule = l.agency?.commission;
      if (l.agencyId && rule && lead.agentId) {
        const amount = commissionAmount(l.listingType, l.priceAmount, rule);
        const data = { agencyId: l.agencyId, listingId: l.id, agentId: lead.agentId, amount, agentPart: Math.round((amount * rule.agentSplitPct) / 100) };
        // One entry per lead: WON → LOST → WON never counts twice.
        await prisma.commissionEntry.upsert({ where: { leadId: id }, create: { ...data, leadId: id }, update: data });
      }
    } else if (lead.stage === "WON") {
      await prisma.commissionEntry.deleteMany({ where: { leadId: id } });
    }
  }
  return ok(leadToDomain(updated));
});

export const GET = handler(async (_req: NextRequest, { params }: Ctx) => {
  const { id } = await params;
  const u = requireUser(await currentUser());
  const base = await leadForUser(id, u);
  const agents = canReassign(u, base) ? (await assignableAgents(base.agencyId!)).map((m) => ({ id: m.userId, name: m.user.name ?? m.user.email })) : null;
  const lead = await prisma.lead.findUniqueOrThrow({
    where: { id },
    include: { events: { orderBy: { createdAt: "asc" } }, threads: { include: { messages: { orderBy: { createdAt: "asc" }, include: { sender: { select: { name: true } } } } } } },
  });
  const messages = lead.threads.flatMap((t) => t.messages).map((m) => ({ id: m.id, from: m.sender.name ?? "", body: m.body, at: m.createdAt.toISOString(), mine: m.senderId === u.id }));
  return ok({ lead: leadToDomain(lead), events: lead.events.map((e) => ({ type: e.type, data: e.data, at: e.createdAt.toISOString() })), messages, agents });
});

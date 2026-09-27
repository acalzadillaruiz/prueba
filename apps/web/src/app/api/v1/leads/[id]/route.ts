import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@newplace/db";
import { body, currentUser, handler, ok, requireUser } from "@/server/api";
import { leadForUser } from "@/server/access";
import { leadToDomain } from "@/server/data";
import { commissionAmount } from "@/lib/commission";

type Ctx = { params: Promise<{ id: string }> };

const Patch = z.object({ stage: z.enum(["NEW", "CONTACTED", "TOUR", "OFFER", "WON", "LOST"]).optional(), priority: z.boolean().optional() });

export const PATCH = handler(async (req: NextRequest, { params }: Ctx) => {
  const { id } = await params;
  const u = requireUser(await currentUser());
  const lead = await leadForUser(id, u);
  const b = await body(req, Patch);
  const updated = await prisma.lead.update({
    where: { id },
    data: { ...b, ...(b.stage && lead.stage === "NEW" && !lead.firstResponseAt ? { firstResponseAt: new Date() } : {}) },
  });
  if (b.stage && b.stage !== lead.stage) {
    await prisma.leadEvent.create({ data: { leadId: id, type: "STAGE", data: { from: lead.stage, to: b.stage }, actorId: u.id } });
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
  await leadForUser(id, u);
  const lead = await prisma.lead.findUniqueOrThrow({
    where: { id },
    include: { events: { orderBy: { createdAt: "asc" } }, threads: { include: { messages: { orderBy: { createdAt: "asc" }, include: { sender: { select: { name: true } } } } } } },
  });
  const messages = lead.threads.flatMap((t) => t.messages).map((m) => ({ id: m.id, from: m.sender.name ?? "", body: m.body, at: m.createdAt.toISOString(), mine: m.senderId === u.id }));
  return ok({ lead: leadToDomain(lead), events: lead.events.map((e) => ({ type: e.type, data: e.data, at: e.createdAt.toISOString() })), messages });
});

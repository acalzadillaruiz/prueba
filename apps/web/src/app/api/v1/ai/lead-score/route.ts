import type { NextRequest } from "next/server";
import { prisma } from "@newplace/db";
import { z } from "zod";
import { body, currentUser, handler, ok, requireUser } from "@/server/api";
import { leadForUser } from "@/server/access";
import { aiProvider } from "@/server/ai";

/** Re-score a lead with the active provider (stored on the lead). */
export const POST = handler(async (req: NextRequest) => {
  const u = requireUser(await currentUser());
  const { leadId } = await body(req, z.object({ leadId: z.string() }));
  const lead = await leadForUser(leadId, u);
  const l = await prisma.listing.findUniqueOrThrow({ where: { id: lead.listingId } });
  const p = await aiProvider();
  const s = await p.leadScore({ createdMinutesAgo: Math.round((Date.now() - lead.createdAt.getTime()) / 60000), budget: lead.budget ?? undefined, listingPrice: l.priceAmount, source: lead.source, messages: lead.messagesCount, hasPhone: !!lead.phone, toursRequested: lead.toursRequested });
  await prisma.lead.update({ where: { id: leadId }, data: { score: s.score, nextAction: s.nextAction, reason: s.reason } });
  return ok({ provider: p.id, ...s });
});

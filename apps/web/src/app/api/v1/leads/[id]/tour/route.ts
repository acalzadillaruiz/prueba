import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@newplace/db";
import { ApiError, body, currentUser, handler, ok, requireUser } from "@/server/api";
import { queueEmail } from "@/server/data";
import { leadForUser } from "@/server/access";

type Ctx = { params: Promise<{ id: string }> };

/** Agent proposes/confirms a tour for a lead → lead stage TOUR. */
export const POST = handler(async (req: NextRequest, { params }: Ctx) => {
  const { id } = await params;
  const u = requireUser(await currentUser());
  const lead = await leadForUser(id, u);
  const { start } = await body(req, z.object({ start: z.string().datetime() }));
  const agentId = lead.agentId ?? u.id;
  const s = new Date(start);
  const clash = await prisma.tour.findFirst({ where: { agentId, leadId: { not: id }, status: { in: ["REQUESTED", "CONFIRMED"] }, start: { gte: new Date(s.getTime() - 59 * 60000), lte: new Date(s.getTime() + 59 * 60000) } } });
  if (clash) throw new ApiError("CONFLICT", { start: "slot taken" });
  const existing = await prisma.tour.findFirst({ where: { leadId: id, status: { in: ["REQUESTED", "CONFIRMED"] } } });
  const tour = existing
    ? await prisma.tour.update({ where: { id: existing.id }, data: { start: s, status: "CONFIRMED" } })
    : await prisma.tour.create({ data: { listingId: lead.listingId, leadId: id, agentId, seekerUserId: lead.seekerUserId, seekerName: lead.name, start: s, status: "CONFIRMED" } });
  await prisma.lead.update({ where: { id }, data: { stage: "TOUR", toursRequested: { increment: existing ? 0 : 1 }, ...(!lead.firstResponseAt ? { firstResponseAt: new Date() } : {}) } });
  await prisma.leadEvent.create({ data: { leadId: id, type: "TOUR", data: { start }, actorId: u.id } });
  await queueEmail(lead.email, `Visita confirmada · ${s.toLocaleString("es-VE", { timeZone: "America/Caracas", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`, "TOUR");
  return ok({ id: tour.id, start: tour.start.toISOString(), status: tour.status });
});

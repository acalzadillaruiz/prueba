import type { NextRequest } from "next/server";
import { leadSchema } from "@newplace/config";
import { prisma } from "@newplace/db";
import { ApiError, body, currentUser, handler, ok, requireUser } from "@/server/api";
import { aiProvider } from "@/server/ai";
import { leadToDomain, queueEmail } from "@/server/data";
import { isManager } from "@/server/access";
import { limit } from "@/server/rate-limit";

const Create = leadSchema;

/** Public: contact form / tour request from a listing. Creates Lead (+ Tour, thread, emails). */
export const POST = handler(async (req: NextRequest) => {
  await limit(req, "lead", 10, 10 * 60);
  const u = await currentUser();
  const b = await body(req, Create);
  const l = await prisma.listing.findUnique({ where: { id: b.listingId }, include: { agent: true, owner: true } });
  if (!l) throw new ApiError("NOT_FOUND");
  if (b.tourStart) {
    if (!l.agentId) throw new ApiError("VALIDATION", { tourStart: "listing has no agent calendar" });
    const start = new Date(b.tourStart);
    const clash = await prisma.tour.findFirst({ where: { agentId: l.agentId, status: { in: ["REQUESTED", "CONFIRMED"] }, start: { gte: new Date(start.getTime() - 59 * 60000), lte: new Date(start.getTime() + 59 * 60000) } } });
    if (clash) throw new ApiError("CONFLICT", { tourStart: "slot taken" });
  }
  const source = b.tourStart ? "TOUR_REQUEST" : "LISTING_FORM";
  const provider = await aiProvider();
  const score = await provider.leadScore({ createdMinutesAgo: 0, budget: b.budget, listingPrice: l.priceAmount, source, messages: 1, hasPhone: !!b.phone, toursRequested: b.tourStart ? 1 : 0 });
  const lead = await prisma.lead.create({
    data: {
      listingId: l.id,
      agencyId: l.agencyId,
      agentId: l.agentId,
      seekerUserId: u?.id,
      name: b.name,
      email: b.email.toLowerCase(),
      phone: b.phone || null,
      message: b.message,
      budget: b.budget,
      source,
      toursRequested: b.tourStart ? 1 : 0,
      score: score.score,
      nextAction: score.nextAction,
      reason: score.reason,
      events: { create: { type: "CREATED", data: { source, provider: provider.id }, actorId: u?.id } },
    },
  });
  if (b.tourStart && l.agentId)
    await prisma.tour.create({ data: { listingId: l.id, leadId: lead.id, agentId: l.agentId, seekerUserId: u?.id, seekerName: b.name, start: new Date(b.tourStart), virtual: !!b.virtual } });
  const participants = [l.agentId ?? l.ownerUserId, u?.id].filter((x): x is string => !!x);
  const thread = await prisma.messageThread.create({ data: { leadId: lead.id, listingId: l.id, subject: l.titleEs, participants: { create: [...new Set(participants)].map((userId) => ({ userId })) } } });
  if (u) await prisma.message.create({ data: { threadId: thread.id, senderId: u.id, body: b.message } });
  await prisma.listing.update({ where: { id: l.id }, data: { leadsCount: { increment: 1 }, interactions: { increment: 1 } } });
  const when = b.tourStart ? new Date(b.tourStart).toLocaleString("es-VE", { timeZone: "America/Caracas", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "";
  await queueEmail(b.email, b.tourStart ? `Visita solicitada: ${l.titleEs} · ${when}` : `Mensaje enviado: ${l.titleEs}`, "TOUR");
  const staff = l.agent?.email ?? l.owner?.email;
  if (staff) await queueEmail(staff, `Nuevo lead (${score.score}/100): ${b.name} · ${l.titleEs}`, "LEAD");
  return ok(leadToDomain(lead), 201);
});

/** Agency inbox (polled every 15 s). Agents see their own leads; owner/backoffice the whole agency. */
export const GET = handler(async (req: NextRequest) => {
  const u = requireUser(await currentUser());
  const stage = req.nextUrl.searchParams.get("stage");
  let where: Record<string, unknown>;
  if (u.role === "SUPERADMIN") where = u.agencyId ? { agencyId: u.agencyId } : {};
  else if (isManager(u)) where = { agencyId: u.agencyId };
  else if (u.role === "AGENT") where = { agentId: u.id };
  else if (u.role === "OWNER_PRIVATE") where = { listing: { ownerUserId: u.id } };
  else where = { seekerUserId: u.id };
  const rows = await prisma.lead.findMany({ where: { ...where, ...(stage ? { stage: stage as "NEW" } : {}) }, orderBy: { createdAt: "desc" }, take: 200 });
  return ok({ items: rows.map(leadToDomain), at: new Date().toISOString() });
});

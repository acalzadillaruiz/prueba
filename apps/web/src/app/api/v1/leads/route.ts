import type { NextRequest } from "next/server";
import { leadSchema } from "@newplace/config";
import { z } from "zod";
import { LeadStage, prisma, type Prisma } from "@newplace/db";
import { ApiError, body, currentUser, handler, ok, requireUser } from "@/server/api";
import { aiProvider } from "@/server/ai";
import { leadToDomain, queueEmail } from "@/server/data";
import { isManager } from "@/server/access";
import { limit } from "@/server/rate-limit";
import { publicWhere } from "@/server/listings";
import { assertBookableSlot, lockAgentAndCheck } from "@/server/tours";
import { bump } from "@/server/counters";
import { recipientLocale, requestLocale, tourWhen, type Loc } from "@/server/email-locale";

const Create = leadSchema;

/** Public: contact form / tour request from a listing. Creates Lead (+ Tour, thread, emails). */
export const POST = handler(async (req: NextRequest) => {
  await limit(req, "lead", 10, 10 * 60);
  const u = await currentUser();
  const b = await body(req, Create);
  // Only published listings take enquiries; tours only while the property is still available.
  const l = await prisma.listing.findFirst({ where: { AND: [{ id: b.listingId }, publicWhere({ byLink: true })] }, include: { agent: true, owner: true } });
  if (!l) throw new ApiError("NOT_FOUND");
  const tourStart = b.tourStart ? new Date(b.tourStart) : null;
  if (tourStart) {
    if (!l.agentId) throw new ApiError("VALIDATION", { tourStart: "listing has no agent calendar" });
    if (!["ACTIVE", "COMING_SOON", "UNDER_OFFER"].includes(l.status)) throw new ApiError("VALIDATION", { tourStart: "listing not available" });
    await assertBookableSlot(l.agentId, tourStart);
  }
  const source = b.tourStart ? "TOUR_REQUEST" : "LISTING_FORM";
  const provider = await aiProvider();
  const score = await provider.leadScore({ createdMinutesAgo: 0, budget: b.budget, listingPrice: l.priceAmount, source, messages: 1, hasPhone: !!b.phone, toursRequested: b.tourStart ? 1 : 0 });
  const lead = await prisma.$transaction(async (tx) => {
    if (tourStart && l.agentId) await lockAgentAndCheck(tx, l.agentId, tourStart);
    const created = await tx.lead.create({
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
    if (tourStart && l.agentId) await tx.tour.create({ data: { listingId: l.id, leadId: created.id, agentId: l.agentId, seekerUserId: u?.id, seekerName: b.name, start: tourStart, virtual: !!b.virtual } });
    return created;
  });
  const participants = [l.agentId ?? l.ownerUserId, u?.id].filter((x): x is string => !!x);
  const thread = await prisma.messageThread.create({ data: { leadId: lead.id, listingId: l.id, subject: l.titleEs, participants: { create: [...new Set(participants)].map((userId) => ({ userId })) } } });
  if (u) await prisma.message.create({ data: { threadId: thread.id, senderId: u.id, body: b.message } });
  await bump([l.id], ["leadsCount", "interactions"]);
  // Subjects in each recipient's language: the seeker's saved locale (or the language they're browsing in), the staff's.
  const seekerLoc = await recipientLocale(b.email, requestLocale(req));
  const title = (loc: Loc) => (loc === "en" && l.titleEn ? l.titleEn : l.titleEs);
  const when = tourStart ? tourWhen(tourStart, seekerLoc) : "";
  await queueEmail(
    b.email,
    tourStart ? (seekerLoc === "en" ? `We got your visit request: ${title("en")} · ${when}` : `Recibimos tu pedido de visita: ${title("es")} · ${when}`) : seekerLoc === "en" ? `We got your message: ${title("en")}` : `Recibimos tu mensaje: ${title("es")}`,
    "TOUR",
  );
  const staff = l.agent?.email ?? l.owner?.email;
  if (staff) {
    const staffLoc = await recipientLocale(staff);
    await queueEmail(staff, staffLoc === "en" ? `New lead (${score.score}/100): ${b.name} · ${title("en")}` : `Nuevo contacto (${score.score}/100): ${b.name} · ${title("es")}`, "LEAD");
  }
  return ok(leadToDomain(lead), 201);
});

// Unknown stage → 422 VALIDATION (ZodError via handler), never a Prisma 500.
const Query = z.object({ stage: z.enum(Object.values(LeadStage) as [LeadStage, ...LeadStage[]]).optional() });

/** Agency inbox (polled every 15 s). Agents see their own leads; owner/backoffice the whole agency. */
export const GET = handler(async (req: NextRequest) => {
  const u = requireUser(await currentUser());
  const q = Query.parse({ stage: req.nextUrl.searchParams.get("stage") || undefined });
  let scope: Prisma.LeadWhereInput;
  if (u.role === "SUPERADMIN") scope = u.agencyId ? { agencyId: u.agencyId } : {};
  else if (isManager(u)) scope = { agencyId: u.agencyId };
  else if (u.role === "AGENT") scope = { agentId: u.id, agencyId: u.agencyId };
  else if (u.role === "OWNER_PRIVATE") scope = { listing: { ownerUserId: u.id } };
  else scope = { seekerUserId: u.id };
  const where: Prisma.LeadWhereInput = q.stage ? { ...scope, stage: q.stage } : scope;
  const rows = await prisma.lead.findMany({ where, orderBy: { createdAt: "desc" }, take: 200 });
  return ok({ items: rows.map(leadToDomain), at: new Date().toISOString() });
});

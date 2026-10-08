import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@newplace/db";
import { ApiError, body, currentUser, handler, ok, requireUser } from "@/server/api";
import { isManager, ownsFsboTour } from "@/server/access";
import { audit, queueEmail } from "@/server/data";
import { recipientLocale, tourWhen } from "@/server/email-locale";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handler(async (req: NextRequest, { params }: Ctx) => {
  const { id } = await params;
  const u = requireUser(await currentUser());
  const t = await prisma.tour.findUnique({ where: { id }, include: { listing: { select: { agencyId: true, agentId: true, ownerUserId: true, titleEs: true, titleEn: true } }, lead: { select: { email: true } } } });
  if (!t) throw new ApiError("NOT_FOUND");
  const allowed = u.role === "SUPERADMIN" || (t.agentId === u.id && (!t.listing.agencyId || t.listing.agencyId === u.agencyId)) || t.seekerUserId === u.id || (isManager(u) && t.listing.agencyId === u.agencyId) || ownsFsboTour(t.listing, u);
  if (!allowed) throw new ApiError("FORBIDDEN");
  const b = await body(req, z.object({ status: z.enum(["CONFIRMED", "DONE", "CANCELLED"]) }));
  if (t.seekerUserId === u.id && b.status !== "CANCELLED") throw new ApiError("FORBIDDEN");
  const r = await prisma.tour.update({ where: { id }, data: { status: b.status } });
  if (b.status !== t.status) await audit(u.id, "tour.status", t.seekerName, { from: t.status, to: b.status, start: t.start.toISOString() });
  // FSBO: the owner confirms or cancels from their inbox → the visitor hears it by email, in their language.
  if (b.status !== t.status && ownsFsboTour(t.listing, u) && t.lead?.email && (b.status === "CONFIRMED" || b.status === "CANCELLED")) {
    const loc = await recipientLocale(t.lead.email);
    const title = loc === "en" && t.listing.titleEn ? t.listing.titleEn : t.listing.titleEs;
    const subject =
      b.status === "CONFIRMED"
        ? loc === "en" ? `Your visit is confirmed · ${tourWhen(t.start, loc)} · ${title}` : `Tu visita está confirmada · ${tourWhen(t.start, loc)} · ${title}`
        : loc === "en" ? `Your visit was cancelled · ${tourWhen(t.start, loc)} · ${title}` : `Tu visita se canceló · ${tourWhen(t.start, loc)} · ${title}`;
    await queueEmail(t.lead.email, subject, "TOUR");
  }
  return ok(r);
});

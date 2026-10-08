import type { NextRequest } from "next/server";
import { prisma } from "@newplace/db";
import { ApiError, currentUser, handler, ok } from "@/server/api";
import { isManager, visibleListingId } from "@/server/access";
import { isFsbo, parseVisitHours, upcomingVisitDays } from "@/lib/visit-hours";

type Ctx = { params: Promise<{ id: string }> };
const TZ_OFFSET_H = -4; // America/Caracas (no DST)

/**
 * Real availability for the next 7 days: agent weekly slots minus tours already booked. FSBO listings (no agent, no
 * agency) use the owner's visit hours instead — `owner: true`, `hasCalendar: false` when the owner hasn't set any, so the
 * page offers "request a visit". Never exposes who the owner is: only free/taken times.
 */
export const GET = handler(async (req: NextRequest, { params }: Ctx) => {
  const { id } = await params;
  // Hidden listings (draft, private, in review, taken down) → 404 unless the requester may view them —
  // or works one of its leads (the leads inbox books tours for a reassigned lead with ?agent=).
  const u = await currentUser();
  await visibleListingId(id, u).catch(async (e) => {
    const worksLead = u && (await prisma.lead.findFirst({ where: { listingId: id, OR: [{ agentId: u.id }, ...(isManager(u) && u.agencyId ? [{ agencyId: u.agencyId }] : [])] }, select: { id: true } }));
    if (!worksLead) throw e;
  });
  const l = await prisma.listing.findUnique({ where: { id }, select: { agentId: true, ownerUserId: true, agencyId: true, visitHours: true } });
  if (!l) throw new ApiError("NOT_FOUND");
  if (isFsbo(l)) {
    const hours = parseVisitHours(l.visitHours);
    if (!hours) return ok({ agentId: null, owner: true, hasCalendar: false, slotMin: null, days: [] });
    const now = Date.now();
    // The owner attends every visit of all their listings: any of their tours makes the slot busy.
    const tours = await prisma.tour.findMany({ where: { agentId: l.ownerUserId!, start: { gte: new Date(now - 3 * 3600e3), lte: new Date(now + 9 * 864e5) }, status: { in: ["REQUESTED", "CONFIRMED"] } }, select: { start: true } });
    return ok({ agentId: null, owner: true, hasCalendar: true, slotMin: hours.slotMin, days: upcomingVisitDays(hours, now, tours.map((t) => t.start)) });
  }
  // ?agent= another AGENT of the same agency (a reassigned lead is toured by its new agent).
  const requested = req.nextUrl.searchParams.get("agent");
  const agentOk = requested && l.agencyId ? await prisma.agencyMember.findFirst({ where: { userId: requested, agencyId: l.agencyId, role: "AGENT" }, select: { userId: true } }) : null;
  const agentId = agentOk?.userId ?? l.agentId;
  if (!agentId) return ok({ agentId: null, days: [] });
  const slots = await prisma.tourSlot.findMany({ where: { agentId } });
  const now = new Date();
  const from = new Date(now.getTime() + 2 * 3600e3);
  const to = new Date(now.getTime() + 8 * 864e5);
  const tours = await prisma.tour.findMany({ where: { agentId, start: { gte: new Date(now.getTime() - 3600e3), lte: to }, status: { in: ["REQUESTED", "CONFIRMED"] } }, select: { start: true } });
  // Same rule as booking (server/tours.ts): a slot is taken if any tour starts within ±59 min of it.
  const busyAt = (t: number) => tours.some((x) => Math.abs(x.start.getTime() - t) < 60 * 60e3);
  const days: { date: string; hours: { hour: number; minute: number; label: string; iso: string; available: boolean }[] }[] = [];
  for (let d = 0; d < 8 && days.length < 5; d++) {
    const local = new Date(now.getTime() + TZ_OFFSET_H * 3600e3 + d * 864e5);
    const y = local.getUTCFullYear();
    const m = local.getUTCMonth();
    const day = local.getUTCDate();
    const weekday = (local.getUTCDay() + 6) % 7; // Monday = 0
    const hours = slots.filter((s) => s.weekday === weekday).map((s) => s.hour).sort((a, b) => a - b);
    if (!hours.length) continue;
    const list = hours
      .map((h) => {
        const start = new Date(Date.UTC(y, m, day, h - TZ_OFFSET_H));
        return { hour: h, minute: 0, label: `${String(h).padStart(2, "0")}:00`, iso: start.toISOString(), available: start > from && !busyAt(start.getTime()) };
      })
      .filter((h) => new Date(h.iso) > now);
    if (list.length) days.push({ date: new Date(Date.UTC(y, m, day, 12)).toISOString(), hours: list });
  }
  return ok({ agentId, days });
});

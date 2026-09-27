import type { NextRequest } from "next/server";
import { prisma } from "@newplace/db";
import { ApiError, handler, ok } from "@/server/api";

type Ctx = { params: Promise<{ id: string }> };
const TZ_OFFSET_H = -4; // America/Caracas (no DST)

/** Real availability for the next 7 days: agent weekly slots minus tours already booked. */
export const GET = handler(async (_req: NextRequest, { params }: Ctx) => {
  const { id } = await params;
  const l = await prisma.listing.findUnique({ where: { id }, select: { agentId: true, ownerUserId: true } });
  if (!l) throw new ApiError("NOT_FOUND");
  const agentId = l.agentId;
  if (!agentId) return ok({ agentId: null, days: [] });
  const slots = await prisma.tourSlot.findMany({ where: { agentId } });
  const now = new Date();
  const from = new Date(now.getTime() + 2 * 3600e3);
  const to = new Date(now.getTime() + 8 * 864e5);
  const tours = await prisma.tour.findMany({ where: { agentId, start: { gte: new Date(now.getTime() - 3600e3), lte: to }, status: { in: ["REQUESTED", "CONFIRMED"] } }, select: { start: true } });
  // Same rule as booking (server/tours.ts): a slot is taken if any tour starts within ±59 min of it.
  const busyAt = (t: number) => tours.some((x) => Math.abs(x.start.getTime() - t) < 60 * 60e3);
  const days: { date: string; hours: { hour: number; iso: string; available: boolean }[] }[] = [];
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
        return { hour: h, iso: start.toISOString(), available: start > from && !busyAt(start.getTime()) };
      })
      .filter((h) => new Date(h.iso) > now);
    if (list.length) days.push({ date: new Date(Date.UTC(y, m, day, 12)).toISOString(), hours: list });
  }
  return ok({ agentId, days });
});

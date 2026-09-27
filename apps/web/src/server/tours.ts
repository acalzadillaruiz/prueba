import "server-only";
import { prisma, type Prisma } from "@newplace/db";
import { ApiError } from "./api";

const TZ_OFFSET_H = -4; // America/Caracas (no DST)
const HOUR = 3600e3;

/** Buyers can only book a published slot of the agent's weekly calendar, 2 h to 8 days ahead, on the hour. */
export async function assertBookableSlot(agentId: string, start: Date) {
  const now = Date.now();
  if (Number.isNaN(start.getTime()) || start.getTime() < now + 2 * HOUR - 60e3 || start.getTime() > now + 8 * 24 * HOUR) throw new ApiError("VALIDATION", { tourStart: "out of range" });
  if (start.getUTCMinutes() !== 0 || start.getUTCSeconds() !== 0) throw new ApiError("VALIDATION", { tourStart: "not a slot" });
  const local = new Date(start.getTime() + TZ_OFFSET_H * HOUR);
  const weekday = (local.getUTCDay() + 6) % 7; // Monday = 0
  const slot = await prisma.tourSlot.findFirst({ where: { agentId, weekday, hour: local.getUTCHours() } });
  if (!slot) throw new ApiError("VALIDATION", { tourStart: "not a slot" });
}

/** Staff-proposed tours: any future time within 60 days. */
export function assertFutureTour(start: Date) {
  const now = Date.now();
  if (Number.isNaN(start.getTime()) || start.getTime() < now || start.getTime() > now + 60 * 24 * HOUR) throw new ApiError("VALIDATION", { start: "out of range" });
}

/**
 * Serialises bookings per agent (Postgres advisory lock held until the transaction ends), then checks for a
 * clash within ±59 min. Two buyers racing for the same slot: one wins, the other gets 409.
 */
export async function lockAgentAndCheck(tx: Prisma.TransactionClient, agentId: string, start: Date, exceptLeadId?: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${agentId}))`;
  const clash = await tx.tour.findFirst({
    where: { agentId, ...(exceptLeadId ? { leadId: { not: exceptLeadId } } : {}), status: { in: ["REQUESTED", "CONFIRMED"] }, start: { gte: new Date(start.getTime() - 59 * 60e3), lte: new Date(start.getTime() + 59 * 60e3) } },
  });
  if (clash) throw new ApiError("CONFLICT", { tourStart: "slot taken" });
}

import "server-only";
import { Prisma, prisma } from "@newplace/db";

type Counter = "views" | "impressions" | "saves" | "leadsCount" | "interactions";

/**
 * Bumps listing performance counters without touching `updatedAt` (Prisma's @updatedAt would make every
 * listing look "updated just now" after a search or a view). Fire-and-forget safe.
 */
export async function bump(ids: string[], counters: Counter[]) {
  if (!ids.length || !counters.length) return;
  const sets = Prisma.raw(counters.map((c) => `"${c}" = "${c}" + 1`).join(", "));
  await prisma.$executeRaw`UPDATE "Listing" SET ${sets} WHERE "id" IN (${Prisma.join(ids)})`;
}

/** Decrements counters (never below 0) without touching `updatedAt`. */
export async function unbump(ids: string[], counters: Counter[]) {
  if (!ids.length || !counters.length) return;
  const sets = Prisma.raw(counters.map((c) => `"${c}" = GREATEST("${c}" - 1, 0)`).join(", "));
  await prisma.$executeRaw`UPDATE "Listing" SET ${sets} WHERE "id" IN (${Prisma.join(ids)})`;
}

/** Dwell time bounds (seconds): shorter is a bounce/noise, longer is a forgotten tab. */
export const DWELL_MIN = 1;
export const DWELL_MAX = 1800;

/**
 * Folds one measured visit into the listing's running average (`avgTimeSec` over `dwellCount` visits) in one atomic
 * statement, without touching `updatedAt`. Only listings with a public page count. Returns whether a row changed.
 */
export async function recordDwell(id: string, seconds: number): Promise<boolean> {
  const s = Math.round(Math.min(DWELL_MAX, Math.max(DWELL_MIN, seconds)));
  if (!Number.isFinite(s)) return false;
  const n = await prisma.$executeRaw`
    UPDATE "Listing" SET
      "avgTimeSec" = ROUND(("avgTimeSec"::numeric * "dwellCount" + ${s}) / ("dwellCount" + 1))::int,
      "dwellCount" = "dwellCount" + 1
    WHERE "id" = ${id} AND "review" = 'APPROVED' AND "status"::text IN ('COMING_SOON', 'ACTIVE', 'UNDER_OFFER', 'SOLD', 'RENTED')`;
  return n > 0;
}

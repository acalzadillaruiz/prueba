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

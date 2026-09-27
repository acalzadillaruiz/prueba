import "server-only";
import { prisma } from "@newplace/db";
import { ApiError } from "./api";

/**
 * Fixed-window limiter stored in Postgres so it holds across serverless instances.
 * Returns false when `key` has exceeded `max` hits within `windowSec`.
 */
export async function hit(key: string, max: number, windowSec: number): Promise<boolean> {
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowSec * 1000);
  const [row] = await prisma.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimit" ("key", "count", "resetAt") VALUES (${key}, 1, ${resetAt})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimit"."resetAt" < ${now} THEN 1 ELSE "RateLimit"."count" + 1 END,
      "resetAt" = CASE WHEN "RateLimit"."resetAt" < ${now} THEN ${resetAt} ELSE "RateLimit"."resetAt" END
    RETURNING "count"`;
  return row.count <= max;
}

export async function reset(key: string) {
  await prisma.rateLimit.deleteMany({ where: { key } });
}

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "local";
}

/** Throws RATE_LIMIT (429) when exceeded. */
export async function limit(req: Request, name: string, max: number, windowSec: number) {
  if (!(await hit(`${name}:${clientIp(req)}`, max, windowSec))) throw new ApiError("RATE_LIMIT");
}

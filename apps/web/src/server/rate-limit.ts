import "server-only";
import { prisma } from "@newplace/db";
import { ApiError } from "./api";

/**
 * Fixed-window limiter stored in Postgres so it holds across serverless instances.
 * Returns false when `key` has exceeded `max` hits within `windowSec`.
 */
/** Upstash Redis (REST) when configured: atomic INCR + EXPIRE NX in one round trip, no DB load. */
async function hitRedis(key: string, windowSec: number): Promise<number | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    const r = await fetch(`${url.replace(/\/$/, "")}/pipeline`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify([["INCR", `np:rl:${key}`], ["EXPIRE", `np:rl:${key}`, String(windowSec), "NX"]]),
      signal: AbortSignal.timeout(2000),
    });
    if (!r.ok) return null;
    const [incr] = (await r.json()) as { result: number }[];
    return typeof incr?.result === "number" ? incr.result : null;
  } catch {
    return null; // Redis unavailable → fall back to Postgres
  }
}

export async function hit(key: string, max: number, windowSec: number): Promise<boolean> {
  const viaRedis = await hitRedis(key, windowSec);
  if (viaRedis !== null) return viaRedis <= max;
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

/** Current count in the window without incrementing (login lockout check). */
export async function peek(key: string): Promise<number> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    try {
      const r = await fetch(`${url.replace(/\/$/, "")}/get/np:rl:${encodeURIComponent(key)}`, { headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(2000) });
      if (r.ok) return Number(((await r.json()) as { result: string | null }).result ?? 0);
    } catch {}
  }
  const row = await prisma.rateLimit.findUnique({ where: { key } });
  return row && row.resetAt > new Date() ? row.count : 0;
}

export async function reset(key: string) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) await fetch(`${url.replace(/\/$/, "")}/del/np:rl:${encodeURIComponent(key)}`, { method: "POST", headers: { authorization: `Bearer ${token}` } }).catch(() => {});
  await prisma.rateLimit.deleteMany({ where: { key } });
}

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "local";
}

/** Throws RATE_LIMIT (429) when exceeded. Per-IP limits apply in production only (dev and e2e share one IP). */
export async function limit(req: Request, name: string, max: number, windowSec: number) {
  if (process.env.NODE_ENV !== "production" && process.env.RATE_LIMIT !== "on") return;
  if (!(await hit(`${name}:${clientIp(req)}`, max, windowSec))) throw new ApiError("RATE_LIMIT");
}

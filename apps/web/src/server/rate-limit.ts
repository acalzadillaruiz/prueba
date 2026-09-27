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

/**
 * Headers that carry the client IP and are only trustworthy when the platform in front of us overwrites them.
 * On Vercel the edge sets `x-vercel-forwarded-for` / `x-real-ip`; anywhere else a client can send them itself
 * (sending a random `x-vercel-forwarded-for` per request used to bypass every per-IP limit), so they are ignored
 * unless the operator names the header its own proxy sets: TRUSTED_IP_HEADER=x-real-ip | cf-connecting-ip | …
 */
function trustedIpHeaders(): string[] {
  const custom = process.env.TRUSTED_IP_HEADER?.trim().toLowerCase();
  if (custom) return [custom];
  return process.env.VERCEL ? ["x-vercel-forwarded-for", "x-real-ip"] : [];
}

/**
 * Client IP for rate-limit keys. The first X-Forwarded-For entry is whatever the client sent, so it is never
 * trusted: use a trusted platform/proxy header (see above), else the LAST X-Forwarded-For hop — the one appended
 * by the proxy in front of us (Next.js itself only fills X-Forwarded-For with the socket address when absent).
 */
export function clientIp(req: Request): string {
  const first = (v: string | null) => v?.split(",")[0]?.trim() || null;
  for (const h of trustedIpHeaders()) {
    const v = first(req.headers.get(h));
    if (v) return v;
  }
  const hops = (req.headers.get("x-forwarded-for") ?? "").split(",").map((h) => h.trim()).filter(Boolean);
  return hops.at(-1) ?? "local";
}

/** Like `limit` but returns false instead of throwing (Auth.js `authorize` must return null, not throw). */
export async function allowed(req: Request, name: string, max: number, windowSec: number): Promise<boolean> {
  if (process.env.NODE_ENV !== "production" && process.env.RATE_LIMIT !== "on") return true;
  return hit(`${name}:${clientIp(req)}`, max, windowSec);
}

/** Throws RATE_LIMIT (429) when exceeded. Per-IP limits apply in production only (dev and e2e share one IP). */
export async function limit(req: Request, name: string, max: number, windowSec: number) {
  if (process.env.NODE_ENV !== "production" && process.env.RATE_LIMIT !== "on") return;
  if (!(await hit(`${name}:${clientIp(req)}`, max, windowSec))) throw new ApiError("RATE_LIMIT");
}

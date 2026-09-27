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

/** Number of reverse proxies in front of the app that APPEND to X-Forwarded-For (nginx, Caddy, a load balancer…). */
function trustedProxyHops(): number {
  const n = Number(process.env.TRUSTED_PROXY_HOPS);
  return Number.isInteger(n) && n > 0 ? Math.min(n, 10) : 0;
}

/** Shared bucket for requests whose origin can't be established from trustworthy data (see clientIp). */
export const UNTRUSTED_IP = "direct";

/**
 * Client IP for rate-limit keys, from trustworthy data only:
 * 1. TRUSTED_IP_HEADER (the header your own proxy overwrites), or Vercel's edge headers when running on Vercel;
 * 2. TRUSTED_PROXY_HOPS=N → the N-th X-Forwarded-For entry counted from the RIGHT: the address appended by the
 *    outermost of your N proxies (entries to its left were sent by the client and are never trusted);
 * 3. otherwise the app is assumed to be exposed directly: X-Forwarded-For is entirely client-controlled (Next.js
 *    only fills it with the socket address when the client sent none), so rotating it must not create fresh
 *    buckets. Every request shares the `direct` bucket; per-account limits (login, lead, register) still apply.
 */
export function clientIp(req: Request): string {
  const first = (v: string | null) => v?.split(",")[0]?.trim() || null;
  for (const h of trustedIpHeaders()) {
    const v = first(req.headers.get(h));
    if (v) return v;
  }
  const hops = trustedProxyHops();
  if (hops) {
    const xff = (req.headers.get("x-forwarded-for") ?? "").split(",").map((h) => h.trim()).filter(Boolean);
    const ip = xff.at(-hops);
    if (ip) return ip;
  }
  if (process.env.NODE_ENV === "production" && !warnedUntrusted) {
    warnedUntrusted = true;
    console.warn("[rate-limit] No trusted client-IP source (TRUSTED_IP_HEADER / TRUSTED_PROXY_HOPS / Vercel): per-IP limits share one bucket. See docs/DEPLOY.md.");
  }
  return UNTRUSTED_IP;
}
let warnedUntrusted = false;

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

/**
 * Login brute-force guard. Failures are counted per account AND client IP (10 / 15 min), so a third party can't
 * lock a victim out with a handful of wrong passwords from their own address; a much higher per-account ceiling
 * (50 / 15 min, only fed while the per-IP budget isn't exhausted) still stops distributed guessing. Counted
 * atomically BEFORE the password check; a successful login clears both keys (`reset` each of `keys`).
 */
export async function loginAttempt(req: Request, email: string): Promise<{ ok: boolean; keys: string[] }> {
  const keys = [`login-fail:${email}:${clientIp(req)}`, `login-fail:${email}`];
  if (!(await hit(keys[0], 10, 15 * 60))) return { ok: false, keys };
  return { ok: await hit(keys[1], 50, 15 * 60), keys };
}

import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/** Email verification links: `<payload>.<sig>`, HMAC-SHA256 with AUTH_SECRET, valid 48 h, bound to the address. */
export const VERIFY_TTL_MS = 48 * 60 * 60 * 1000;

const b64 = (s: string | Buffer) => Buffer.from(s).toString("base64url");

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is required to sign email verification links");
  return s;
}

const sign = (payload: string) => createHmac("sha256", secret()).update(`email-verify:${payload}`).digest();

export function signVerifyToken(userId: string, email: string, now = Date.now()): string {
  const payload = b64(JSON.stringify({ u: userId, e: email.toLowerCase(), x: now + VERIFY_TTL_MS }));
  return `${payload}.${b64(sign(payload))}`;
}

export function readVerifyToken(token: string, now = Date.now()): { userId: string; email: string } | null {
  if (token.length > 1000) return null;
  const [payload, sig, extra] = token.split(".");
  if (!payload || !sig || extra !== undefined) return null;
  const want = sign(payload);
  const got = Buffer.from(sig, "base64url");
  if (got.length !== want.length || !timingSafeEqual(got, want)) return null;
  try {
    const p = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { u?: unknown; e?: unknown; x?: unknown };
    if (typeof p.u !== "string" || typeof p.e !== "string" || typeof p.x !== "number" || p.x < now) return null;
    return { userId: p.u, email: p.e };
  } catch {
    return null;
  }
}

/** Path queued in the email body (email.ts turns it into the absolute button link). */
export const verifyPath = (userId: string, email: string) => `/api/v1/auth/verify?token=${signVerifyToken(userId, email)}`;

/**
 * Temporary pre-launch gate: while SITE_ACCESS_CODE is set, every page asks for that fixed code first.
 * The code lives only in the environment (never in the repo); remove the variable to open the site.
 * The cookie holds a SHA-256 of the code + AUTH_SECRET, so it can't be forged and changing the code logs everyone out.
 * Edge-safe (Web Crypto only): used by the middleware and by the access route.
 */
export const GATE_COOKIE = "np_gate";

export const gateCode = () => process.env.SITE_ACCESS_CODE?.trim() || "";

export async function gateToken(): Promise<string> {
  const data = new TextEncoder().encode(`${gateCode()}:${process.env.AUTH_SECRET ?? ""}:np-gate-v1`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Only same-site paths are allowed as the post-unlock destination (no open redirects). */
export function safeNext(next: string | null | undefined, fallback: string): string {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : fallback;
}

function readCookie(header: string | null, name: string): string | undefined {
  for (const part of (header ?? "").split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return undefined;
}

/** True when the gate is off or the request carries a valid gate cookie (the middleware's check, for route code). */
export async function gatePassed(req: { headers: Headers }): Promise<boolean> {
  if (!gateCode()) return true;
  return readCookie(req.headers.get("cookie"), GATE_COOKIE) === (await gateToken());
}

import { GATE_COOKIE, gateCode, gateToken, safeNext } from "@/lib/site-gate";
import { allowed, clientIp, hit, UNTRUSTED_IP } from "@/server/rate-limit";
import { redirectTo } from "@/server/redirect";

/** Pre-launch gate: checks the fixed access code (form POST) and sets the signed cookie. */
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const locale = form?.get("locale") === "en" ? "en" : "es";
  const next = safeNext(String(form?.get("next") ?? ""), `/${locale}`);
  const back = (error: string) => redirectTo(`/${locale}/acceso?error=${error}&next=${encodeURIComponent(next)}`);
  const code = gateCode();
  if (!code) return redirectTo(next);
  // 6-digit codes are guessable: 10 tries per 15 min per client, and a site-wide ceiling against distributed guessing.
  // Behind a proxy with no trusted client-IP source every visitor shares one bucket: a few typos by one person must
  // not lock everyone out, so that shared bucket is wider (the site-wide hourly ceiling below still caps guessing).
  const shared = clientIp(req) === UNTRUSTED_IP;
  if (!(await allowed(req, "gate", shared ? 60 : 10, 900))) return back("limit");
  if (process.env.NODE_ENV === "production" && !(await hit("gate-all", 300, 3600))) return back("limit");
  const given = String(form?.get("code") ?? "").replace(/\s+/g, "");
  let diff = given.length ^ code.length;
  for (let i = 0; i < code.length; i++) diff |= code.charCodeAt(i) ^ (given.charCodeAt(i) || 0);
  if (diff !== 0) return back("code");
  const res = redirectTo(next);
  res.cookies.set(GATE_COOKIE, await gateToken(), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 30 });
  return res;
}

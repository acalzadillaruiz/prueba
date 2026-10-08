import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { authConfig } from "./auth.config";
import { routing } from "./i18n/routing";
import { GATE_COOKIE, gateCode, gateToken } from "./lib/site-gate";

const intl = createIntlMiddleware(routing);

const { auth } = NextAuth(authConfig);

const AGENCY_ROLES = ["AGENCY_OWNER", "AGENT", "CAPTOR", "PHOTOGRAPHER", "BACKOFFICE", "SUPERADMIN"];

export default auth(async (req) => {
  const { pathname, search } = req.nextUrl;
  // Pre-launch gate (SITE_ACCESS_CODE): every page and API asks for the access code until the cookie is set.
  // The API is gated too: otherwise the demo sign-in (/api/auth/callback/demo) and /api/v1 bypass the preview.
  const isApi = pathname === "/api" || pathname.startsWith("/api/");
  if (gateCode() && !/^\/(es|en)\/acceso\/?$/.test(pathname) && pathname !== "/api/access" && req.cookies.get(GATE_COOKIE)?.value !== (await gateToken())) {
    const wantsPage = req.method === "GET" && (req.headers.get("accept") ?? "").includes("text/html");
    if (isApi && !wantsPage) return NextResponse.json({ error: "site_locked" }, { status: 401, headers: { "X-Robots-Tag": "noindex", "Cache-Control": "no-store" } });
    const gate = new URL(`/${pathname.match(/^\/(en)(\/|$)/) ? "en" : "es"}/acceso`, req.url);
    gate.searchParams.set("next", pathname + search);
    const res = NextResponse.redirect(gate);
    res.headers.set("X-Robots-Tag", "noindex");
    return res;
  }
  if (isApi) return NextResponse.next();
  const m = pathname.match(/^\/(es|en)\/(agency|platform|owner|app|account|saved|alerts|preview)(\/|$)/);
  // locale detection / prefixing (Accept-Language + NEXT_LOCALE cookie)
  if (!m) return intl(req);
  const [, locale, area] = m;
  const user = req.auth?.user;
  const login = new URL(`/${locale}/login`, req.url);
  login.searchParams.set("next", pathname + search);
  // /owner/new is reachable anonymously (the wizard asks to sign in before publishing)
  if (!user) return pathname.startsWith(`/${locale}/owner/new`) ? NextResponse.next() : NextResponse.redirect(login);
  if (area === "platform" && user.role !== "SUPERADMIN") return NextResponse.redirect(new URL(`/${locale}?denied=platform`, req.url));
  if (area === "agency" && !AGENCY_ROLES.includes(user.role)) return NextResponse.redirect(new URL(`/${locale}?denied=agency`, req.url));
  return intl(req);
});

export const config = { matcher: ["/((?!uploads|photos|icons|_next|_vercel|sw.js|swe-worker|offline|robots.txt|sitemap.xml|manifest.webmanifest|.*\\..*).*)"] };

import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { authConfig } from "./auth.config";
import { routing } from "./i18n/routing";
import { GATE_COOKIE, gateCode, gateToken, lockedApiResponse } from "./lib/site-gate";

const intl = createIntlMiddleware(routing);

const { auth } = NextAuth(authConfig);

/** 043-C: a visitor asking to save data (Save-Data: on) gets a readable cookie, so the hero never loads its video. */
function saveData<T extends NextResponse | Response>(req: Request, res: T): T {
  if ((req.headers.get("save-data") ?? "").toLowerCase() === "on" && res instanceof NextResponse) res.cookies.set("np-save-data", "1", { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 });
  return res;
}

const AGENCY_ROLES = ["AGENCY_OWNER", "AGENT", "CAPTOR", "PHOTOGRAPHER", "BACKOFFICE", "SUPERADMIN"];

export default auth(async (req) => {
  const { pathname, search } = req.nextUrl;
  // Pre-launch gate (SITE_ACCESS_CODE): every page and API asks for the access code until the cookie is set.
  // The API is gated too: otherwise the demo sign-in (/api/auth/callback/demo) and /api/v1 bypass the preview.
  const isApi = pathname === "/api" || pathname.startsWith("/api/");
  if (gateCode() && !/^\/(es|en)\/acceso\/?$/.test(pathname) && pathname !== "/api/access" && req.cookies.get(GATE_COOKIE)?.value !== (await gateToken())) {
    const wantsPage = req.method === "GET" && (req.headers.get("accept") ?? "").includes("text/html");
    if (isApi && !wantsPage) {
      const locked = lockedApiResponse(pathname);
      return NextResponse.json(locked.body, { status: locked.status, headers: { "X-Robots-Tag": "noindex", "Cache-Control": "no-store" } });
    }
    const gate = new URL(`/${pathname.match(/^\/(en)(\/|$)/) ? "en" : "es"}/acceso`, req.url);
    gate.searchParams.set("next", pathname + search);
    const res = NextResponse.redirect(gate);
    res.headers.set("X-Robots-Tag", "noindex");
    return res;
  }
  if (isApi) return NextResponse.next();
  const m = pathname.match(/^\/(es|en)\/(agency|platform|owner|app|account|saved|alerts|preview)(\/|$)/);
  // locale detection / prefixing (Accept-Language + NEXT_LOCALE cookie)
  if (!m) return saveData(req, intl(req));
  const [, locale, area] = m;
  const user = req.auth?.user;
  const login = new URL(`/${locale}/login`, req.url);
  login.searchParams.set("next", pathname + search);
  // /owner/new is reachable anonymously (the wizard asks to sign in before publishing); /saved shows the homes a
  // visitor saved on this device (they move into the account on sign-in).
  if (!user) return pathname.startsWith(`/${locale}/owner/new`) || area === "saved" ? NextResponse.next() : NextResponse.redirect(login);
  if (area === "platform" && user.role !== "SUPERADMIN") return NextResponse.redirect(new URL(`/${locale}?denied=platform`, req.url));
  if (area === "agency" && !AGENCY_ROLES.includes(user.role)) return NextResponse.redirect(new URL(`/${locale}?denied=agency`, req.url));
  return intl(req);
});

export const config = { matcher: ["/((?!uploads|photos|icons|_next|_vercel|sw.js|swe-worker|offline|robots.txt|sitemap.xml|manifest.webmanifest|.*\\..*).*)"] };

import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "./auth.config";

const { auth } = NextAuth(authConfig);

const AGENCY_ROLES = ["AGENCY_OWNER", "AGENT", "CAPTOR", "PHOTOGRAPHER", "BACKOFFICE", "SUPERADMIN"];

export default auth((req) => {
  const { pathname, search } = req.nextUrl;
  if (pathname === "/") return NextResponse.redirect(new URL("/es", req.url));
  const m = pathname.match(/^\/(es|en)\/(agency|platform|owner|app|account|saved|alerts)(\/|$)/);
  if (!m) return NextResponse.next();
  const [, locale, area] = m;
  const user = req.auth?.user;
  const login = new URL(`/${locale}/login`, req.url);
  login.searchParams.set("next", pathname + search);
  // /owner/new is reachable anonymously (the wizard asks to sign in before publishing)
  if (!user) return pathname.startsWith(`/${locale}/owner/new`) ? NextResponse.next() : NextResponse.redirect(login);
  if (area === "platform" && user.role !== "SUPERADMIN") return NextResponse.redirect(new URL(`/${locale}?denied=platform`, req.url));
  if (area === "agency" && !AGENCY_ROLES.includes(user.role)) return NextResponse.redirect(new URL(`/${locale}?denied=agency`, req.url));
  return NextResponse.next();
});

export const config = { matcher: ["/", "/(es|en)/:path*"] };

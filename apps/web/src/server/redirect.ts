import { NextResponse } from "next/server";

/**
 * Same-site redirect with a relative Location header.
 * Behind a reverse proxy (Hostinger) the request URL the server sees is the internal one
 * (http://0.0.0.0:3000), so building an absolute URL from req.url sends visitors there.
 * A relative Location is resolved by the browser against the address it actually used.
 */
export function redirectTo(path: string, status: 302 | 303 | 307 = 303): NextResponse {
  if (!path.startsWith("/") || path.startsWith("//") || path.startsWith("/\\")) path = "/";
  return new NextResponse(null, { status, headers: { Location: path } });
}

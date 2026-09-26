import { NextResponse, type NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/") return NextResponse.redirect(new URL("/es", req.url));
  return NextResponse.next();
}
export const config = { matcher: ["/"] };

import type { NextRequest } from "next/server";
import { prisma } from "@newplace/db";
import { handler } from "@/server/api";
import { redirectTo } from "@/server/redirect";
import { readVerifyToken } from "@/server/email-verify";
import { requestLocale } from "@/server/email-locale";

/** Email verification link target: marks the address verified and lands on /{locale}/account?verified=1 (0 if invalid/expired). */
export const GET = handler(async (req: NextRequest) => {
  const t = readVerifyToken(req.nextUrl.searchParams.get("token") ?? "");
  const user = t ? await prisma.user.findUnique({ where: { id: t.userId }, select: { id: true, email: true, emailVerified: true, locale: true } }) : null;
  // Bound to the address it was sent to: a token for an old email never verifies a changed one.
  const ok = !!user && user.email === t!.email;
  if (ok && !user.emailVerified) await prisma.user.update({ where: { id: user.id }, data: { emailVerified: new Date() } });
  const loc = user?.locale === "en" || user?.locale === "es" ? user.locale : requestLocale(req);
  return redirectTo(`/${loc}/account?verified=${ok ? 1 : 0}`, 307);
});

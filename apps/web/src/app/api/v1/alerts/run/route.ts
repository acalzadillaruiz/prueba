import { createHash, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { prisma } from "@newplace/db";
import { ApiError, currentUser, handler, ok } from "@/server/api";
import { queueEmail } from "@/server/data";
import { alertSubject, alertSubjectName } from "@/lib/emailSubject";

/** Constant-time comparison (hashes first so lengths never differ). */
const sameSecret = (a: string, b: string) => timingSafeEqual(createHash("sha256").update(a).digest(), createHash("sha256").update(b).digest());

/**
 * Daily / weekly alert digests → email_outbox. Call from a cron (e.g. every hour):
 *   curl -X POST -H "authorization: Bearer $CRON_SECRET" https://…/api/v1/alerts/run
 * Superadmins can also trigger it manually.
 */
export const POST = handler(async (req: NextRequest) => {
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const cronOk = !!process.env.CRON_SECRET && !!bearer && sameSecret(bearer, process.env.CRON_SECRET);
  if (!cronOk) {
    const u = await currentUser();
    if (u?.role !== "SUPERADMIN") throw new ApiError("FORBIDDEN");
  }
  const now = Date.now();
  const due = await prisma.savedSearch.findMany({
    where: {
      newCount: { gt: 0 },
      OR: [
        { frequency: "DAILY", OR: [{ lastSentAt: null }, { lastSentAt: { lt: new Date(now - 864e5) } }] },
        { frequency: "WEEKLY", OR: [{ lastSentAt: null }, { lastSentAt: { lt: new Date(now - 7 * 864e5) } }] },
      ],
    },
    include: { user: { select: { email: true, locale: true } } },
  });
  for (const s of due) {
    const loc = s.user.locale === "en" ? "en" : "es";
    await queueEmail(s.user.email, alertSubject.digest(s.newCount, alertSubjectName(s, loc), loc), "ALERT", `/${loc}/search?${s.query}`);
    await prisma.savedSearch.update({ where: { id: s.id }, data: { lastSentAt: new Date(), newCount: 0 } });
  }
  return ok({ sent: due.length });
});

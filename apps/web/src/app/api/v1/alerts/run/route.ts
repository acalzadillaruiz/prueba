import type { NextRequest } from "next/server";
import { prisma } from "@newplace/db";
import { ApiError, currentUser, handler, ok } from "@/server/api";
import { queueEmail } from "@/server/data";

/**
 * Daily / weekly alert digests → email_outbox. Call from a cron (e.g. every hour):
 *   curl -X POST -H "authorization: Bearer $CRON_SECRET" https://…/api/v1/alerts/run
 * Superadmins can also trigger it manually.
 */
export const POST = handler(async (req: NextRequest) => {
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const cronOk = !!process.env.CRON_SECRET && bearer === process.env.CRON_SECRET;
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
    include: { user: { select: { email: true } } },
  });
  for (const s of due) {
    await queueEmail(s.user.email, `${s.newCount} nuevos en «${s.name}»`, "ALERT", `/es/search?${s.query}`);
    await prisma.savedSearch.update({ where: { id: s.id }, data: { lastSentAt: new Date(), newCount: 0 } });
  }
  return ok({ sent: due.length });
});

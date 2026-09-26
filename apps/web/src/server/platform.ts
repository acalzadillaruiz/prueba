import "server-only";
import { prisma } from "@newplace/db";
import { aiKeyConfigured } from "./ai";
import { getAgencies, getAudit, getSetting } from "./data";

const DAY = 864e5;

export async function platformHome() {
  const now = Date.now();
  const [agencies, counts, users, active, leads7d, leadsPrev, responded, leads12w, outbox, aiSetting] = await Promise.all([
    getAgencies(),
    prisma.listing.groupBy({ by: ["agencyId"], _count: true }),
    prisma.user.count(),
    prisma.listing.count({ where: { status: "ACTIVE" } }),
    prisma.lead.count({ where: { createdAt: { gte: new Date(now - 7 * DAY) } } }),
    prisma.lead.count({ where: { createdAt: { gte: new Date(now - 14 * DAY), lt: new Date(now - 7 * DAY) } } }),
    prisma.lead.findMany({ where: { firstResponseAt: { not: null } }, select: { createdAt: true, firstResponseAt: true }, take: 500, orderBy: { createdAt: "desc" } }),
    prisma.lead.findMany({ where: { createdAt: { gte: new Date(now - 84 * DAY) } }, select: { createdAt: true } }),
    prisma.emailOutbox.count(),
    getSetting("aiProvider", "heuristic"),
  ]);
  const resp = responded.map((l) => (l.firstResponseAt!.getTime() - l.createdAt.getTime()) / 60000).sort((a, b) => a - b);
  const weekly = Array.from({ length: 12 }, (_, i) => {
    const s = now - (12 - i) * 7 * DAY;
    const e = s + 7 * DAY;
    const d = new Date(e);
    return { label: `${d.getUTCDate()}/${d.getUTCMonth() + 1}`, value: leads12w.filter((l) => l.createdAt.getTime() >= s && l.createdAt.getTime() < e).length };
  });
  const listingCount = await prisma.listing.count();
  return {
    agencies: agencies.map((a) => ({ ...a, listings: counts.find((c) => c.agencyId === a.id)?._count ?? 0 })),
    users,
    activeListings: active,
    leads7d,
    leadsPrev7d: leadsPrev,
    firstResponseMin: resp.length ? Math.round(resp[Math.floor(resp.length / 2)]) : null,
    weekly,
    health: [
      { k: "PostgreSQL", v: `${listingCount} listings · ${users} users`, ok: true },
      { k: "AI", v: aiSetting === "openai-compatible" ? (aiKeyConfigured() ? `openai-compatible · ${process.env.AI_MODEL}` : "openai-compatible (sin key → heuristic)") : "heuristic", ok: aiSetting === "heuristic" || aiKeyConfigured() },
      { k: "Google Maps", v: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ? "API key OK" : "sin key → mapa ilustrado", ok: !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY },
      { k: "Auth", v: ["Credentials", process.env.AUTH_GOOGLE_ID ? "Google" : null, process.env.DEMO_AUTH === "true" ? "DEMO" : null].filter(Boolean).join(" + "), ok: true },
      { k: "Email outbox", v: `${outbox} · SMTP off (v1)`, ok: true },
      { k: "Storage", v: process.env.STORAGE === "s3" ? "S3" : "Local /uploads", ok: true },
    ],
    audit: await getAudit(10),
  };
}

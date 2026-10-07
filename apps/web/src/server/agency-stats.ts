import "server-only";
import { prisma } from "@newplace/db";
import { slaPct } from "@/lib/team-metrics";

const DAY = 864e5;

export interface DashboardStats {
  activeListings: number;
  activeDelta: number;
  leads7d: number;
  leadsDeltaPct: number;
  convTourPct: number;
  avgDaysToTour: number | null;
  slaPct: number | null;
  perDay: { date: string; value: number }[];
  funnel: { NEW: number; CONTACTED: number; TOUR: number; OFFER: number; WON: number };
  ranking: { id: string; name: string; hue: number; leads: number; won: number; respMin: number | null; gmv: number }[];
}

/** KPIs for the agency owner (whole agency) or an agent (own scope). All computed from live data. */
export async function dashboardStats(agencyId: string, agentId?: string): Promise<DashboardStats> {
  const now = Date.now();
  const scope = { agencyId, ...(agentId ? { agentId } : {}) };
  const since30 = new Date(now - 30 * DAY);
  const [active, activeOld, leads30, leadsPrev, tours, members] = await Promise.all([
    prisma.listing.count({ where: { ...scope, status: { in: ["ACTIVE", "UNDER_OFFER"] } } }),
    prisma.listing.count({ where: { ...scope, status: { in: ["ACTIVE", "UNDER_OFFER"] }, publishedAt: { lt: new Date(now - 30 * DAY) } } }),
    prisma.lead.findMany({ where: { ...scope, createdAt: { gte: since30 } }, select: { id: true, stage: true, createdAt: true, firstResponseAt: true, agentId: true, budget: true } }),
    prisma.lead.count({ where: { ...scope, createdAt: { gte: new Date(now - 14 * DAY), lt: new Date(now - 7 * DAY) } } }),
    prisma.tour.findMany({ where: { listing: { agencyId }, ...(agentId ? { agentId } : {}), leadId: { not: null } }, select: { leadId: true, start: true } }),
    prisma.agencyMember.findMany({ where: { agencyId, role: "AGENT", ...(agentId ? { userId: agentId } : {}) }, include: { user: { select: { id: true, name: true, hue: true } } } }),
  ]);
  const leads7d = leads30.filter((l) => l.createdAt.getTime() >= now - 7 * DAY).length;
  // Day buckets in America/Caracas (UTC-4), matching the labels the chart prints.
  const TZ = -4 * 3600e3;
  const todayLocal = Math.floor((now + TZ) / DAY) * DAY - TZ;
  const perDay = Array.from({ length: 14 }, (_, i) => {
    const start = todayLocal - (13 - i) * DAY;
    const end = start + DAY;
    return { date: new Date(start + 12 * 3600e3).toISOString(), value: leads30.filter((l) => l.createdAt.getTime() >= start && l.createdAt.getTime() < end).length };
  });
  const order = ["NEW", "CONTACTED", "TOUR", "OFFER", "WON"] as const;
  const reached = (stage: (typeof order)[number]) => leads30.filter((l) => l.stage !== "LOST" && order.indexOf(l.stage as (typeof order)[number]) >= order.indexOf(stage)).length;
  const funnel = { NEW: leads30.length, CONTACTED: reached("CONTACTED"), TOUR: reached("TOUR"), OFFER: reached("OFFER"), WON: reached("WON") };
  const firstTour = new Map<string, number>();
  for (const t of tours) if (t.leadId && (!firstTour.has(t.leadId) || t.start.getTime() < firstTour.get(t.leadId)!)) firstTour.set(t.leadId, t.start.getTime());
  const allLeads = await prisma.lead.findMany({ where: { id: { in: [...firstTour.keys()] } }, select: { id: true, createdAt: true } });
  const gaps = allLeads.map((l) => (firstTour.get(l.id)! - l.createdAt.getTime()) / DAY).filter((g) => g >= 0);
  // SLA over every lead old enough to judge: unanswered leads past 15 min count as breached (not ignored).
  const sla = slaPct(leads30, now);
  const won = await prisma.commissionEntry.findMany({ where: { agencyId, ...(agentId ? { agentId } : {}) }, include: { listing: { select: { priceAmount: true } } } });
  const ranking = members
    .map((m) => {
      const mine = leads30.filter((l) => l.agentId === m.userId);
      const resp = mine.filter((l) => l.firstResponseAt).map((l) => (l.firstResponseAt!.getTime() - l.createdAt.getTime()) / 60000);
      return {
        id: m.userId,
        name: m.user.name ?? "",
        hue: m.user.hue,
        leads: mine.length,
        won: won.filter((w) => w.agentId === m.userId).length,
        respMin: resp.length ? Math.round(resp.reduce((a, b) => a + b, 0) / resp.length) : null,
        gmv: won.filter((w) => w.agentId === m.userId).reduce((s, w) => s + w.listing.priceAmount, 0),
      };
    })
    .sort((a, b) => b.won - a.won || b.leads - a.leads);
  return {
    activeListings: active,
    activeDelta: active - activeOld,
    leads7d,
    leadsDeltaPct: leadsPrev ? Math.round(((leads7d - leadsPrev) / leadsPrev) * 100) : leads7d ? 100 : 0,
    convTourPct: leads30.length ? Math.round((funnel.TOUR / leads30.length) * 100) : 0,
    avgDaysToTour: gaps.length ? Math.round((gaps.reduce((a, b) => a + b, 0) / gaps.length) * 10) / 10 : null,
    slaPct: sla,
    perDay,
    funnel,
    ranking,
  };
}

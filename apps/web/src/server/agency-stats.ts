import "server-only";
import { prisma } from "@newplace/db";
import { slaPct } from "@/lib/team-metrics";

const DAY = 864e5;

/** Below this many leads in the previous period a % change is noise ("+1000 %" against 1 lead): no % is shown. */
export const MIN_DELTA_BASE = 5;

/** Whole-% change vs. the previous period, or null when the base is too small to compare (shown as "—"). */
export function deltaPct(current: number, previous: number, minBase = MIN_DELTA_BASE): number | null {
  if (previous < minBase) return null;
  return Math.round(((current - previous) / previous) * 100);
}

export const CLOSED_STATUSES = ["SOLD", "RENTED"] as const;
export type AgentClosings = { count: number; volume: number; listingIds: string[] };

/**
 * THE definition of a "cierre" (closing), shared by the dashboard ranking, the reports and the owner's audit page:
 * a listing of the agency in SOLD / RENTED whose closing date falls in [since, until], attributed to the listing's agent.
 * Closing date = latest SOLD/RENTED status event (ListingPriceHistory); listings closed without one fall back to updatedAt.
 * Volume = the amount recorded on that event (else the listing price).
 */
export async function closingsByAgent(agencyId: string, since: Date, until: Date = new Date(), agentIds?: string[]): Promise<Map<string, AgentClosings>> {
  const listings = await prisma.listing.findMany({
    where: { agencyId, status: { in: [...CLOSED_STATUSES] }, agentId: agentIds ? { in: agentIds } : { not: null } },
    select: { id: true, agentId: true, priceAmount: true, updatedAt: true, priceHistory: { where: { kind: { in: [...CLOSED_STATUSES] } }, select: { date: true, amount: true } } },
  });
  const out = new Map<string, AgentClosings>();
  for (const l of listings) {
    const last = l.priceHistory.reduce<{ date: Date; amount: number } | null>((a, h) => (!a || h.date > a.date ? h : a), null);
    const at = (last?.date ?? l.updatedAt).getTime();
    if (at < since.getTime() || at > until.getTime() || !l.agentId) continue;
    const row = out.get(l.agentId) ?? { count: 0, volume: 0, listingIds: [] };
    row.count += 1;
    row.volume += last?.amount ?? l.priceAmount;
    row.listingIds.push(l.id);
    out.set(l.agentId, row);
  }
  return out;
}

export interface DashboardStats {
  activeListings: number;
  activeDelta: number;
  leads7d: number;
  /** null = previous week had fewer than MIN_DELTA_BASE leads: too little data to compare. */
  leadsDeltaPct: number | null;
  /** null = fewer than MIN_DELTA_BASE leads in 30 days: a % of so few leads is noise (shown as "—"). */
  convTourPct: number | null;
  avgDaysToTour: number | null;
  slaPct: number | null;
  perDay: { date: string; value: number }[];
  funnel: { NEW: number; CONTACTED: number; TOUR: number; OFFER: number; WON: number };
  /** Last 30 days. `won` / `gmv` come from closingsByAgent (same definition as Auditoría and Informes). */
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
  const closed = await closingsByAgent(agencyId, since30, new Date(now), members.map((m) => m.userId));
  const ranking = members
    .map((m) => {
      const mine = leads30.filter((l) => l.agentId === m.userId);
      const resp = mine.filter((l) => l.firstResponseAt).map((l) => (l.firstResponseAt!.getTime() - l.createdAt.getTime()) / 60000);
      return {
        id: m.userId,
        name: m.user.name ?? "",
        hue: m.user.hue,
        leads: mine.length,
        won: closed.get(m.userId)?.count ?? 0,
        respMin: resp.length ? Math.round(resp.reduce((a, b) => a + b, 0) / resp.length) : null,
        gmv: closed.get(m.userId)?.volume ?? 0,
      };
    })
    .sort((a, b) => b.won - a.won || b.leads - a.leads);
  return {
    activeListings: active,
    activeDelta: active - activeOld,
    leads7d,
    leadsDeltaPct: deltaPct(leads7d, leadsPrev),
    convTourPct: leads30.length >= MIN_DELTA_BASE ? Math.round((funnel.TOUR / leads30.length) * 100) : null,
    avgDaysToTour: gaps.length ? Math.round((gaps.reduce((a, b) => a + b, 0) / gaps.length) * 10) / 10 : null,
    slaPct: sla,
    perDay,
    funnel,
    ranking,
  };
}

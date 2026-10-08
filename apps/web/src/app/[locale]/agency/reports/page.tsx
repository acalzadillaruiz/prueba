import type { Locale } from "@/types/domain";
import { prisma } from "@newplace/db";
import { ReportsView } from "@/components/agency/Reports";
import { NoAgency } from "@/components/agency/NoAgency";
import { requireAgencyPage } from "@/server/session";
import { closingsByAgent } from "@/server/agency-stats";
import type { ReportPeriod } from "@/components/agency/Reports";

// Kept here (not imported from the client component: values from a "use client" module are client references on the server).
const REPORT_PERIODS = [7, 30, 90] as const;
const toReportPeriod = (v: unknown): ReportPeriod => {
  const n = Number(v);
  return (REPORT_PERIODS as readonly number[]).includes(n) ? (n as ReportPeriod) : 30;
};

export const dynamic = "force-dynamic";

/** Agency reports for a period (?d=7|30|90, default 30). */
export default async function Page({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<{ d?: string }> }) {
  const { locale } = await params;
  const days = toReportPeriod((await searchParams).d);
  const g = await requireAgencyPage(locale, "reports");
  if (!g) return <NoAgency locale={locale} />;
  const user = { ...g.user, agencyId: g.agencyId };
  const agencyId = user.agencyId;
  const now = new Date();
  const since = new Date(now.getTime() - days * 864e5);
  const [entries, leadsN, bySource, listings, members, leadsByAgent, toursByAgent, closings] = await Promise.all([
    prisma.commissionEntry.findMany({ where: { agencyId, createdAt: { gte: since } }, select: { amount: true } }),
    prisma.lead.count({ where: { agencyId, createdAt: { gte: since } } }),
    prisma.lead.groupBy({ by: ["source"], where: { agencyId, createdAt: { gte: since } }, _count: true }),
    prisma.listing.findMany({ where: { agencyId }, select: { zone: true, status: true, priceAmount: true, areaM2: true, listingType: true, kind: true, publishedAt: true, leadsCount: true } }),
    prisma.agencyMember.findMany({ where: { agencyId, role: "AGENT" }, include: { user: { select: { id: true, name: true, email: true } } } }),
    prisma.lead.groupBy({ by: ["agentId"], where: { agencyId, agentId: { not: null }, createdAt: { gte: since } }, _count: true }),
    prisma.tour.groupBy({ by: ["agentId"], where: { listing: { agencyId }, status: { not: "CANCELLED" }, start: { gte: since, lte: now } }, _count: true }),
    // Same "cierre" as the dashboard ranking and Auditoría.
    closingsByAgent(agencyId, since, now),
  ]);
  const byAgent = members
    .map((m) => ({
      id: m.userId,
      name: m.user.name ?? m.user.email,
      leads: leadsByAgent.find((r) => r.agentId === m.userId)?._count ?? 0,
      tours: toursByAgent.find((r) => r.agentId === m.userId)?._count ?? 0,
      closings: closings.get(m.userId)?.count ?? 0,
      volume: closings.get(m.userId)?.volume ?? 0,
    }))
    .sort((a, b) => b.closings - a.closings || b.leads - a.leads || a.name.localeCompare(b.name));
  const active = listings.filter((l) => l.status === "ACTIVE" || l.status === "UNDER_OFFER");
  const doms = active.filter((l) => l.publishedAt).map((l) => Math.round((Date.now() - l.publishedAt!.getTime()) / 864e5)).sort((a, b) => a - b);
  const zones = [...new Set(listings.map((l) => l.zone))];
  const byZone = zones
    .map((zone) => {
      const zs = listings.filter((l) => l.zone === zone);
      const za = zs.filter((l) => l.status === "ACTIVE" || l.status === "UNDER_OFFER");
      // Price per m² only makes sense per operation: sale (USD/m²) and long rent (USD/m²/month).
      // Short rents (nightly prices) and commercial listings are left out instead of being averaged in.
      const ppm = (type: string) => {
        // Land and warehouses have very different prices per m²: kept out, as in the public zone stats.
        const rows = zs.filter((l) => l.listingType === type && l.areaM2 > 0 && l.kind !== "land" && l.kind !== "warehouse");
        return rows.length ? Math.round((rows.reduce((s, l) => s + l.priceAmount / l.areaM2, 0) / rows.length) * 10) / 10 : null;
      };
      const zd = za.filter((l) => l.publishedAt).map((l) => (Date.now() - l.publishedAt!.getTime()) / 864e5);
      return { zone, active: za.length, leads: zs.reduce((s, l) => s + l.leadsCount, 0), salePpm: ppm("SALE"), rentPpm: ppm("LONG_RENT"), dom: zd.length ? Math.round(zd.reduce((a, b) => a + b, 0) / zd.length) : null };
    })
    .sort((a, b) => b.leads - a.leads);
  return (
    <ReportsView
      locale={locale}
      days={days}
      data={{
        closedVolume: [...closings.values()].reduce((s, c) => s + c.volume, 0),
        closings: [...closings.values()].reduce((s, c) => s + c.count, 0),
        commissions: entries.reduce((s, e) => s + e.amount, 0),
        leads: leadsN,
        byAgent,
        medianDom: doms.length ? doms[Math.floor(doms.length / 2)] : null,
        bySource: bySource.map((b) => ({ source: b.source, count: b._count })).sort((a, b) => b.count - a.count),
        byZone,
      }}
    />
  );
}

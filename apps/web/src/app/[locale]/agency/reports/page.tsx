import type { Locale } from "@/types/domain";
import { prisma } from "@newplace/db";
import { ReportsView } from "@/components/agency/Reports";
import { NoAgency } from "@/components/agency/NoAgency";
import { requireAgencyPage } from "@/server/session";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const g = await requireAgencyPage(locale, "reports");
  if (!g) return <NoAgency locale={locale} />;
  const user = { ...g.user, agencyId: g.agencyId };
  const agencyId = user.agencyId;
  const since = new Date(Date.now() - 30 * 864e5);
  const [entries, leads30, bySource, listings] = await Promise.all([
    prisma.commissionEntry.findMany({ where: { agencyId }, include: { listing: { select: { priceAmount: true } } } }),
    prisma.lead.count({ where: { agencyId, createdAt: { gte: since } } }),
    prisma.lead.groupBy({ by: ["source"], where: { agencyId, createdAt: { gte: since } }, _count: true }),
    prisma.listing.findMany({ where: { agencyId }, select: { zone: true, status: true, priceAmount: true, areaM2: true, listingType: true, kind: true, publishedAt: true, leadsCount: true } }),
  ]);
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
      data={{
        closedVolume: entries.reduce((s, e) => s + e.listing.priceAmount, 0),
        commissions: entries.reduce((s, e) => s + e.amount, 0),
        leads30,
        medianDom: doms.length ? doms[Math.floor(doms.length / 2)] : null,
        bySource: bySource.map((b) => ({ source: b.source, count: b._count })).sort((a, b) => b.count - a.count),
        byZone,
      }}
    />
  );
}

import type { Locale } from "@/types/domain";
import { prisma } from "@newplace/db";
import { ReportsView } from "@/components/agency/Reports";
import { NoAgency } from "@/components/agency/NoAgency";
import { getAppUser } from "@/server/session";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const user = (await getAppUser())!;
  if (!user.agencyId) return <NoAgency locale={locale} />;
  const agencyId = user.agencyId;
  const since = new Date(Date.now() - 30 * 864e5);
  const [entries, leads30, bySource, listings] = await Promise.all([
    prisma.commissionEntry.findMany({ where: { agencyId }, include: { listing: { select: { priceAmount: true } } } }),
    prisma.lead.count({ where: { agencyId, createdAt: { gte: since } } }),
    prisma.lead.groupBy({ by: ["source"], where: { agencyId, createdAt: { gte: since } }, _count: true }),
    prisma.listing.findMany({ where: { agencyId }, select: { zone: true, status: true, priceAmount: true, areaM2: true, listingType: true, publishedAt: true, leadsCount: true } }),
  ]);
  const active = listings.filter((l) => l.status === "ACTIVE" || l.status === "UNDER_OFFER");
  const doms = active.filter((l) => l.publishedAt).map((l) => Math.round((Date.now() - l.publishedAt!.getTime()) / 864e5)).sort((a, b) => a - b);
  const zones = [...new Set(listings.map((l) => l.zone))];
  const byZone = zones
    .map((zone) => {
      const zs = listings.filter((l) => l.zone === zone);
      const za = zs.filter((l) => l.status === "ACTIVE" || l.status === "UNDER_OFFER");
      const sales = zs.filter((l) => l.listingType === "SALE");
      const zd = za.filter((l) => l.publishedAt).map((l) => (Date.now() - l.publishedAt!.getTime()) / 864e5);
      return { zone, active: za.length, leads: zs.reduce((s, l) => s + l.leadsCount, 0), ppm: sales.length ? Math.round(sales.reduce((s, l) => s + l.priceAmount / l.areaM2, 0) / sales.length) : null, dom: zd.length ? Math.round(zd.reduce((a, b) => a + b, 0) / zd.length) : null };
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

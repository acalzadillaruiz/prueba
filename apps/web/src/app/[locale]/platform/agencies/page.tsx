import type { Locale } from "@/types/domain";
import { prisma } from "@newplace/db";
import { PlatformAgencies } from "@/components/agency/Platform";
import { getAgencies } from "@/server/data";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const since = new Date(Date.now() - 30 * 864e5);
  const [agencies, listings, members, leads] = await Promise.all([
    getAgencies(),
    prisma.listing.groupBy({ by: ["agencyId"], _count: true }),
    prisma.agencyMember.groupBy({ by: ["agencyId"], _count: true }),
    prisma.lead.groupBy({ by: ["agencyId"], where: { createdAt: { gte: since } }, _count: true }),
  ]);
  const n = (arr: { agencyId: string | null; _count: number }[], id: string) => arr.find((x) => x.agencyId === id)?._count ?? 0;
  return <PlatformAgencies locale={locale} agencies={agencies.map((a) => ({ ...a, listings: n(listings, a.id), members: n(members, a.id), leads30: n(leads, a.id) }))} />;
}

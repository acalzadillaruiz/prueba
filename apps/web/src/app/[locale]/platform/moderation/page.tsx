import type { Locale } from "@/types/domain";
import { prisma } from "@newplace/db";
import { PlatformModeration } from "@/components/agency/Platform";
import { getModeration } from "@/server/data";
import { listingInclude, toDomain } from "@/server/listings";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const [reports, rows] = await Promise.all([getModeration(), prisma.listing.findMany({ where: { status: { in: ["ACTIVE", "UNDER_OFFER", "COMING_SOON", "WITHDRAWN"] } }, include: listingInclude, orderBy: { updatedAt: "desc" }, take: 200 })]);
  return <PlatformModeration locale={locale} reports={reports} listings={rows.map(toDomain)} />;
}

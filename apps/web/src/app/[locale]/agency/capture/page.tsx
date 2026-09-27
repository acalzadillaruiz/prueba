import type { Locale } from "@/types/domain";
import { prisma } from "@newplace/db";
import { CaptureView } from "@/components/agency/Capture";
import { NoAgency } from "@/components/agency/NoAgency";
import { getCaptures, getZones } from "@/server/data";
import { requireAgencyPage } from "@/server/session";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const g = await requireAgencyPage(locale, "capture");
  if (!g) return <NoAgency locale={locale} />;
  const user = { ...g.user, agencyId: g.agencyId };
  const [rows, zones, links] = await Promise.all([
    getCaptures(user.agencyId),
    getZones(),
    prisma.captureLead.findMany({ where: { agencyId: user.agencyId, listingId: { not: null } }, select: { id: true, listingId: true } }),
  ]);
  const listingOf = new Map(links.map((c) => [c.id, c.listingId ?? undefined]));
  const dupIds = rows.map((r) => r.duplicateOf).filter(Boolean) as string[];
  const titles = await prisma.listing.findMany({ where: { id: { in: dupIds } }, select: { id: true, titleEs: true, titleEn: true } });
  const canConvert = ["AGENCY_OWNER", "BACKOFFICE", "SUPERADMIN"].includes(user.role);
  return <CaptureView locale={locale} canConvert={canConvert} rows={rows.map((r) => ({ ...r, listingId: listingOf.get(r.id) }))} zones={zones} titles={Object.fromEntries(titles.map((t) => [t.id, locale === "es" ? t.titleEs : t.titleEn]))} />;
}

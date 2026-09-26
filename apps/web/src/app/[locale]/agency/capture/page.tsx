import type { Locale } from "@/types/domain";
import { prisma } from "@newplace/db";
import { CaptureView } from "@/components/agency/Capture";
import { NoAgency } from "@/components/agency/NoAgency";
import { getCaptures, getZones } from "@/server/data";
import { getAppUser } from "@/server/session";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const user = (await getAppUser())!;
  if (!user.agencyId) return <NoAgency locale={locale} />;
  const [rows, zones] = await Promise.all([getCaptures(user.agencyId), getZones()]);
  const dupIds = rows.map((r) => r.duplicateOf).filter(Boolean) as string[];
  const titles = await prisma.listing.findMany({ where: { id: { in: dupIds } }, select: { id: true, titleEs: true, titleEn: true } });
  return <CaptureView locale={locale} rows={rows} zones={zones} titles={Object.fromEntries(titles.map((t) => [t.id, locale === "es" ? t.titleEs : t.titleEn]))} />;
}

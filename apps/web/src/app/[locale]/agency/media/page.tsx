import type { Locale } from "@/types/domain";
import { MediaView } from "@/components/agency/Media";
import { NoAgency } from "@/components/agency/NoAgency";
import { getMediaJobs } from "@/server/data";
import { listingsByIds } from "@/server/listings";
import { requireAgencyPage } from "@/server/session";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const g = await requireAgencyPage(locale, "media");
  if (!g) return <NoAgency locale={locale} />;
  const user = { ...g.user, agencyId: g.agencyId };
  const jobs = await getMediaJobs(user.role === "PHOTOGRAPHER" ? { photographerId: user.id } : { agencyId: user.agencyId });
  const listings = await listingsByIds([...new Set(jobs.map((j) => j.listingId))]);
  return <MediaView locale={locale} jobs={jobs} listings={listings} />;
}

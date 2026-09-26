import type { Locale } from "@/types/domain";
import { MediaView } from "@/components/agency/Media";
import { NoAgency } from "@/components/agency/NoAgency";
import { getMediaJobs } from "@/server/data";
import { listingsByIds } from "@/server/listings";
import { getAppUser } from "@/server/session";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const user = (await getAppUser())!;
  if (!user.agencyId) return <NoAgency locale={locale} />;
  const jobs = await getMediaJobs(user.role === "PHOTOGRAPHER" ? { photographerId: user.id } : { agencyId: user.agencyId });
  const listings = await listingsByIds([...new Set(jobs.map((j) => j.listingId))]);
  return <MediaView locale={locale} jobs={jobs} listings={listings} />;
}

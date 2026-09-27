import type { Locale } from "@/types/domain";
import { prisma } from "@newplace/db";
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
  const canManage = ["AGENCY_OWNER", "BACKOFFICE", "SUPERADMIN"].includes(user.role);
  const jobs = await getMediaJobs(user.role === "PHOTOGRAPHER" ? { photographerId: user.id } : { agencyId: user.agencyId });
  const [listings, members, options] = await Promise.all([
    listingsByIds([...new Set(jobs.map((j) => j.listingId))]),
    prisma.agencyMember.findMany({ where: { agencyId: user.agencyId }, include: { user: { select: { id: true, name: true, email: true, suspended: true } } } }),
    canManage
      ? prisma.listing.findMany({ where: { agencyId: user.agencyId, status: { notIn: ["SOLD", "RENTED", "WITHDRAWN", "EXPIRED"] } }, select: { id: true, titleEs: true, titleEn: true, address: true }, orderBy: { updatedAt: "desc" } })
      : Promise.resolve([]),
  ]);
  const names = Object.fromEntries(members.map((m) => [m.userId, m.user.name ?? m.user.email]));
  const photographers = members.filter((m) => m.role === "PHOTOGRAPHER" && !m.user.suspended).map((m) => ({ id: m.userId, name: m.user.name ?? m.user.email }));
  return (
    <MediaView
      locale={locale}
      jobs={jobs}
      listings={listings}
      names={names}
      manage={canManage ? { photographers, listings: options.map((l) => ({ id: l.id, title: locale === "es" ? l.titleEs : l.titleEn, address: l.address })) } : null}
    />
  );
}

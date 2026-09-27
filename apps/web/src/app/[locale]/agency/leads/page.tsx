import type { Locale } from "@/types/domain";
import { prisma } from "@newplace/db";
import { LeadsInbox } from "@/components/agency/LeadsInbox";
import { NoAgency } from "@/components/agency/NoAgency";
import { getLeads } from "@/server/data";
import { agencyListings } from "@/server/listings";
import { requireAgencyPage } from "@/server/session";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const g = await requireAgencyPage(locale, "leads");
  if (!g) return <NoAgency locale={locale} />;
  const user = { ...g.user, agencyId: g.agencyId };
  const agentId = user.role === "AGENT" ? user.id : undefined;
  const [leads, listings, members] = await Promise.all([
    getLeads({ agencyId: user.agencyId, agentId }),
    agencyListings(user.agencyId),
    prisma.agencyMember.findMany({ where: { agencyId: user.agencyId }, include: { user: { select: { id: true, name: true } } } }),
  ]);
  return <LeadsInbox locale={locale} initial={leads} listings={listings} agents={Object.fromEntries(members.map((m) => [m.userId, m.user.name ?? ""]))} />;
}

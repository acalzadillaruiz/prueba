import type { Locale } from "@/types/domain";
import { prisma } from "@newplace/db";
import { LeadsInbox } from "@/components/agency/LeadsInbox";
import { NoAgency } from "@/components/agency/NoAgency";
import { getLeads } from "@/server/data";
import { agencyListings } from "@/server/listings";
import { getAppUser } from "@/server/session";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const user = (await getAppUser())!;
  if (!user.agencyId) return <NoAgency locale={locale} />;
  const agentId = user.role === "AGENT" ? user.id : undefined;
  const [leads, listings, members] = await Promise.all([
    getLeads({ agencyId: user.agencyId, agentId }),
    agencyListings(user.agencyId),
    prisma.agencyMember.findMany({ where: { agencyId: user.agencyId }, include: { user: { select: { id: true, name: true } } } }),
  ]);
  return <LeadsInbox locale={locale} initial={leads} listings={listings} agents={Object.fromEntries(members.map((m) => [m.userId, m.user.name ?? ""]))} />;
}

import type { Locale } from "@/types/domain";
import { prisma } from "@newplace/db";
import { TeamView } from "@/components/agency/Team";
import { NoAgency } from "@/components/agency/NoAgency";
import { getUsers } from "@/server/data";
import { getAppUser } from "@/server/session";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const user = (await getAppUser())!;
  if (!user.agencyId) return <NoAgency locale={locale} />;
  const [members, counts, invites] = await Promise.all([
    getUsers({ memberships: { some: { agencyId: user.agencyId } } }),
    prisma.listing.groupBy({ by: ["agentId"], where: { agencyId: user.agencyId }, _count: true }),
    prisma.invitation.findMany({ where: { agencyId: user.agencyId, acceptedAt: null }, orderBy: { createdAt: "desc" } }),
  ]);
  return (
    <TeamView
      locale={locale}
      members={members}
      listingsByAgent={Object.fromEntries(counts.filter((c) => c.agentId).map((c) => [c.agentId!, c._count]))}
      invites={invites.map((i) => ({ id: i.id, email: i.email, role: i.role, createdAt: i.createdAt.toISOString() }))}
    />
  );
}

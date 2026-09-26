import type { Locale } from "@/types/domain";
import { prisma } from "@newplace/db";
import { ListingsTable } from "@/components/agency/ListingsTable";
import { NoAgency } from "@/components/agency/NoAgency";
import { agencyListings } from "@/server/listings";
import { getAppUser } from "@/server/session";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const user = (await getAppUser())!;
  if (!user.agencyId) return <NoAgency locale={locale} />;
  const [listings, agents] = await Promise.all([
    agencyListings(user.agencyId, { agentId: user.role === "AGENT" ? user.id : undefined }),
    prisma.agencyMember.findMany({ where: { agencyId: user.agencyId, role: "AGENT" }, include: { user: { select: { id: true, name: true, hue: true } } } }),
  ]);
  return <ListingsTable locale={locale} listings={listings} agents={agents.map((a) => ({ id: a.user.id, name: a.user.name ?? "", hue: a.user.hue }))} />;
}

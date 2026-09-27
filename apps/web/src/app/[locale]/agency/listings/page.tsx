import type { Locale } from "@/types/domain";
import { prisma } from "@newplace/db";
import { ListingsTable } from "@/components/agency/ListingsTable";
import { NoAgency } from "@/components/agency/NoAgency";
import { agencyListings } from "@/server/listings";
import { requireAgencyPage } from "@/server/session";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const g = await requireAgencyPage(locale, "listings");
  if (!g) return <NoAgency locale={locale} />;
  const user = { ...g.user, agencyId: g.agencyId };
  const manager = ["AGENCY_OWNER", "BACKOFFICE", "SUPERADMIN"].includes(user.role);
  const [listings, agents, mandates] = await Promise.all([
    agencyListings(user.agencyId, { agentId: user.role === "AGENT" ? user.id : undefined }),
    prisma.agencyMember.findMany({ where: { agencyId: user.agencyId, role: "AGENT" }, include: { user: { select: { id: true, name: true, hue: true } } } }),
    // Owner mandates (brief §6.2 REQUESTED → ASSIGNED → ACTIVE): managers assign and publish; the assigned agent publishes.
    manager || user.role === "AGENT"
      ? prisma.mandate.findMany({
          where: { agencyId: user.agencyId, status: { in: ["REQUESTED", "ASSIGNED"] }, ...(manager ? {} : { agentId: user.id }) },
          include: { owner: { select: { name: true, email: true } }, listing: { select: { id: true, titleEs: true, titleEn: true, zone: true, city: true, priceAmount: true } } },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
  ]);
  return (
    <ListingsTable
      locale={locale}
      listings={listings}
      agents={agents.map((a) => ({ id: a.user.id, name: a.user.name ?? "", hue: a.user.hue }))}
      mandates={mandates.map((m) => ({
        id: m.id,
        status: m.status as "REQUESTED" | "ASSIGNED",
        agentId: m.agentId,
        ownerName: m.owner.name ?? m.owner.email,
        createdAt: m.createdAt.toISOString(),
        listing: m.listing ? { id: m.listing.id, title_es: m.listing.titleEs, title_en: m.listing.titleEn || m.listing.titleEs, zone: m.listing.zone, city: m.listing.city, priceAmount: m.listing.priceAmount } : null,
      }))}
    />
  );
}

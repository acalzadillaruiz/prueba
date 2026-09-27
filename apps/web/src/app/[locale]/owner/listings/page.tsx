import type { Locale } from "@/types/domain";
import { prisma } from "@newplace/db";
import { PublicPage } from "@/components/layout/PublicPage";
import { OwnerListingsView } from "@/components/owner/OwnerListingsView";
import { getOffers, getThreadsFor, leadToDomain } from "@/server/data";
import { listingInclude, toDomain } from "@/server/listings";
import { getAppUser } from "@/server/session";

export const dynamic = "force-dynamic";

export default async function OwnerListings({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const user = (await getAppUser())!;
  const rows = await prisma.listing.findMany({ where: { ownerUserId: user.id }, include: listingInclude, orderBy: { createdAt: "desc" } });
  const listings = rows.map(toDomain);
  const [offers, threads, mandates, leads] = await Promise.all([
    getOffers(listings.map((l) => l.id)),
    getThreadsFor(user.id),
    prisma.mandate.findMany({ where: { ownerUserId: user.id }, include: { agency: { select: { name: true } }, agent: { select: { name: true } } }, orderBy: { createdAt: "desc" } }),
    // FSBO enquiries (no agent): the owner is who answers them, including anonymous visitors' contact details.
    prisma.lead.findMany({ where: { agentId: null, listing: { ownerUserId: user.id } }, orderBy: { createdAt: "desc" }, take: 200 }),
  ]);
  return (
    <PublicPage locale={locale}>
      <OwnerListingsView
        locale={locale}
        listings={listings}
        offers={offers}
        threads={threads}
        leads={leads.map(leadToDomain).map((l) => ({ id: l.id, listingId: l.listingId, name: l.name, email: l.email, phone: l.phone ?? null, message: l.message, createdAt: l.createdAt }))}
        mandates={mandates.map((m) => ({ id: m.id, status: m.status, listingId: m.listingId, agencyName: m.agency.name, agentName: m.agent?.name ?? null, createdAt: m.createdAt.toISOString() }))}
      />
    </PublicPage>
  );
}

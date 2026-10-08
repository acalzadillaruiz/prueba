import type { Locale } from "@/types/domain";
import { prisma } from "@newplace/db";
import { PublicPage } from "@/components/layout/PublicPage";
import { OwnerListingsView } from "@/components/owner/OwnerListingsView";
import { getOffers, getThreadsFor, leadToDomain } from "@/server/data";
import { listingInclude, toDomain } from "@/server/listings";
import { getAppUser } from "@/server/session";
import { openAppeals } from "@/server/listing-service";
import { isFsbo, parseVisitHours } from "@/lib/visit-hours";

export const dynamic = "force-dynamic";

export default async function OwnerListings({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const user = (await getAppUser())!;
  const rows = await prisma.listing.findMany({ where: { ownerUserId: user.id }, include: listingInclude, orderBy: { createdAt: "desc" } });
  const listings = rows.map(toDomain);
  const [offers, threads, mandates, leads, tours, appeals] = await Promise.all([
    getOffers(listings.map((l) => l.id)),
    getThreadsFor(user.id),
    prisma.mandate.findMany({ where: { ownerUserId: user.id }, include: { agency: { select: { name: true } }, agent: { select: { name: true } } }, orderBy: { createdAt: "desc" } }),
    // FSBO enquiries (no agent): the owner is who answers them, including anonymous visitors' contact details.
    prisma.lead.findMany({ where: { agentId: null, listing: { ownerUserId: user.id } }, orderBy: { createdAt: "desc" }, take: 200 }),
    // Visits of their FSBO listings (no agency): the owner attends them and confirms/cancels here. Recent past ones drop off after a day.
    prisma.tour.findMany({
      where: { listing: { ownerUserId: user.id, agencyId: null }, start: { gte: new Date(Date.now() - 864e5) } },
      include: { lead: { select: { email: true, phone: true } } },
      orderBy: { start: "asc" },
      take: 200,
    }),
    openAppeals(listings.filter((l) => l.takedownReason).map((l) => l.id)),
  ]);
  return (
    <PublicPage locale={locale} tabbar>
      <OwnerListingsView
        locale={locale}
        listings={listings}
        offers={offers}
        threads={threads}
        leads={leads.map(leadToDomain).map((l) => ({ id: l.id, listingId: l.listingId, name: l.name, email: l.email, phone: l.phone ?? null, message: l.message, createdAt: l.createdAt }))}
        tours={tours.map((t) => ({ id: t.id, listingId: t.listingId, leadId: t.leadId, seekerName: t.seekerName, email: t.lead?.email ?? null, phone: t.lead?.phone ?? null, start: t.start.toISOString(), status: t.status, virtual: t.virtual }))}
        visitHours={Object.fromEntries(rows.filter((r) => isFsbo(r)).map((r) => [r.id, parseVisitHours(r.visitHours)]))}
        appeals={Object.fromEntries([...appeals].map(([id, at]) => [id, at.toISOString()]))}
        mandates={mandates.map((m) => ({ id: m.id, status: m.status, listingId: m.listingId, agencyName: m.agency.name, agentName: m.agent?.name ?? null, createdAt: m.createdAt.toISOString() }))}
      />
    </PublicPage>
  );
}

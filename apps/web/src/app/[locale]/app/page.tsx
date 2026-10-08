import type { Locale } from "@/types/domain";
import { prequalSchema } from "@newplace/config";
import { prisma } from "@newplace/db";
import { PublicPage } from "@/components/layout/PublicPage";
import { HubView } from "@/components/seeker/HubView";
import { getLeads, getThreadsFor } from "@/server/data";
import { listingsByIds } from "@/server/listings";
import { getAppUser } from "@/server/session";
import { unreadByThread } from "@/server/thread-unread";
import { pageMeta } from "@/lib/seo";
import { emailConfigured } from "@/server/email";
import { tx } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  return pageMeta(locale, tx(locale, "Mi Hub", "My Hub"), "/app", { index: false });
}

const OPEN_FOR_OFFERS = ["ACTIVE", "COMING_SOON", "UNDER_OFFER"];

export default async function Hub({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const user = (await getAppUser())!;
  const now = new Date();
  const [tours, pastTours, requests, saved, searches, threads, offers, me] = await Promise.all([
    prisma.tour.findMany({ where: { seekerUserId: user.id, status: { in: ["REQUESTED", "CONFIRMED"] }, start: { gte: now } }, include: { agent: { select: { name: true, hue: true } } }, orderBy: { start: "asc" } }),
    prisma.tour.findMany({ where: { seekerUserId: user.id, OR: [{ start: { lt: now } }, { status: { in: ["DONE", "CANCELLED"] } }] }, include: { agent: { select: { name: true, hue: true } } }, orderBy: { start: "desc" }, take: 5 }),
    getLeads({ seekerUserId: user.id }),
    prisma.savedListing.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, select: { listingId: true } }),
    prisma.savedSearch.findMany({ where: { userId: user.id }, select: { id: true, name: true, query: true, polygon: true, newCount: true } }),
    getThreadsFor(user.id),
    prisma.offer.findMany({ where: { bidderUserId: user.id }, orderBy: { createdAt: "desc" } }),
    prisma.user.findUnique({ where: { id: user.id }, select: { prequal: true } }),
  ]);
  const unread = await unreadByThread(user.id, threads.map((t) => t.id));
  const ids = [
    ...new Set([
      ...tours.map((t) => t.listingId),
      ...pastTours.map((t) => t.listingId),
      ...requests.map((r) => r.listingId),
      ...saved.map((s) => s.listingId),
      ...offers.map((o) => o.listingId),
      ...threads.map((t) => t.listingId).filter((x): x is string => !!x),
    ]),
  ];
  const listings = await listingsByIds(ids);
  // Offers only on listings the buyer is already in contact about (lead or tour) and that are still available.
  const contacted = new Set([...requests.map((r) => r.listingId), ...tours.map((t) => t.listingId), ...pastTours.map((t) => t.listingId)]);
  const offerable = listings.filter((l) => contacted.has(l.id) && OPEN_FOR_OFFERS.includes(l.status)).map((l) => l.id);
  const prequal = prequalSchema.safeParse(me?.prequal);
  const tourDto = (t: (typeof tours)[number]) => ({ id: t.id, listingId: t.listingId, leadId: t.leadId ?? undefined, agentId: t.agentId, seekerName: t.seekerName, start: t.start.toISOString(), status: t.status, agentName: t.agent.name ?? "", agentHue: t.agent.hue });
  return (
    <PublicPage locale={locale} tabbar>
      <HubView
        locale={locale}
        emailOn={emailConfigured()}
        data={{
          tours: tours.map(tourDto),
          pastTours: pastTours.map(tourDto),
          requests,
          listings,
          savedIds: saved.map((s) => s.listingId),
          searches: searches.map(({ polygon, ...s }) => ({ ...s, polygon: polygon != null })),
          threads: threads.map((t) => ({ ...t, unread: unread[t.id] ?? 0 })),
          offers: offers.map((o) => ({ id: o.id, listingId: o.listingId, amount: o.amount, status: o.status, note: o.note, createdAt: o.createdAt.toISOString() })),
          offerable,
          prequal: prequal.success ? prequal.data : null,
        }}
      />
    </PublicPage>
  );
}

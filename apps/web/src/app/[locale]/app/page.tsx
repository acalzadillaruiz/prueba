import type { Locale } from "@/types/domain";
import { prisma } from "@newplace/db";
import { PublicPage } from "@/components/layout/PublicPage";
import { HubView } from "@/components/seeker/HubView";
import { getLeads, getThreadsFor } from "@/server/data";
import { listingsByIds } from "@/server/listings";
import { getAppUser } from "@/server/session";
import { pageMeta } from "@/lib/seo";
import { tx } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  return pageMeta(locale, tx(locale, "Mi Hub", "My Hub"), "/app", { index: false });
}

export default async function Hub({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const user = (await getAppUser())!;
  const [tours, requests, saved, searches, threads] = await Promise.all([
    prisma.tour.findMany({ where: { seekerUserId: user.id, status: { in: ["REQUESTED", "CONFIRMED"] } }, include: { agent: { select: { name: true, hue: true } } }, orderBy: { start: "asc" } }),
    getLeads({ seekerUserId: user.id }),
    prisma.savedListing.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, select: { listingId: true } }),
    prisma.savedSearch.findMany({ where: { userId: user.id }, select: { id: true, name: true, newCount: true } }),
    getThreadsFor(user.id),
  ]);
  const ids = [...new Set([...tours.map((t) => t.listingId), ...requests.map((r) => r.listingId), ...saved.map((s) => s.listingId)])];
  const listings = await listingsByIds(ids);
  const last = threads.flatMap((t) => t.messages.filter((m) => !m.mine)).sort((a, b) => b.at.localeCompare(a.at))[0] ?? null;
  return (
    <PublicPage locale={locale}>
      <HubView
        locale={locale}
        data={{
          tours: tours.map((t) => ({ id: t.id, listingId: t.listingId, leadId: t.leadId ?? undefined, agentId: t.agentId, seekerName: t.seekerName, start: t.start.toISOString(), status: t.status, agentName: t.agent.name ?? "", agentHue: t.agent.hue })),
          requests,
          listings,
          savedIds: saved.map((s) => s.listingId),
          searches,
          lastMessage: last ? { from: last.from, body: last.body, at: last.at } : null,
        }}
      />
    </PublicPage>
  );
}

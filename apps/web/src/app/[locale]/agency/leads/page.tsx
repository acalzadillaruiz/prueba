import type { Locale } from "@/types/domain";
import { prisma } from "@newplace/db";
import { LeadsInbox } from "@/components/agency/LeadsInbox";
import { NoAgency } from "@/components/agency/NoAgency";
import { getLeads, getThreadsFor } from "@/server/data";
import { unreadByThread } from "@/server/thread-unread";
import { agencyListings } from "@/server/listings";
import { requireAgencyPage } from "@/server/session";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const g = await requireAgencyPage(locale, "leads");
  if (!g) return <NoAgency locale={locale} />;
  const user = { ...g.user, agencyId: g.agencyId };
  const agentId = user.role === "AGENT" ? user.id : undefined;
  const [leads, listings, members, threads] = await Promise.all([
    getLeads({ agencyId: user.agencyId, agentId }),
    agencyListings(user.agencyId),
    prisma.agencyMember.findMany({ where: { agencyId: user.agencyId }, include: { user: { select: { id: true, name: true } } } }),
    // This user's own direct conversations (e.g. a buyer's "Contactar" chat); lead threads are read through each lead.
    getThreadsFor(user.id),
  ]);
  const direct = threads.filter((t) => !t.leadId);
  const unread = await unreadByThread(user.id, direct.map((t) => t.id));
  return (
    <LeadsInbox
      locale={locale}
      initial={leads}
      listings={listings}
      agents={Object.fromEntries(members.map((m) => [m.userId, m.user.name ?? ""]))}
      threads={direct.map((t) => ({ ...t, unread: unread[t.id] ?? 0 }))}
      meId={user.id}
    />
  );
}

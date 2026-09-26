import type { Locale } from "@/types/domain";
import { prisma } from "@newplace/db";
import { AgencyDashboard } from "@/components/agency/Dashboard";
import { NoAgency } from "@/components/agency/NoAgency";
import { dashboardStats } from "@/server/agency-stats";
import { getLeads } from "@/server/data";
import { agencyListings } from "@/server/listings";
import { getAppAgency, getAppUser } from "@/server/session";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const user = (await getAppUser())!;
  if (!user.agencyId) return <NoAgency locale={locale} />;
  if (user.role === "CAPTOR" || user.role === "PHOTOGRAPHER") {
    const { redirect } = await import("next/navigation");
    redirect(`/${locale}/agency/${user.role === "CAPTOR" ? "capture" : "media"}`);
  }
  const agentId = user.role === "AGENT" ? user.id : undefined;
  const [stats, listings, leads, tours, agency] = await Promise.all([
    dashboardStats(user.agencyId, agentId),
    agencyListings(user.agencyId, { agentId }),
    getLeads({ agencyId: user.agencyId, agentId }),
    prisma.tour.findMany({ where: { listing: { agencyId: user.agencyId }, ...(agentId ? { agentId } : {}), start: { gte: new Date() }, status: { in: ["REQUESTED", "CONFIRMED"] } }, include: { agent: { select: { name: true, hue: true } } }, orderBy: { start: "asc" }, take: 8 }),
    getAppAgency(user.agencyId),
  ]);
  return (
    <AgencyDashboard
      locale={locale}
      stats={stats}
      listings={listings}
      newLeads={leads.filter((l) => l.stage === "NEW")}
      tours={tours.map((t) => ({ id: t.id, listingId: t.listingId, leadId: t.leadId ?? undefined, agentId: t.agentId, seekerName: t.seekerName, start: t.start.toISOString(), status: t.status, agentName: t.agent.name ?? "", agentHue: t.agent.hue }))}
      agencyName={agency?.name ?? ""}
    />
  );
}

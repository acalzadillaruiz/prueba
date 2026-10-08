import type { Locale } from "@/types/domain";
import { prisma } from "@newplace/db";
import { SettingsView } from "@/components/agency/Settings";
import { NoAgency } from "@/components/agency/NoAgency";
import { getAppAgency, requireAgencyPage } from "@/server/session";
import { ON_CALL_ROLES } from "@/server/on-call";
import { ON_CALL_DAYS, parseRotation } from "@/lib/on-call";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const g = await requireAgencyPage(locale, "settings");
  const agency = g ? await getAppAgency(g.agencyId) : null;
  if (!agency) return <NoAgency locale={locale} />;
  const [rule, extra, advisors] = await Promise.all([
    prisma.commissionRule.findUnique({ where: { agencyId: agency.id } }),
    prisma.agency.findUnique({ where: { id: agency.id }, select: { logoUrl: true, onCall: true } }),
    // Guardia 24/7 candidates: advisors and the owner of this agency (same rule the API enforces).
    prisma.agencyMember.findMany({ where: { agencyId: agency.id, role: { in: [...ON_CALL_ROLES] }, user: { suspended: false } }, select: { userId: true, role: true, verified: true, user: { select: { name: true } } }, orderBy: { createdAt: "asc" } }),
  ]);
  // Someone who left the team (or changed role) drops out of the rota shown here, so saving never trips on a stale id.
  const ids = new Set(advisors.map((m) => m.userId));
  const rota = parseRotation(extra?.onCall);
  for (const d of ON_CALL_DAYS) if (rota[d] && !ids.has(rota[d]!)) rota[d] = null;
  return <SettingsView locale={locale} agency={agency} logoUrl={extra?.logoUrl ?? ""} onCall={rota} advisors={advisors.map((m) => ({ id: m.userId, name: m.user.name ?? "—", owner: m.role === "AGENCY_OWNER", verified: m.verified }))} rule={{ salePct: rule?.salePct ?? 5, agentSplitPct: rule?.agentSplitPct ?? 50, rentMonths: rule?.rentMonths ?? 1, captorPct: rule?.captorPct ?? 10 }} />;
}

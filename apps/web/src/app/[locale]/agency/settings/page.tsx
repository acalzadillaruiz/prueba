import type { Locale } from "@/types/domain";
import { prisma } from "@newplace/db";
import { SettingsView } from "@/components/agency/Settings";
import { NoAgency } from "@/components/agency/NoAgency";
import { getAppAgency, requireAgencyPage } from "@/server/session";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const g = await requireAgencyPage(locale, "settings");
  const agency = g ? await getAppAgency(g.agencyId) : null;
  if (!agency) return <NoAgency locale={locale} />;
  const [rule, extra] = await Promise.all([prisma.commissionRule.findUnique({ where: { agencyId: agency.id } }), prisma.agency.findUnique({ where: { id: agency.id }, select: { logoUrl: true } })]);
  return <SettingsView locale={locale} agency={agency} logoUrl={extra?.logoUrl ?? ""} rule={{ salePct: rule?.salePct ?? 5, agentSplitPct: rule?.agentSplitPct ?? 50, rentMonths: rule?.rentMonths ?? 1, captorPct: rule?.captorPct ?? 10 }} />;
}

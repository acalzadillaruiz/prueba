import type { Locale } from "@/types/domain";
import { prisma } from "@newplace/db";
import { SettingsView } from "@/components/agency/Settings";
import { NoAgency } from "@/components/agency/NoAgency";
import { getAppAgency, getAppUser } from "@/server/session";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const user = (await getAppUser())!;
  const agency = await getAppAgency(user.agencyId);
  if (!agency) return <NoAgency locale={locale} />;
  const rule = await prisma.commissionRule.findUnique({ where: { agencyId: agency.id } });
  return <SettingsView locale={locale} agency={agency} rule={{ salePct: rule?.salePct ?? 5, agentSplitPct: rule?.agentSplitPct ?? 50, rentMonths: rule?.rentMonths ?? 1, captorPct: rule?.captorPct ?? 10 }} />;
}

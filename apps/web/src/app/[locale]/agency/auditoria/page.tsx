import type { Metadata } from "next";
import type { Locale } from "@/types/domain";
import { TeamAuditView } from "@/components/agency/TeamAudit";
import { NoAgency } from "@/components/agency/NoAgency";
import { toPeriod } from "@/lib/team-metrics";
import { requireAgencyPage } from "@/server/session";
import { advisorPerformance, auditAdvisors, teamThreads } from "@/server/team-audit";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: locale === "en" ? "Team audit" : "Auditoría del equipo", robots: { index: false, follow: false } };
}

/** Owner-only audit: advisor performance (period ?d=30|90|365) + read-only team chats (?agent= filters by advisor). */
export default async function Page({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<{ d?: string; agent?: string }> }) {
  const { locale } = await params;
  const sp = await searchParams;
  const g = await requireAgencyPage(locale, "auditoria");
  if (!g) return <NoAgency locale={locale} />;
  const days = toPeriod(sp.d);
  const advisors = await auditAdvisors(g.agencyId);
  // An unknown advisor id in the URL is ignored instead of failing the page.
  const agentId = sp.agent && advisors.some((a) => a.id === sp.agent) ? sp.agent : null;
  const [rows, threads] = await Promise.all([advisorPerformance(g.agencyId, days), teamThreads(g.agencyId, { agentId })]);
  return <TeamAuditView locale={locale} days={days} rows={rows} advisors={advisors} threads={threads} agentId={agentId} />;
}

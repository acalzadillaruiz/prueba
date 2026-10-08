import { redirect } from "next/navigation";
import type { Locale } from "@/types/domain";
import { PlatformAudit } from "@/components/agency/Platform";
import { auditFilters, auditPage } from "@/server/audit-log";
import { getAppUser } from "@/server/session";
import { humanAuditRows } from "@/server/platform";

export const dynamic = "force-dynamic";

type Search = { cursor?: string; action?: string; actor?: string };

export default async function Page({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<Search> }) {
  const { locale } = await params;
  const sp = await searchParams;
  // Middleware already gates /platform; re-check against the live DB role (a JWT can outlive a demotion).
  const user = await getAppUser();
  if (!user) redirect(`/${locale}/login?next=/${locale}/platform/audit`);
  if (user.role !== "SUPERADMIN") redirect(`/${locale}?denied=platform`);
  const one = (v: unknown) => (typeof v === "string" && v.length <= 80 ? v : undefined);
  const filters = { cursor: one(sp.cursor), action: one(sp.action), actor: one(sp.actor) };
  const [page, options] = await Promise.all([auditPage({ cursor: filters.cursor, action: filters.action, actorId: filters.actor }), auditFilters()]);
  return <PlatformAudit locale={locale} page={{ ...page, items: await humanAuditRows(page.items, locale) }} options={options} filters={filters} />;
}

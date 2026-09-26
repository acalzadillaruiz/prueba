import type { Locale } from "@/types/domain";
import { prisma } from "@newplace/db";
import { PublicPage } from "@/components/layout/PublicPage";
import { AlertsView } from "@/components/seeker/AlertsView";
import { getEmails } from "@/server/data";
import { getAppUser } from "@/server/session";

export const dynamic = "force-dynamic";

export default async function AlertsPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const user = (await getAppUser())!;
  const [searches, emails] = await Promise.all([prisma.savedSearch.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }), getEmails(user.email)]);
  return (
    <PublicPage locale={locale}>
      <AlertsView
        locale={locale}
        searches={searches.map((s) => ({ id: s.id, name: s.name, query: s.query, polygon: s.polygon, frequency: s.frequency, newCount: s.newCount, lastSentAt: s.lastSentAt?.toISOString() ?? null }))}
        emails={emails}
      />
    </PublicPage>
  );
}

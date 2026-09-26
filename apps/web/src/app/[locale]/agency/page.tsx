import type { Locale } from "@/types/domain";
import { AgencyDashboard } from "@/components/agency/Dashboard";

export default async function Page({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  return <AgencyDashboard locale={locale} />;
}

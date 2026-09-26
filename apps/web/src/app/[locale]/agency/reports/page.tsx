import type { Locale } from "@/types/domain";
import { ReportsView } from "@/components/agency/Reports";

export default async function Page({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  return <ReportsView locale={locale} />;
}

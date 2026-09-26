import type { Locale } from "@/types/domain";
import { TeamView } from "@/components/agency/Team";

export default async function Page({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  return <TeamView locale={locale} />;
}

import type { Locale } from "@/types/domain";
import { LeadsInbox } from "@/components/agency/LeadsInbox";

export default async function Page({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  return <LeadsInbox locale={locale} />;
}

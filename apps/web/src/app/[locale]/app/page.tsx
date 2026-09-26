import type { Locale } from "@/types/domain";
import { PublicPage } from "@/components/layout/PublicPage";
import { HubView } from "@/components/seeker/HubView";

export default async function Hub({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  return (
    <PublicPage locale={locale}>
      <HubView locale={locale} />
    </PublicPage>
  );
}

import type { Locale } from "@/types/domain";
import { PublicPage } from "@/components/layout/PublicPage";
import { OwnerListingsView } from "@/components/owner/OwnerListingsView";

export default async function OwnerListings({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  return (
    <PublicPage locale={locale}>
      <OwnerListingsView locale={locale} />
    </PublicPage>
  );
}

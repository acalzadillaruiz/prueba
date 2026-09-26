import type { Locale } from "@/types/domain";
import { PublicPage } from "@/components/layout/PublicPage";
import { SavedView } from "@/components/seeker/SavedView";
import { LISTINGS } from "@/mock/listings";

export default async function SavedPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  return (
    <PublicPage locale={locale}>
      <SavedView locale={locale} all={LISTINGS} />
    </PublicPage>
  );
}

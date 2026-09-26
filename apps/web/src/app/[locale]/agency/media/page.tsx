import type { Locale } from "@/types/domain";
import { MediaView } from "@/components/agency/Media";

export default async function Page({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  return <MediaView locale={locale} />;
}

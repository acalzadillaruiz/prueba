import type { Locale } from "@/types/domain";
import { PlatformHome } from "@/components/agency/Platform";

export default async function Page({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  return <PlatformHome locale={locale} />;
}

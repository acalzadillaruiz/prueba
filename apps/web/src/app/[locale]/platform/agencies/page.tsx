import type { Locale } from "@/types/domain";
import { PlatformAgencies } from "@/components/agency/Platform";

export default async function Page({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  return <PlatformAgencies locale={locale} />;
}

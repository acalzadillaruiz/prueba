import type { Locale } from "@/types/domain";
import { PlatformUsers } from "@/components/agency/Platform";

export default async function Page({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  return <PlatformUsers locale={locale} />;
}

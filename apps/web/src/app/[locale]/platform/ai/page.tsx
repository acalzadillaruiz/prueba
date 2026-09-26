import type { Locale } from "@/types/domain";
import { PlatformAI } from "@/components/agency/Platform";

export default async function Page({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  return <PlatformAI locale={locale} />;
}

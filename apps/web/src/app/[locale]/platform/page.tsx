import type { Locale } from "@/types/domain";
import { PlatformHome } from "@/components/agency/Platform";
import { platformHome } from "@/server/platform";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  return <PlatformHome locale={locale} data={await platformHome()} />;
}

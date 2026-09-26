import type { Locale } from "@/types/domain";
import { SettingsView } from "@/components/agency/Settings";

export default async function Page({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  return <SettingsView locale={locale} />;
}

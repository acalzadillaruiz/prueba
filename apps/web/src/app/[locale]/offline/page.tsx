import type { Metadata } from "next";
import type { Locale } from "@/types/domain";
import { OfflineScreen } from "@/components/layout/OfflineScreen";

export const metadata: Metadata = { title: "Offline", robots: { index: false, follow: false } };

export default async function Offline({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  return <OfflineScreen locale={locale} />;
}

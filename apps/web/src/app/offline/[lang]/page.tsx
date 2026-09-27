import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OfflineScreen } from "@/components/layout/OfflineScreen";
import { isLocale } from "@/lib/i18n";

/** Fully static (outside the [locale] layout, which reads the session) so it is safe to precache. */
export const dynamic = "force-static";
export const metadata: Metadata = { title: "Offline", robots: { index: false, follow: false } };

export function generateStaticParams() {
  return [{ lang: "es" }, { lang: "en" }];
}

export default async function OfflinePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return <OfflineScreen locale={lang} />;
}

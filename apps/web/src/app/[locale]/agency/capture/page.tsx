import type { Locale } from "@/types/domain";
import { CaptureView } from "@/components/agency/Capture";

export default async function Page({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  return <CaptureView locale={locale} />;
}

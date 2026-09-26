import type { Locale } from "@/types/domain";
import { CalendarView } from "@/components/agency/Calendar";

export default async function Page({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  return <CalendarView locale={locale} />;
}

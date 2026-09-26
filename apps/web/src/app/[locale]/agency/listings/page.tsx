import type { Locale } from "@/types/domain";
import { ListingsTable } from "@/components/agency/ListingsTable";

export default async function Page({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  return <ListingsTable locale={locale} />;
}

import { notFound } from "next/navigation";
import type { Locale } from "@/types/domain";
import { ListingEditor } from "@/components/agency/ListingEditor";
import { listingById } from "@/mock/listings";

export default async function Page({ params }: { params: Promise<{ locale: Locale; id: string }> }) {
  const { locale, id } = await params;
  const l = listingById(id);
  if (!l) notFound();
  return <ListingEditor l={l} locale={locale} />;
}

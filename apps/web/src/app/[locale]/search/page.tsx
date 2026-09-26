import { Suspense } from "react";
import type { Locale } from "@/types/domain";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { SearchView } from "@/components/search/SearchView";
import { publicListings } from "@/mock/listings";

export default async function SearchPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  return (
    <>
      <PublicHeader locale={locale} />
      <Suspense>
        <SearchView locale={locale} all={publicListings()} />
      </Suspense>
    </>
  );
}

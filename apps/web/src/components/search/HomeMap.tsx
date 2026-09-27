"use client";

import { useState } from "react";
import type { Listing, Locale } from "@/types/domain";
import { MapView as NightMap } from "@/components/map/MapView";
import { LazyMount } from "@/components/map/LazyMount";
import { MapPreviewCard } from "@/components/listing/ListingCard";

export function HomeMap({ listings, locale }: { listings: Listing[]; locale: Locale }) {
  const [sel, setSel] = useState<string | null>(null);
  return (
    <LazyMount className="h-[420px] rounded-2xl border border-white/10 shadow-np lg:h-[560px]">
      <NightMap
        listings={listings}
        locale={locale}
        selectedId={sel}
        onSelect={setSel}
        className="h-full w-full"
        renderPreview={(l) => <MapPreviewCard l={l} locale={locale} />}
        initialScale={1.9}
      />
    </LazyMount>
  );
}

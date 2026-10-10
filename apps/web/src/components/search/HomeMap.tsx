"use client";

import { useState } from "react";
import type { Listing, Locale } from "@/types/domain";
import type { LatLng } from "@/lib/geo";
import { MapView } from "@/components/map/MapView";
import { LazyMount } from "@/components/map/LazyMount";
import { MapPreviewCard } from "@/components/listing/ListingCard";
import { cn } from "@/lib/cn";

/** Home "Explore en el mapa": light Mediterranean map of the coast (Caracas → Lechería → Margarita) with roof pins. */
export function HomeMap({ listings, locale, className, region = "venezuela", focus, initialScale = 2.4, phoneScale }: { listings: Listing[]; locale: Locale; className?: string; region?: "caracas" | "venezuela"; focus?: LatLng; initialScale?: number; phoneScale?: number }) {
  const [sel, setSel] = useState<string | null>(null);
  return (
    <LazyMount className={cn("h-[420px] rounded-[4px] lg:h-[520px]", className)}>
      <MapView
        listings={listings}
        locale={locale}
        region={region}
        focus={focus}
        selectedId={sel}
        onSelect={setSel}
        className="h-full w-full"
        renderPreview={(l, variant) => <MapPreviewCard l={l} locale={locale} variant={variant} />}
        // Phones see a narrower slice of the map: `phoneScale` zooms out so every cluster and price pill fits.
        // (Children of LazyMount render only in the browser, so reading the viewport here can't mismatch the server HTML.)
        initialScale={phoneScale && typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches ? phoneScale : initialScale}
      />
    </LazyMount>
  );
}

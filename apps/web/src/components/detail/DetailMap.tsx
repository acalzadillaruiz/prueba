"use client";

import type { Listing, Locale } from "@/types/domain";
import { MapView as NightMap } from "@/components/map/MapView";
import { LazyMount } from "@/components/map/LazyMount";

export function DetailMap({ l, locale, nearby }: { l: Listing; locale: Locale; nearby: Listing[] }) {
  const caracas = l.city === "Caracas";
  return (
    <LazyMount className="h-80 rounded-np">
      <NightMap
        listings={[l, ...nearby]}
        selectedId={l.id}
        locale={locale}
        region={caracas ? "caracas" : "venezuela"}
        focus={{ lat: l.lat, lng: l.lng }}
        initialScale={caracas ? 3.2 : 5}
        className="h-full w-full"
      />
    </LazyMount>
  );
}

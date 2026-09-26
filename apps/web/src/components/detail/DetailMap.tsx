"use client";

import type { Listing, Locale } from "@/types/domain";
import { NightMap } from "@/components/map/NightMap";

export function DetailMap({ l, locale, nearby }: { l: Listing; locale: Locale; nearby: Listing[] }) {
  const caracas = l.city === "Caracas";
  return (
    <NightMap
      listings={[l, ...nearby]}
      selectedId={l.id}
      locale={locale}
      region={caracas ? "caracas" : "venezuela"}
      focus={{ lat: l.lat, lng: l.lng }}
      initialScale={caracas ? 3.2 : 5}
      className="h-80 rounded-np"
    />
  );
}

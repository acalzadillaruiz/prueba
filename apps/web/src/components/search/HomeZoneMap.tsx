"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { Listing, Locale } from "@/types/domain";
import { LazyMount } from "@/components/map/LazyMount";
import { BRISA_ZONES } from "@/components/map/zones";
import { plural, tx } from "@/lib/i18n";
import { cn } from "@/lib/cn";

// The map code (Leaflet + tiles) loads only when the map scrolls into view.
const BrisaMap = dynamic(() => import("@/components/map/BrisaMap").then((m) => m.BrisaMap), { ssr: false });

/** «Busca por zona» (048-B): the light map beside a list of areas; choosing one fits the map to it. */
export function HomeZoneMap({ listings, locale }: { listings: Listing[]; locale: Locale }) {
  const [zone, setZone] = useState<string | null | undefined>(undefined);
  const counts = useMemo(() => {
    const inside = (l: Listing, b: [[number, number], [number, number]]) => l.lat >= b[0][0] && l.lat <= b[1][0] && l.lng >= b[0][1] && l.lng <= b[1][1];
    return Object.fromEntries(BRISA_ZONES.map((z) => [z.id, listings.filter((l) => inside(l, z.bounds)).length]));
  }, [listings]);
  const item = (id: string | null, name: string, n: number) => {
    const on = (zone ?? null) === id;
    return (
      <li key={id ?? "all"} className="shrink-0">
        <button
          type="button"
          aria-pressed={on}
          onClick={() => setZone(id)}
          className={cn(
            "flex min-h-12 w-full items-center justify-between gap-4 rounded-[12px] px-4 text-left text-[16px] transition-colors duration-np ease-np",
            on ? "bg-[#DCE8F2] text-ink" : "text-ink hover:bg-[#DCE8F2]/60",
          )}
        >
          <span className={cn(on && "font-medium")}>{name}</span>
          <span className="np-num text-[14px] text-muted">{n > 0 ? plural(n, locale, ["casa", "casas"], ["home", "homes"]) : tx(locale, "Próximamente", "Coming soon")}</span>
        </button>
      </li>
    );
  };
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-10">
      <LazyMount className="h-[440px] rounded-[24px] md:h-[560px]" loadingLabel={tx(locale, "Cargando el mapa…", "Loading the map…")}>
        <BrisaMap listings={listings} locale={locale} zone={zone} className="h-full w-full" />
      </LazyMount>
      <nav aria-label={tx(locale, "Zonas", "Areas")}>
        <ul className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto px-1 lg:flex-col lg:overflow-visible">
          {item(null, tx(locale, "Todas", "All"), listings.length)}
          {BRISA_ZONES.map((z) => item(z.id, tx(locale, z.name[0], z.name[1]), counts[z.id] ?? 0))}
        </ul>
      </nav>
    </div>
  );
}

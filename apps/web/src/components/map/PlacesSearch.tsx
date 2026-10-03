"use client";

import { useMemo, useState } from "react";
import { MapPin, Search } from "lucide-react";
import type { Locale, Zone } from "@/types/domain";
import { inputCls } from "@/components/ui";
import { tx } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { GOOGLE_MAPS_KEY } from "./config";
import { GooglePlacesInput } from "./GooglePlacesInput";

export interface PlacePick {
  main: string;
  zone: string;
  city: string;
  state?: string;
  country?: string;
  lat: number;
  lng: number;
}

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Address search. With NEXT_PUBLIC_GOOGLE_MAPS_KEY → Google Places Autocomplete (country VE by default).
 *  Without a key → local geocoder over the zone catalogue (point refined by tapping the map). */
export function PlacesSearch({ locale, zones, value, onPick }: { locale: Locale; zones: Zone[]; value: PlacePick | null; onPick: (p: PlacePick) => void }) {
  const [q, setQ] = useState(value?.main ?? "");
  const [country, setCountry] = useState("VE");
  const [open, setOpen] = useState(false);
  const suggestions = useMemo(() => {
    const t = norm(q);
    if (t.length < 3) return [];
    const scored = zones
      .map((z) => ({ z, s: (t.includes(norm(z.name)) ? 3 : 0) + (t.includes(norm(z.city)) ? 1 : 0) + (norm(z.name).includes(t) || norm(z.city).includes(t) ? 2 : 0) }))
      .sort((a, b) => b.s - a.s);
    const top = scored.filter((x) => x.s > 0).slice(0, 5);
    return (top.length ? top : scored.slice(0, 4)).map(({ z }) => z);
  }, [q, zones]);

  if (GOOGLE_MAPS_KEY) return <GooglePlacesInput locale={locale} zones={zones} value={value} onPick={onPick} country={country} setCountry={setCountry} />;

  const pick = (z: Zone) => {
    let h = 0;
    for (const c of q) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    const jitter = (n: number) => ((n % 1000) / 1000 - 0.5) * 0.004;
    const main = q.trim() || z.name;
    onPick({ main, zone: z.name, city: z.city, state: z.state, country: "VE", lat: z.lat + jitter(h), lng: z.lng + jitter(h >> 10) });
    setQ(main);
    setOpen(false);
  };

  return (
    <div className="flex gap-2">
      <select className={cn(inputCls, "w-40")} value={country} onChange={(e) => setCountry(e.target.value)} aria-label={tx(locale, "País", "Country")}>
        <option value="VE">🇻🇪 Venezuela</option>
      </select>
      <div className="relative flex-1">
        <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          className={cn(inputCls, "pl-10")}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={tx(locale, "Calle, edificio y urbanización…", "Street, building and neighborhood…")}
          aria-label={tx(locale, "Dirección", "Address")}
        />
        {open && suggestions.length > 0 && (
          <div className="np-in absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-np border border-line bg-white shadow-np" role="listbox">
            {suggestions.map((z) => (
              <button key={z.slug} role="option" aria-selected={false} onClick={() => pick(z)} className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-ivory">
                <MapPin size={17} className="mt-0.5 text-coral" />
                <span>
                  <span className="block font-semibold">{q.trim() || z.name}</span>
                  <span className="text-sm text-muted">{z.name}, {z.city}, {z.state}, Venezuela</span>
                </span>
              </button>
            ))}
            <div className="border-t border-line px-4 py-1.5 text-right text-[10px] text-muted">{tx(locale, "Geocodificador local · añade NEXT_PUBLIC_GOOGLE_MAPS_KEY para Google Places", "Local geocoder · set NEXT_PUBLIC_GOOGLE_MAPS_KEY for Google Places")}</div>
          </div>
        )}
      </div>
    </div>
  );
}

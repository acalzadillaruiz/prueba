"use client";

import { useEffect, useRef } from "react";
import { APIProvider, useMapsLibrary } from "@vis.gl/react-google-maps";
import type { Locale, Zone } from "@/types/domain";
import { inputCls } from "@/components/ui";
import { tx } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { GOOGLE_MAPS_KEY } from "./config";
import type { PlacePick } from "./PlacesSearch";

const COUNTRIES = [
  ["VE", "🇻🇪 Venezuela"],
  ["CO", "🇨🇴 Colombia"],
  ["PA", "🇵🇦 Panamá"],
  ["ES", "🇪🇸 España"],
  ["US", "🇺🇸 USA"],
  ["MX", "🇲🇽 México"],
] as const;

function Inner({ locale, zones, value, onPick, country, describedBy }: { locale: Locale; zones: Zone[]; value: PlacePick | null; onPick: (p: PlacePick) => void; country: string; describedBy?: string }) {
  const places = useMapsLibrary("places");
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!places || !ref.current) return;
    const ac = new places.Autocomplete(ref.current, { componentRestrictions: { country: country.toLowerCase() }, fields: ["geometry", "address_components", "formatted_address", "name"] });
    const l = ac.addListener("place_changed", () => {
      const p = ac.getPlace();
      const loc = p.geometry?.location;
      if (!loc) return;
      const comp = (t: string) => p.address_components?.find((c) => c.types.includes(t))?.long_name;
      const hood = comp("neighborhood") ?? comp("sublocality_level_1") ?? comp("sublocality") ?? comp("locality") ?? "";
      const known = zones.find((z) => z.name.toLowerCase() === hood.toLowerCase());
      onPick({
        main: p.name && p.formatted_address?.startsWith(p.name) ? p.formatted_address.split(",")[0] : (p.name ?? p.formatted_address ?? ""),
        zone: known?.name ?? hood,
        city: comp("locality") ?? comp("administrative_area_level_2") ?? known?.city ?? "",
        state: comp("administrative_area_level_1") ?? "",
        country: p.address_components?.find((c) => c.types.includes("country"))?.short_name ?? country,
        lat: loc.lat(),
        lng: loc.lng(),
      });
    });
    return () => l.remove();
  }, [places, country, zones, onPick]);
  return <input ref={ref} defaultValue={value?.main} className={inputCls} placeholder={tx(locale, "Calle y edificio", "Street and building")} aria-label={tx(locale, "Dirección", "Address")} aria-describedby={describedBy} />;
}

/** Google Places Autocomplete (componentRestrictions country, VE by default) + country selector. */
export function GooglePlacesInput(props: { locale: Locale; zones: Zone[]; value: PlacePick | null; onPick: (p: PlacePick) => void; country: string; setCountry: (c: string) => void; describedBy?: string }) {
  return (
    <APIProvider apiKey={GOOGLE_MAPS_KEY} language={props.locale}>
      <div className="flex flex-col gap-2 sm:flex-row">
        <select className={cn(inputCls, "w-full sm:w-40 sm:shrink-0")} value={props.country} onChange={(e) => props.setCountry(e.target.value)} aria-label={tx(props.locale, "País", "Country")}>
          {COUNTRIES.map(([c, n]) => (
            <option key={c} value={c}>{n}</option>
          ))}
        </select>
        <div className="flex-1">
          <Inner {...props} />
        </div>
      </div>
    </APIProvider>
  );
}

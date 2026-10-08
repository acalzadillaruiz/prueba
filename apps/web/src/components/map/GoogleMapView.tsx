"use client";

import { useEffect, useRef, useState } from "react";
import { APIProvider, InfoWindow, Map, useMap } from "@vis.gl/react-google-maps";
import { MarkerClusterer } from "@googlemaps/markerclusterer";
import { Minus, Moon, Plus, Search, Sun } from "lucide-react";
import type { Listing } from "@/types/domain";
import type { LatLng } from "@/lib/geo";
import { compactMoney, tx } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { GOOGLE_MAPS_KEY, GOOGLE_MAP_ID } from "./config";
import { LIGHT_STYLE, NIGHT_STYLE } from "./nightStyle";
import type { MapViewProps } from "./MapView";
import { FIT_PADDING } from "./NightMap";
import { ShapeTools, UnderMapTools } from "./ShapeTools";

const CARACAS = { lat: 10.4806, lng: -66.9036 };

/** Roof-shaped price pin (brand): white label + small roof; selected = navy label, terracotta roof, rosa-cal halo. */
function pillIcon(label: string, active: boolean): google.maps.Icon {
  const w = Math.round(label.length * 7.8 + 22);
  const W = w + 12;
  const cx = W / 2;
  const svg = active
    ? `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="48"><path d="M${cx - 20} 14 L${cx} 2 L${cx + 20} 14 Z" fill="#8E3B22"/><rect x="2" y="15" width="${W - 4}" height="31" rx="10" fill="#EBD5C8"/><rect x="6" y="18" width="${w}" height="25" rx="7" fill="#1E1A18"/><text x="${cx}" y="35" text-anchor="middle" font-family="Manrope,Arial" font-weight="600" font-size="13" fill="#FFFFFF">${label}</text></svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="48"><path d="M${cx - 16} 19 L${cx} 9 L${cx + 16} 19 Z" fill="#FFFFFF"/><rect x="6" y="18" width="${w}" height="25" rx="7" fill="#FFFFFF" stroke="#E3D7C2"/><text x="${cx}" y="35" text-anchor="middle" font-family="Manrope,Arial" font-weight="600" font-size="13" fill="#1E1A18">${label}</text></svg>`;
  return { url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`, anchor: new google.maps.Point(W / 2, 46), scaledSize: new google.maps.Size(W, 48) };
}

function Layers({ props, theme, mode, setMode, draft, setDraft }: { props: MapViewProps; theme: "night" | "light"; mode: "pan" | "draw" | "radius"; setMode: (m: "pan" | "draw" | "radius") => void; draft: LatLng[]; setDraft: (d: LatLng[]) => void }) {
  const map = useMap();
  const { listings, locale, selectedId, hoverId, onSelect, shape, onShape, pin, onPick } = props;
  const clusterer = useRef<MarkerClusterer | null>(null);
  const markers = useRef<Record<string, google.maps.Marker>>({});
  const shapeRefs = useRef<(google.maps.Polygon | google.maps.Circle | google.maps.Polyline | google.maps.Marker)[]>([]);

  // listing markers + clustering
  useEffect(() => {
    if (!map) return;
    clusterer.current ??= new MarkerClusterer({
      map,
      renderer: {
        render: ({ count, position }) =>
          new google.maps.Marker({
            position,
            label: { text: String(count), color: "#F1EBE3", fontWeight: "600", fontFamily: "Manrope, Arial" },
            icon: { path: google.maps.SymbolPath.CIRCLE, scale: 17, fillColor: "#1E1A18", fillOpacity: 1, strokeColor: "#F1EBE3", strokeWeight: 2 },
            zIndex: 1000 + count,
          }),
      },
    });
    const c = clusterer.current;
    c.clearMarkers();
    markers.current = {};
    const list = listings.map((l: Listing) => {
      const label = compactMoney(l.priceAmount, locale) + (l.pricePeriod === "night" ? tx(locale, "/n", "/nt") : l.pricePeriod === "month" ? tx(locale, "/m", "/mo") : "");
      const m = new google.maps.Marker({ position: { lat: l.lat, lng: l.lng }, icon: pillIcon(label, l.id === selectedId || l.id === hoverId), title: tx(locale, l.title_es, l.title_en) });
      m.addListener("click", () => onSelect?.(l.id));
      markers.current[l.id] = m;
      return m;
    });
    c.addMarkers(list);
    return () => c.clearMarkers();
  }, [map, listings, locale, selectedId, hoverId, onSelect]);

  // fit to results (again whenever the set of results changes, not only its size)
  const fitKey = listings.map((l) => l.id).join(",");
  useEffect(() => {
    if (!map || !listings.length || pin) return;
    const b = new google.maps.LatLngBounds();
    listings.forEach((l) => b.extend({ lat: l.lat, lng: l.lng }));
    if (listings.length === 1) {
      map.setCenter(b.getCenter());
      map.setZoom(15);
    } else map.fitBounds(b, props.fitPadding ?? FIT_PADDING);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, fitKey]);

  // style
  useEffect(() => {
    if (!map || GOOGLE_MAP_ID) return;
    map.setOptions({ styles: theme === "night" ? NIGHT_STYLE : LIGHT_STYLE });
  }, [map, theme]);

  // shape / draft / pin overlays
  useEffect(() => {
    if (!map) return;
    shapeRefs.current.forEach((s) => s.setMap(null));
    shapeRefs.current = [];
    const coral = "#8E3B22"; // terracotta drawn areas
    if (shape?.type === "poly") shapeRefs.current.push(new google.maps.Polygon({ map, paths: shape.pts, strokeColor: coral, strokeWeight: 2, fillColor: coral, fillOpacity: 0.12, clickable: false }));
    if (shape?.type === "radius") shapeRefs.current.push(new google.maps.Circle({ map, center: shape.center, radius: shape.km * 1000, strokeColor: coral, strokeWeight: 2, fillColor: coral, fillOpacity: 0.12, clickable: false }));
    if (draft.length) shapeRefs.current.push(new google.maps.Polyline({ map, path: draft, strokeColor: coral, strokeWeight: 2, clickable: false }));
    if (pin) shapeRefs.current.push(new google.maps.Marker({ map, position: pin, icon: pillIcon("•", true) }));
  }, [map, shape, draft, pin]);

  // clicks
  useEffect(() => {
    if (!map) return;
    const l = map.addListener("click", (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      const p = { lat: e.latLng.lat(), lng: e.latLng.lng() };
      if (mode === "draw") setDraft([...draft, p]);
      else if (mode === "radius") {
        onShape?.({ type: "radius", center: p, km: 1.2 });
        setMode("pan");
      } else if (onPick) onPick(p);
      else onSelect?.(null);
    });
    return () => l.remove();
  }, [map, mode, draft, setDraft, onShape, setMode, onPick, onSelect]);

  const sel = listings.find((l) => l.id === selectedId);
  return sel && props.renderPreview ? (
    <InfoWindow position={{ lat: sel.lat, lng: sel.lng }} pixelOffset={[0, -36]} onCloseClick={() => onSelect?.(null)} headerDisabled>
      <div className="w-60">{props.renderPreview(sel, "card")}</div>
    </InfoWindow>
  ) : null;
}

export function GoogleMapView(props: MapViewProps) {
  const { locale, onShape, shape, controls = true, className, focus, initialScale, region = "caracas" } = props;
  const [theme, setTheme] = useState<"night" | "light">(props.initialTheme ?? "light");
  const ctl = theme === "light" ? "border-[#E3D7C2] bg-[#ffffff] text-[#1E1A18]" : "border-white/10 bg-navy/90 text-ivory";
  const [mode, setMode] = useState<"pan" | "draw" | "radius">("pan");
  const [draft, setDraft] = useState<LatLng[]>([]);
  const zoom = region === "venezuela" ? 6 : Math.round(11 + Math.log2(Math.max(1, initialScale ?? 1.5)));
  return (
    <div className={cn("relative overflow-hidden bg-[#DECFBB]", className)}>
      <APIProvider apiKey={GOOGLE_MAPS_KEY} language={locale} libraries={["geometry"]}>
        <Map
          defaultCenter={focus ?? (region === "venezuela" ? { lat: 8, lng: -66.3 } : CARACAS)}
          defaultZoom={zoom}
          mapId={GOOGLE_MAP_ID || undefined}
          disableDefaultUI
          clickableIcons={false}
          gestureHandling="greedy"
          styles={GOOGLE_MAP_ID ? undefined : LIGHT_STYLE}
          className="h-full w-full"
        >
          <Layers props={props} theme={theme} mode={mode} setMode={setMode} draft={draft} setDraft={setDraft} />
          <ZoomButtons className={ctl} />
          {props.onArea && controls && <SearchArea locale={locale} onArea={props.onArea} />}
        </Map>
      </APIProvider>
      {controls && (
        <>
          <div className="absolute right-3 top-24 z-10">
            <button aria-label={theme === "light" ? tx(locale, "Mapa nocturno", "Night map") : tx(locale, "Mapa claro", "Light map")} aria-pressed={theme === "night"} className={cn("flex h-11 w-11 items-center justify-center rounded-xl border shadow-np", ctl)} onClick={() => setTheme((t) => (t === "night" ? "light" : "night"))}>
              {theme === "night" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
          <ShapeTools
            locale={locale}
            mode={mode}
            onMode={(m) => {
              setDraft([]);
              setMode(m);
            }}
            draftCount={draft.length}
            onClosePoly={() => {
              if (draft.length >= 3) onShape?.({ type: "poly", pts: draft });
              setDraft([]);
              setMode("pan");
            }}
            onClear={onShape && shape ? () => onShape(null) : undefined}
            enabled={!!onShape}
            ctl={ctl}
            ctlHover="hover:bg-black/5"
            toolbar={props.toolbar}
          />
        </>
      )}
    </div>
  );
}

/** "Buscar en esta zona" after the visitor drags or zooms: the visible bounds as [south, west, north, east]. */
function SearchArea({ locale, onArea }: { locale: MapViewProps["locale"]; onArea: NonNullable<MapViewProps["onArea"]> }) {
  const map = useMap();
  const [moved, setMoved] = useState(false);
  useEffect(() => {
    if (!map) return;
    const on = () => setMoved(true);
    const drag = map.addListener("dragend", on);
    const div = map.getDiv();
    div.addEventListener("wheel", on, { passive: true });
    return () => {
      drag.remove();
      div.removeEventListener("wheel", on);
    };
  }, [map]);
  if (!moved) return null;
  return (
    <UnderMapTools>
      <button
        type="button"
        data-search-area
        onClick={() => {
          const b = map?.getBounds();
          if (!b) return;
          setMoved(false);
          onArea([b.getSouthWest().lat(), b.getSouthWest().lng(), b.getNorthEast().lat(), b.getNorthEast().lng()]);
        }}
        className="pointer-events-auto flex min-h-11 items-center gap-2 whitespace-nowrap rounded-full bg-[#1E1A18] px-4 font-display text-sm font-semibold text-[#F1EBE3] shadow-np"
      >
        <Search size={15} aria-hidden /> {tx(locale, "Buscar en esta zona", "Search this area")}
      </button>
    </UnderMapTools>
  );
}

function ZoomButtons({ className }: { className: string }) {
  const map = useMap();
  return (
    <div className={cn("absolute right-3 top-3 z-10 flex flex-col overflow-hidden rounded-xl border shadow-np", className)}>
      <button aria-label="Zoom in" className="flex h-11 w-11 items-center justify-center hover:bg-black/5" onClick={() => map?.setZoom((map.getZoom() ?? 12) + 1)}><Plus size={16} /></button>
      <button aria-label="Zoom out" className="flex h-11 w-11 items-center justify-center border-t border-inherit hover:bg-black/5" onClick={() => map?.setZoom((map.getZoom() ?? 12) - 1)}><Minus size={16} /></button>
    </div>
  );
}

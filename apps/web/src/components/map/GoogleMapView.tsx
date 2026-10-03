"use client";

import { useEffect, useRef, useState } from "react";
import { APIProvider, InfoWindow, Map, useMap } from "@vis.gl/react-google-maps";
import { MarkerClusterer } from "@googlemaps/markerclusterer";
import { Circle as CircleIcon, Minus, Moon, PenLine, Plus, Sun, X } from "lucide-react";
import type { Listing } from "@/types/domain";
import type { LatLng } from "@/lib/geo";
import { compactMoney, tx } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { GOOGLE_MAPS_KEY, GOOGLE_MAP_ID } from "./config";
import { NIGHT_STYLE } from "./nightStyle";
import type { MapViewProps } from "./MapView";

const CARACAS = { lat: 10.4806, lng: -66.9036 };

function pillIcon(label: string, active: boolean, gold: boolean): google.maps.Icon {
  const w = Math.round(label.length * 7.6 + 20);
  const bg = active ? "#F8F5EF" : gold ? "#B4935A" : "#A8452A";
  const fg = active || gold ? "#162638" : "#FFFFFF";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="36"><path d="M${w / 2 - 6} 26 L${w / 2} 34 L${w / 2 + 6} 26 Z" fill="${bg}"/><rect x="1" y="1" width="${w - 2}" height="26" rx="13" fill="${bg}" stroke="#162638" stroke-width="1.5"/><text x="${w / 2}" y="18.5" text-anchor="middle" font-family="Outfit,Arial" font-weight="700" font-size="12.5" fill="${fg}">${label}</text></svg>`;
  return { url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`, anchor: new google.maps.Point(w / 2, 34), scaledSize: new google.maps.Size(w, 36) };
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
            label: { text: String(count), color: "#fff", fontWeight: "700", fontFamily: "Outfit, Arial" },
            icon: { path: google.maps.SymbolPath.CIRCLE, scale: 16, fillColor: "#A8452A", fillOpacity: 1, strokeColor: "#162638", strokeWeight: 2 },
            zIndex: 1000 + count,
          }),
      },
    });
    const c = clusterer.current;
    c.clearMarkers();
    markers.current = {};
    const list = listings.map((l: Listing) => {
      const label = compactMoney(l.priceAmount, locale) + (l.pricePeriod === "night" ? tx(locale, "/n", "/nt") : l.pricePeriod === "month" ? tx(locale, "/m", "/mo") : "");
      const m = new google.maps.Marker({ position: { lat: l.lat, lng: l.lng }, icon: pillIcon(label, l.id === selectedId || l.id === hoverId, l.luxury), title: tx(locale, l.title_es, l.title_en) });
      m.addListener("click", () => onSelect?.(l.id));
      markers.current[l.id] = m;
      return m;
    });
    c.addMarkers(list);
    return () => c.clearMarkers();
  }, [map, listings, locale, selectedId, hoverId, onSelect]);

  // fit to results
  useEffect(() => {
    if (!map || !listings.length || pin) return;
    const b = new google.maps.LatLngBounds();
    listings.forEach((l) => b.extend({ lat: l.lat, lng: l.lng }));
    if (listings.length === 1) {
      map.setCenter(b.getCenter());
      map.setZoom(15);
    } else map.fitBounds(b, 60);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, listings.length]);

  // style
  useEffect(() => {
    if (!map || GOOGLE_MAP_ID) return;
    map.setOptions({ styles: theme === "night" ? NIGHT_STYLE : [] });
  }, [map, theme]);

  // shape / draft / pin overlays
  useEffect(() => {
    if (!map) return;
    shapeRefs.current.forEach((s) => s.setMap(null));
    shapeRefs.current = [];
    const coral = "#A8452A";
    if (shape?.type === "poly") shapeRefs.current.push(new google.maps.Polygon({ map, paths: shape.pts, strokeColor: coral, strokeWeight: 2, fillColor: coral, fillOpacity: 0.12, clickable: false }));
    if (shape?.type === "radius") shapeRefs.current.push(new google.maps.Circle({ map, center: shape.center, radius: shape.km * 1000, strokeColor: coral, strokeWeight: 2, fillColor: coral, fillOpacity: 0.12, clickable: false }));
    if (draft.length) shapeRefs.current.push(new google.maps.Polyline({ map, path: draft, strokeColor: coral, strokeWeight: 2, clickable: false }));
    if (pin) shapeRefs.current.push(new google.maps.Marker({ map, position: pin, icon: pillIcon("•", true, false) }));
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
      <div className="w-60">{props.renderPreview(sel)}</div>
    </InfoWindow>
  ) : null;
}

export function GoogleMapView(props: MapViewProps) {
  const { locale, onShape, shape, controls = true, className, focus, initialScale, region = "caracas" } = props;
  const [theme, setTheme] = useState<"night" | "light">(props.initialTheme ?? "night");
  const [mode, setMode] = useState<"pan" | "draw" | "radius">("pan");
  const [draft, setDraft] = useState<LatLng[]>([]);
  const zoom = region === "venezuela" ? 6 : Math.round(11 + Math.log2(Math.max(1, initialScale ?? 1.5)));
  return (
    <div className={cn("relative overflow-hidden bg-navy", className)}>
      <APIProvider apiKey={GOOGLE_MAPS_KEY} language={locale} libraries={["geometry"]}>
        <Map
          defaultCenter={focus ?? (region === "venezuela" ? { lat: 8, lng: -66.3 } : CARACAS)}
          defaultZoom={zoom}
          mapId={GOOGLE_MAP_ID || undefined}
          disableDefaultUI
          clickableIcons={false}
          gestureHandling="greedy"
          styles={GOOGLE_MAP_ID ? undefined : NIGHT_STYLE}
          className="h-full w-full"
        >
          <Layers props={props} theme={theme} mode={mode} setMode={setMode} draft={draft} setDraft={setDraft} />
          <ZoomButtons />
        </Map>
      </APIProvider>
      {controls && (
        <>
          <div className="absolute right-3 top-24 z-10">
            <button aria-label={tx(locale, "Cambiar estilo de mapa", "Toggle map style")} className="rounded-xl border border-white/10 bg-navy/90 p-2.5 text-ivory shadow-np" onClick={() => setTheme((t) => (t === "night" ? "light" : "night"))}>
              {theme === "night" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
          {onShape && (
            <div className="absolute left-3 top-3 z-10 flex flex-wrap gap-2">
              <button className={cn("flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-display text-sm shadow-np", mode === "draw" ? "border-coral bg-coral-cta text-white" : "border-white/10 bg-navy/90 text-ivory")} onClick={() => { setDraft([]); setMode(mode === "draw" ? "pan" : "draw"); }}>
                <PenLine size={14} /> {mode === "draw" ? tx(locale, "Toca para dibujar…", "Tap to draw…") : tx(locale, "Dibujar zona", "Draw area")}
              </button>
              <button className={cn("flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-display text-sm shadow-np", mode === "radius" ? "border-coral bg-coral-cta text-white" : "border-white/10 bg-navy/90 text-ivory")} onClick={() => setMode(mode === "radius" ? "pan" : "radius")}>
                <CircleIcon size={14} /> {tx(locale, "Radio 1,2 km", "1.2 km radius")}
              </button>
              {mode === "draw" && draft.length >= 3 && (
                <button className="rounded-full bg-ivory px-3 py-1.5 font-display text-sm text-navy shadow-np" onClick={() => { onShape({ type: "poly", pts: draft }); setDraft([]); setMode("pan"); }}>
                  {tx(locale, "Cerrar zona", "Close area")} ({draft.length})
                </button>
              )}
              {shape && (
                <button className="flex items-center gap-1 rounded-full bg-ivory px-3 py-1.5 font-display text-sm text-navy shadow-np" onClick={() => onShape(null)}>
                  <X size={14} /> {tx(locale, "Quitar zona", "Clear area")}
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ZoomButtons() {
  const map = useMap();
  return (
    <div className="absolute right-3 top-3 z-10 flex flex-col overflow-hidden rounded-xl border border-white/10 bg-navy/90 text-ivory shadow-np">
      <button aria-label="Zoom in" className="p-2.5 hover:bg-white/10" onClick={() => map?.setZoom((map.getZoom() ?? 12) + 1)}><Plus size={16} /></button>
      <button aria-label="Zoom out" className="border-t border-white/10 p-2.5 hover:bg-white/10" onClick={() => map?.setZoom((map.getZoom() ?? 12) - 1)}><Minus size={16} /></button>
    </div>
  );
}

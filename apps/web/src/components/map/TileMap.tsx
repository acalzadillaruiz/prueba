"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import { Minus, Plus, Search, X } from "lucide-react";
import type { Listing, Locale } from "@/types/domain";
import type { LatLng } from "@/lib/geo";
import { plural, shortMoney, tx } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { ShapeTools, UnderMapTools, type MapMode } from "./ShapeTools";
import type { NightMapProps } from "./NightMap";

const FIT_PADDING = { top: 108, right: 72, bottom: 40, left: 48 };
import { TILES } from "./tiles";

/**
 * Brisa tile map (048-B / 048-Q): the search, listing and wizard maps on real light tiles (./tiles), with the same
 * contract as the illustrated NightMap it replaces — price pills, clusters, the preview card (md+) or swipeable sheet
 * (phones), «Buscar en esta zona», «Delimitar zona» (polygon or 1,2 km radius), a single pin and pick-on-click.
 * The wheel scrolls the page (zoom with +/−, pinch or double click), so the map never traps the scroll.
 */
const REGION_VIEW: Record<"caracas" | "venezuela", { center: [number, number]; zoom: number }> = {
  caracas: { center: [10.487, -66.858], zoom: 13 },
  venezuela: { center: [8.0, -66.3], zoom: 6 },
};

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const pinLabel = (l: Listing, locale: Locale) => shortMoney(l.priceAmount, locale) + (l.pricePeriod === "night" ? tx(locale, "/n", "/nt") : l.pricePeriod === "month" ? tx(locale, "/m", "/mo") : "");
/** NightMap's zoom scale (1–8) → a Leaflet zoom for the same region. */
const scaleToZoom = (region: "caracas" | "venezuela", s: number) => REGION_VIEW[region].zoom - 1 + Math.log2(Math.max(0.9, s));

export function TileMap({
  listings,
  locale,
  region = "caracas",
  selectedId,
  hoverId,
  onSelect,
  shape,
  onShape,
  controls = true,
  className,
  renderPreview,
  initialScale,
  focus,
  pin,
  onPick,
  fitPoints,
  fitPadding = FIT_PADDING,
  fitMaxScale = 8,
  toolbar,
  previewInset = 12,
  onArea,
}: NightMapProps) {
  const box = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const LRef = useRef<typeof Leaflet | null>(null);
  const markers = useRef(new Map<string, Leaflet.Marker>());
  const clusterRef = useRef<Leaflet.LayerGroup | null>(null);
  const shapeLayer = useRef<Leaflet.Layer | null>(null);
  const draftLayer = useRef<Leaflet.Polyline | null>(null);
  const pinLayer = useRef<Leaflet.Marker | null>(null);
  const touched = useRef(false);
  const [ready, setReady] = useState(false);
  const [moved, setMoved] = useState(false);
  const [mode, setMode] = useState<MapMode>("pan");
  const [draft, setDraft] = useState<LatLng[]>([]);
  const [failed, setFailed] = useState(false);
  const [tick, setTick] = useState(0); // re-render on move/zoom so the preview card follows its pin
  const [wide, setWide] = useState(true);
  const [size, setSize] = useState({ w: 0, h: 0 });

  // Latest props for Leaflet event handlers (bound once).
  const live = useRef({ onSelect, onPick, onShape, mode, fitPoints, fitPadding, fitMaxScale, region });
  live.current = { onSelect, onPick, onShape, mode, fitPoints, fitPadding, fitMaxScale, region };

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const on = () => setWide(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  const fit = useCallback(() => {
    const map = mapRef.current;
    const L = LRef.current;
    const { fitPoints: pts, fitPadding: pad, fitMaxScale: maxS, region: reg } = live.current;
    if (!map || !L || touched.current || !pts?.length) return;
    map.fitBounds(L.latLngBounds(pts.map((p) => [p.lat, p.lng] as [number, number])), {
      paddingTopLeft: [pad.left, pad.top],
      paddingBottomRight: [pad.right, pad.bottom],
      maxZoom: Math.round(scaleToZoom(reg, maxS)),
      animate: false,
    });
  }, []);

  // Build the map once.
  useEffect(() => {
    let alive = true;
    let cleanup = () => {};
    const markerMap = markers.current;
    (async () => {
      try {
        const L = (await import("leaflet")).default;
        await import("leaflet.markercluster");
        if (!alive || !box.current) return;
        LRef.current = L;
        const start = focus ? { center: [focus.lat, focus.lng] as [number, number], zoom: initialScale ? scaleToZoom(region, initialScale) : REGION_VIEW[region].zoom } : REGION_VIEW[region];
        const map = L.map(box.current, { zoomControl: false, scrollWheelZoom: false, zoomSnap: 0.25, attributionControl: true, minZoom: 5, maxZoom: 18 }).setView(start.center, start.zoom);
        for (const layer of TILES.layers) L.tileLayer(layer.url, { attribution: layer.attribution, maxZoom: layer.maxZoom ?? 17, className: layer.className, detectRetina: true }).addTo(map);
        map.attributionControl.setPrefix(false);
        const userMove = () => {
          touched.current = true;
          setMoved(true);
        };
        map.on("dragstart", userMove);
        map.on("move zoom", () => setTick((t) => t + 1));
        map.on("click", (e: Leaflet.LeafletMouseEvent) => {
          const ll = { lat: e.latlng.lat, lng: e.latlng.lng };
          const { mode: m, onShape: shapeCb, onPick: pick, onSelect: sel } = live.current;
          if (m === "draw") setDraft((d) => [...d, ll]);
          else if (m === "radius") {
            shapeCb?.({ type: "radius", center: ll, km: 1.2 });
            setMode("pan");
          } else if (pick) pick(ll);
          else sel?.(null);
        });
        const ro = new ResizeObserver(() => {
          const r = box.current?.getBoundingClientRect();
          if (r) setSize({ w: r.width, h: r.height });
          map.invalidateSize();
          fit();
        });
        ro.observe(box.current);
        mapRef.current = map;
        setReady(true);
        fit();
        cleanup = () => {
          ro.disconnect();
          map.remove();
        };
      } catch {
        if (alive) setFailed(true);
      }
    })();
    return () => {
      alive = false;
      cleanup();
      mapRef.current = null;
      markerMap.clear();
    };
    // Region, focus and scale only set the first view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fit when the results change (until the visitor moves the map).
  const fitKey = fitPoints?.map((p) => `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`).join("|");
  useEffect(() => {
    if (ready) fit();
  }, [ready, fitKey, fit]);

  // Pins and clusters.
  useEffect(() => {
    const map = mapRef.current;
    const L = LRef.current;
    if (!ready || !map || !L) return;
    clusterRef.current?.remove();
    markers.current.clear();
    const cluster = (L as unknown as { markerClusterGroup: (o: object) => Leaflet.LayerGroup }).markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 52,
      spiderfyOnMaxZoom: true,
      iconCreateFunction: (c: { getChildCount: () => number }) =>
        L.divIcon({ html: `<span aria-hidden="true">${c.getChildCount()}</span>`, className: "np-pin-cluster", iconSize: [44, 44] }),
    });
    for (const l of listings) {
      if (typeof l.lat !== "number" || typeof l.lng !== "number") continue;
      const label = pinLabel(l, locale);
      const icon = L.divIcon({ html: `<span class="np-pin-pill">${esc(label)}</span>`, className: "np-pin", iconSize: null as unknown as Leaflet.PointExpression, iconAnchor: [0, 0] });
      const m = L.marker([l.lat, l.lng], { icon, keyboard: true, riseOnHover: true, title: `${label}${l.zone ? ` · ${l.zone}` : ""}`, alt: `${label}${l.zone ? ` · ${l.zone}` : ""}` });
      m.on("click", (e: Leaflet.LeafletMouseEvent) => {
        L.DomEvent.stopPropagation(e);
        // While marking an area, a tap on a pin counts as a point of the area, like a tap on the map.
        const { mode: md, onShape: shapeCb } = live.current;
        const ll = { lat: e.latlng.lat, lng: e.latlng.lng };
        if (md === "draw") setDraft((d) => [...d, ll]);
        else if (md === "radius") {
          shapeCb?.({ type: "radius", center: ll, km: 1.2 });
          setMode("pan");
        } else live.current.onSelect?.(l.id);
      });
      m.on("keypress", (e: Leaflet.LeafletKeyboardEvent) => {
        if (e.originalEvent.key === "Enter" || e.originalEvent.key === " ") live.current.onSelect?.(l.id);
      });
      markers.current.set(l.id, m);
      cluster.addLayer(m);
    }
    cluster.on("clusterclick", () => {
      touched.current = true;
      setMoved(true);
    });
    map.addLayer(cluster);
    clusterRef.current = cluster;
  }, [ready, listings, locale]);

  // Active pill: selected or hovered.
  useEffect(() => {
    for (const [id, m] of markers.current) m.getElement()?.classList.toggle("is-active", id === selectedId || id === hoverId);
    const sel = selectedId ? markers.current.get(selectedId) : undefined;
    const cl = clusterRef.current as unknown as { zoomToShowLayer?: (m: Leaflet.Marker, cb: () => void) => void } | null;
    if (sel && cl?.zoomToShowLayer && !sel.getElement()) cl.zoomToShowLayer(sel, () => sel.getElement()?.classList.add("is-active"));
  }, [selectedId, hoverId, tick]);

  // The drawn area.
  useEffect(() => {
    const map = mapRef.current;
    const L = LRef.current;
    if (!ready || !map || !L) return;
    shapeLayer.current?.remove();
    shapeLayer.current = null;
    const style = { color: "#3A6A92", weight: 2, fillColor: "#5B8DB8", fillOpacity: 0.12 };
    if (shape?.type === "poly") shapeLayer.current = L.polygon(shape.pts.map((p) => [p.lat, p.lng] as [number, number]), { ...style, dashArray: "6 4", className: "np-shape-poly" }).addTo(map);
    else if (shape?.type === "radius") shapeLayer.current = L.circle([shape.center.lat, shape.center.lng], { ...style, radius: shape.km * 1000, className: "np-shape-radius" }).addTo(map);
  }, [ready, shape]);

  // The polygon being drawn.
  useEffect(() => {
    const map = mapRef.current;
    const L = LRef.current;
    if (!ready || !map || !L) return;
    draftLayer.current?.remove();
    draftLayer.current = draft.length ? L.polyline(draft.map((p) => [p.lat, p.lng] as [number, number]), { color: "#3A6A92", weight: 2 }).addTo(map) : null;
    map.getContainer().style.cursor = mode === "pan" ? "" : "crosshair";
  }, [ready, draft, mode]);

  // A single pin (owner wizard address).
  useEffect(() => {
    const map = mapRef.current;
    const L = LRef.current;
    if (!ready || !map || !L) return;
    pinLayer.current?.remove();
    pinLayer.current = pin
      ? L.marker([pin.lat, pin.lng], { icon: L.divIcon({ html: '<span class="np-pin-dot"></span>', className: "np-pin", iconSize: [20, 20], iconAnchor: [10, 10] }), interactive: false }).addTo(map)
      : null;
  }, [ready, pin]);

  const zoomBy = (d: number) => {
    touched.current = true;
    setMoved(true);
    mapRef.current?.setZoom((mapRef.current.getZoom() ?? 12) + d);
  };
  const closePoly = () => {
    if (draft.length >= 3) onShape?.({ type: "poly", pts: draft });
    setDraft([]);
    setMode("pan");
  };
  const searchHere = () => {
    const b = mapRef.current?.getBounds();
    if (!b) return;
    setMoved(false);
    onSelect?.(null);
    onArea?.([b.getSouth(), b.getWest(), b.getNorth(), b.getEast()]);
  };

  const selected = listings.find((l) => l.id === selectedId);
  const toPx = (lat: number, lng: number) => {
    const p = mapRef.current?.latLngToContainerPoint([lat, lng]);
    return p ? { x: p.x, y: p.y } : { x: -1, y: -1 };
  };

  // md+: the preview floats above its pin, clamped to the map.
  const previewRef = useRef<HTMLDivElement>(null);
  const [previewH, setPreviewH] = useState(290);
  useLayoutEffect(() => {
    const h = previewRef.current?.offsetHeight;
    if (h && Math.abs(h - previewH) > 1) setPreviewH(h);
  });
  const CARD_W = 256;
  const EDGE = 8;
  const cardPos = (() => {
    if (!selected || !wide || !size.w || !ready) return null;
    const pt = toPx(selected.lat, selected.lng);
    const left = Math.max(EDGE, Math.min(size.w - CARD_W - EDGE, pt.x - CARD_W / 2));
    let top = pt.y - 34 - previewH;
    if (top < EDGE) top = pt.y + 22;
    top = Math.max(EDGE, Math.min(size.h - previewInset - previewH, top));
    return { left, top };
  })();

  // Phones: a bottom sheet, swipeable between the homes in view (left → right).
  const sheetItems = useMemo(() => {
    if (!selected || wide || !size.w || !ready) return [];
    return listings
      .map((l) => ({ l, ...toPx(l.lat, l.lng) }))
      .filter((p) => p.l.id === selected.id || (p.x >= 0 && p.x <= size.w && p.y >= 0 && p.y <= size.h))
      .sort((a, b) => a.x - b.x || a.l.id.localeCompare(b.l.id))
      .slice(0, 40)
      .map((p) => p.l);
    // tick: recompute after the map moves
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, wide, size, listings, ready, tick]);
  const selIdx = sheetItems.findIndex((l) => l.id === selectedId);
  const strip = useRef<HTMLDivElement>(null);
  const SHEET_GAP = 12;
  useLayoutEffect(() => {
    const el = strip.current;
    if (!el || selIdx < 0) return;
    const w = el.clientWidth + SHEET_GAP;
    if (Math.round(el.scrollLeft / w) !== selIdx) el.scrollTo({ left: selIdx * w, behavior: "instant" });
  }, [selIdx, sheetItems.length]);
  const swipeTimer = useRef<number | undefined>(undefined);
  const onStripScroll = () => {
    window.clearTimeout(swipeTimer.current);
    swipeTimer.current = window.setTimeout(() => {
      const el = strip.current;
      if (!el) return;
      const l = sheetItems[Math.round(el.scrollLeft / (el.clientWidth + SHEET_GAP))];
      if (l && l.id !== selectedId) onSelect?.(l.id);
    }, 90);
  };

  const ctl = "border-[#E3E8EC] bg-white text-[#1F3A4D]";
  const ctlHover = "hover:bg-[#DCE8F2]";

  return (
    <div className={cn("np-brisa-map relative overflow-hidden bg-[#CFE3F1]", className)}>
      <div ref={box} className="absolute inset-0" role="application" aria-label={tx(locale, "Mapa de resultados", "Results map")} />
      {failed && (
        <p className="absolute inset-0 grid place-items-center p-6 text-center text-[15px] text-muted">
          {tx(locale, "No pudimos cargar el mapa. Prueba a recargar la página.", "We couldn’t load the map. Try reloading the page.")}
        </p>
      )}

      {selected && renderPreview && cardPos && (
        <div ref={previewRef} data-map-preview className="np-in pointer-events-auto absolute z-[500] w-64" style={{ left: cardPos.left, top: cardPos.top }}>
          {renderPreview(selected, "card")}
          <button type="button" onClick={() => onSelect?.(null)} aria-label={tx(locale, "Cerrar vista previa", "Close preview")} className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-[#ffffffe6] text-[#1F3A4D]">
            <X size={16} aria-hidden />
          </button>
        </div>
      )}
      {selected && renderPreview && sheetItems.length > 0 && (
        <div data-map-sheet role="region" aria-label={tx(locale, "Casa seleccionada", "Selected home")} className="np-in pointer-events-auto absolute inset-x-0 z-[500] px-3" style={{ bottom: previewInset }}>
          <div className="np-glass rounded-[16px] p-1.5">
            <div className="flex min-h-11 items-center justify-between gap-2 pl-3">
              <p className="text-[13px] text-muted [font-feature-settings:'lnum']" aria-live="polite">
                {sheetItems.length > 1 && selIdx >= 0 ? tx(locale, `${selIdx + 1} de ${sheetItems.length} en el mapa · desliza para ver más`, `${selIdx + 1} of ${sheetItems.length} on the map · swipe for more`) : ""}
              </p>
              <button type="button" onClick={() => onSelect?.(null)} aria-label={tx(locale, "Cerrar vista previa", "Close preview")} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink hover:bg-ink/5">
                <X size={18} aria-hidden />
              </button>
            </div>
            <div ref={strip} onScroll={onStripScroll} className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain" style={{ gap: SHEET_GAP }}>
              {sheetItems.map((l, i) => (
                <div key={l.id} className="w-full shrink-0 snap-center snap-always" aria-hidden={i !== selIdx || undefined} inert={i !== selIdx || undefined}>
                  {Math.abs(i - selIdx) <= 1 ? renderPreview(l, "sheet") : <div className="h-[120px] rounded-[16px] bg-white/60" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {onArea && moved && controls && (
        <div className="relative z-[450]">
          <UnderMapTools>
            <button type="button" onClick={searchHere} data-search-area className="np-in pointer-events-auto flex min-h-11 items-center gap-2 whitespace-nowrap rounded-[12px] bg-[#3A6A92] px-4 font-display text-sm font-semibold text-white">
              <Search size={15} aria-hidden /> {tx(locale, "Buscar en esta zona", "Search this area")}
            </button>
          </UnderMapTools>
        </div>
      )}

      {controls && (
        <div className="relative z-[450]">
          <div className="absolute right-3 top-3 z-10 flex flex-col overflow-hidden rounded-xl border shadow-[0_2px_8px_rgb(31_58_77/.12)]">
            <button type="button" aria-label={tx(locale, "Acercar", "Zoom in")} className={cn("flex h-11 w-11 items-center justify-center bg-white text-[#1F3A4D]", ctlHover)} onClick={() => zoomBy(1)}>
              <Plus size={16} aria-hidden />
            </button>
            <button type="button" aria-label={tx(locale, "Alejar", "Zoom out")} className={cn("flex h-11 w-11 items-center justify-center border-t border-[#E3E8EC] bg-white text-[#1F3A4D]", ctlHover)} onClick={() => zoomBy(-1)}>
              <Minus size={16} aria-hidden />
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
            onClosePoly={closePoly}
            onClear={onShape && shape ? () => onShape(null) : undefined}
            enabled={!!onShape}
            ctl={ctl}
            ctlHover={ctlHover}
            toolbar={toolbar}
          />
        </div>
      )}
      <span className="sr-only" aria-live="polite">
        {plural(listings.length, locale, ["casa en el mapa", "casas en el mapa"], ["home on the map", "homes on the map"])}
      </span>
    </div>
  );
}

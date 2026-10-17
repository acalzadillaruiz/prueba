"use client";

import { useEffect, useRef, useState } from "react";
import type { Listing, Locale } from "@/types/domain";
import { shortMoney, tx } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import { TILES } from "./tiles";
import { BRISA_ZONES } from "./zones";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/**
 * Brisa map (048-B): Leaflet on light tiles (see ./tiles), price pills (white, petróleo text; the active or hovered one
 * in mar profundo with white text), clusters, and no wheel zoom so the page never gets stuck on the map. Zoom with
 * the +/- buttons, a pinch, or double click. Leaflet is fetched when this component mounts (it is itself lazy-mounted).
 */
export function BrisaMap({
  listings,
  locale,
  zone,
  className,
  onReady,
}: {
  listings: Listing[];
  locale: Locale;
  zone?: string | null;
  className?: string;
  onReady?: () => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const api = useRef<{ fit: (b?: [[number, number], [number, number]]) => void } | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    let cleanup = () => {};
    (async () => {
      try {
        const L = (await import("leaflet")).default;
        await import("leaflet.markercluster");
        if (!alive || !box.current) return;
        const map = L.map(box.current, {
          scrollWheelZoom: false,
          zoomControl: false,
          attributionControl: true,
          minZoom: 5,
          maxZoom: 17,
          tap: false,
        } as L.MapOptions);
        L.control.zoom({ position: "topright", zoomInTitle: tx(locale, "Acercar", "Zoom in"), zoomOutTitle: tx(locale, "Alejar", "Zoom out") }).addTo(map);
        for (const layer of TILES.layers) L.tileLayer(layer.url, { attribution: layer.attribution, maxZoom: layer.maxZoom ?? 17, className: layer.className, detectRetina: true }).addTo(map);
        map.attributionControl.setPrefix(false);

        const cluster = (L as unknown as { markerClusterGroup: (o: object) => L.LayerGroup }).markerClusterGroup({
          showCoverageOnHover: false,
          spiderfyOnMaxZoom: true,
          maxClusterRadius: 48,
          iconCreateFunction: (c: { getChildCount: () => number }) =>
            L.divIcon({ html: `<span>${c.getChildCount()}</span>`, className: "np-pin-cluster", iconSize: [44, 44] }),
        });
        const pts: [number, number][] = [];
        for (const l of listings) {
          if (typeof l.lat !== "number" || typeof l.lng !== "number") continue;
          pts.push([l.lat, l.lng]);
          const title = tx(locale, l.title_es, l.title_en);
          const price = shortMoney(l.priceAmount, locale);
          const icon = L.divIcon({ html: `<span class="np-pin-pill">${esc(price)}</span>`, className: "np-pin", iconSize: null as unknown as L.PointExpression, iconAnchor: [0, 0] });
          const m = L.marker([l.lat, l.lng], { icon, title: `${title}, ${l.zone}`, keyboard: true, riseOnHover: true });
          m.bindPopup(
            `<a class="np-pin-card" href="/${locale}/listing/${encodeURIComponent(l.slug)}"><strong>${esc(title)}</strong><span>${esc(l.zone)}</span><em>${esc(price)}</em></a>`,
            { closeButton: false, offset: [0, -6], className: "np-pin-popup" },
          );
          m.on("popupopen", () => m.getElement()?.classList.add("is-active"));
          m.on("popupclose", () => m.getElement()?.classList.remove("is-active"));
          cluster.addLayer(m);
        }
        map.addLayer(cluster);
        const all = pts.length ? L.latLngBounds(pts) : L.latLngBounds([[10.0, -67.8], [11.2, -63.8]]);
        const fit = (b?: [[number, number], [number, number]]) => {
          const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          map.fitBounds(b ? L.latLngBounds(b) : all, { padding: [40, 40], animate: !reduce, maxZoom: 14 });
        };
        fit();
        api.current = { fit };
        onReady?.();
        cleanup = () => map.remove();
      } catch {
        if (alive) setFailed(true);
      }
    })();
    return () => {
      alive = false;
      cleanup();
      api.current = null;
    };
    // The pins are server data for this page; the map is built once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (zone === undefined) return;
    const z = BRISA_ZONES.find((x) => x.id === zone);
    api.current?.fit(z?.bounds);
  }, [zone]);

  return (
    <div className={cn("np-brisa-map relative overflow-hidden rounded-[24px] bg-[#EEF4F9]", className)}>
      <div ref={box} className="absolute inset-0" role="region" aria-label={tx(locale, "Mapa de casas con precio", "Map of homes with prices")} />
      {failed && (
        <p className="absolute inset-0 grid place-items-center p-6 text-center text-[15px] text-muted">
          {tx(locale, "No pudimos cargar el mapa. Prueba a recargar la página.", "We couldn’t load the map. Try reloading the page.")}
        </p>
      )}
    </div>
  );
}

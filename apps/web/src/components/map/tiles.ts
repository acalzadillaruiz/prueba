/**
 * Light map tiles for the Brisa map (048-B). Free options only; pick with NEXT_PUBLIC_MAP_TILES:
 *  - "esri" (default, the one tested in the 048 mock-up): Esri World Light Gray Base + Reference, no key. The water
 *    is tinted towards #CFE3F1 by a CSS filter on the base layer (.np-tiles-base in globals.css).
 *  - "carto": CARTO Voyager. Needs the production domain; on localhost it answered «API key required».
 *  - "maptiler": MapTiler Dataviz Light on the free plan, with NEXT_PUBLIC_MAPTILER_KEY restricted to the domain.
 * Attribution is always shown, as each provider requires.
 */
export type TileLayer = { url: string; attribution: string; maxZoom?: number; className?: string };

const provider = process.env.NEXT_PUBLIC_MAP_TILES ?? "esri";
const maptilerKey = process.env.NEXT_PUBLIC_MAPTILER_KEY ?? "";

const ESRI: TileLayer[] = [
  {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles © Esri — Esri, HERE, Garmin, © OpenStreetMap",
    maxZoom: 16,
    className: "np-tiles-base",
  },
  {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}",
    attribution: "",
    maxZoom: 16,
    className: "np-tiles-ref",
  },
];

const CARTO: TileLayer[] = [
  { url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", attribution: "© OpenStreetMap © CARTO", maxZoom: 19 },
];

const MAPTILER: TileLayer[] = [
  { url: `https://api.maptiler.com/maps/dataviz-light/{z}/{x}/{y}.png?key=${maptilerKey}`, attribution: "© MapTiler © OpenStreetMap", maxZoom: 19 },
];

export const TILES: { id: string; layers: TileLayer[] } =
  provider === "maptiler" && maptilerKey ? { id: "maptiler", layers: MAPTILER } : provider === "carto" ? { id: "carto", layers: CARTO } : { id: "esri", layers: ESRI };

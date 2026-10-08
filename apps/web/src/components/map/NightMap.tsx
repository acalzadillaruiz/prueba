"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Minus, Moon, Plus, Search, Sun, X } from "lucide-react";
import type { Listing, Locale } from "@/types/domain";
import type { LatLng, Shape } from "@/lib/geo";
import { compactMoney, plural, tx } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { VE_RINGS } from "./venezuela";
import { ShapeTools } from "./ShapeTools";

type Region = "caracas" | "venezuela";
type Theme = "night" | "light";

const BOUNDS: Record<Region, { latMin: number; latMax: number; lngMin: number; lngMax: number; W: number; H: number }> = {
  caracas: { latMin: 10.405, latMax: 10.545, lngMin: -66.975, lngMax: -66.79, W: 1000, H: 760 },
  venezuela: { latMin: 0.5, latMax: 12.4, lngMin: -73.5, lngMax: -59.6, W: 1000, H: 870 },
};

// "light" is the default brand map (Mediterranean: Cal/arena land, Egeo sea, sand roads, warm-grey labels);
// "night" is kept as the alternative style behind the toggle.
const PAL: Record<Theme, Record<string, string>> = {
  night: { land: "#1D1917", land2: "#29231F", water: "#1E1A18", mountain: "#27221E", contour: "#322B26", park: "#13261F", road: "#302925", hwy: "#433B35", label: "#B5AAA0", label2: "#81776F", runway: "#312A26", pin: "#8E3B22", note: "#B5AAA0" },
  light: { land: "#F3EEE5", land2: "#EAE1D1", water: "#DECFBB", mountain: "#EAE1D1", contour: "#E3D7C2", park: "#E6E5D3", road: "#E3D7C2", hwy: "#D8C8AC", label: "#8F8370", label2: "#A3977F", runway: "#E8DFCF", pin: "#8E3B22", note: "#5A514B" },
};

const L = (lat: number, lng: number) => ({ lat, lng });
const GUAIRE = [L(10.474, -66.975), L(10.482, -66.948), L(10.487, -66.925), L(10.4885, -66.905), L(10.4885, -66.888), L(10.4875, -66.872), L(10.487, -66.86), L(10.484, -66.85), L(10.481, -66.84), L(10.4815, -66.825), L(10.4835, -66.81), L(10.479, -66.79)];
const AVILA_FOOT = [L(10.516, -66.975), L(10.511, -66.95), L(10.508, -66.93), L(10.507, -66.905), L(10.5065, -66.885), L(10.507, -66.868), L(10.5085, -66.85), L(10.5115, -66.832), L(10.5145, -66.812), L(10.519, -66.79)];
const MIRANDA = [L(10.4985, -66.888), L(10.4965, -66.874), L(10.4952, -66.86), L(10.4958, -66.848), L(10.494, -66.834), L(10.4905, -66.815), L(10.4885, -66.795)];
const LIBERTADOR = [L(10.4965, -66.93), L(10.4945, -66.905), L(10.4935, -66.885), L(10.4932, -66.866), L(10.4962, -66.853)];
const PRADOS = [L(10.4845, -66.866), L(10.472, -66.872), L(10.457, -66.869), L(10.442, -66.866), L(10.426, -66.861), L(10.41, -66.856)];
const HATILLO_RD = [L(10.4805, -66.852), L(10.466, -66.848), L(10.452, -66.842), L(10.44, -66.836), L(10.4285, -66.8265), L(10.414, -66.82)];
const BARUTA_RD = [L(10.472, -66.872), L(10.462, -66.862), L(10.452, -66.858), L(10.444, -66.844)];
const EAST_RD = [L(10.486, -66.83), L(10.475, -66.818), L(10.462, -66.812), L(10.448, -66.805)];
const WEST_RD = [L(10.487, -66.93), L(10.47, -66.935), L(10.455, -66.94), L(10.44, -66.935)];

const PARKS: { name: [string, string]; pts: LatLng[] }[] = [
  { name: ["Parque del Este", "Parque del Este"], pts: [L(10.4965, -66.8395), L(10.4968, -66.829), L(10.4915, -66.8285), L(10.4912, -66.839)] },
  { name: ["Los Caobos", "Los Caobos"], pts: [L(10.5005, -66.896), L(10.5007, -66.887), L(10.4978, -66.8868), L(10.4976, -66.8958)] },
  { name: ["Golf Country Club", "Country Club golf"], pts: [L(10.5068, -66.873), L(10.5072, -66.862), L(10.5022, -66.8612), L(10.5018, -66.8725)] },
];

const LABELS: { t: string; lat: number; lng: number; big?: boolean }[] = [
  { t: "ALTAMIRA", lat: 10.4985, lng: -66.849 },
  { t: "LOS PALOS GRANDES", lat: 10.5025, lng: -66.8425 },
  { t: "LA CASTELLANA", lat: 10.5005, lng: -66.858 },
  { t: "CHACAO", lat: 10.4905, lng: -66.8545 },
  { t: "LAS MERCEDES", lat: 10.4775, lng: -66.861 },
  { t: "SABANA GRANDE", lat: 10.4925, lng: -66.877 },
  { t: "EL HATILLO", lat: 10.4235, lng: -66.826 },
  { t: "LA BOYERA", lat: 10.4475, lng: -66.832 },
  { t: "LA TRINIDAD", lat: 10.4355, lng: -66.872 },
  { t: "COUNTRY CLUB", lat: 10.5045, lng: -66.8675 },
  { t: "SAN ROMÁN", lat: 10.4675, lng: -66.8525 },
  { t: "EL CENTRO", lat: 10.5025, lng: -66.915, big: true },
  { t: "CARACAS", lat: 10.4885, lng: -66.935, big: true },
  { t: "BARUTA", lat: 10.456, lng: -66.878 },
];

const VE_CITIES = [
  { t: "Caracas", lat: 10.48, lng: -66.9 },
  { t: "Valencia", lat: 10.16, lng: -68.0 },
  { t: "Maracaibo", lat: 10.65, lng: -71.64 },
  { t: "Barquisimeto", lat: 10.07, lng: -69.32 },
  { t: "Mérida", lat: 8.59, lng: -71.15 },
  { t: "Lechería", lat: 10.19, lng: -64.69 },
  { t: "Margarita", lat: 11.03, lng: -63.9 },
  { t: "Los Roques", lat: 11.95, lng: -66.67 },
  { t: "Choroní", lat: 10.5, lng: -67.61 },
];

export interface NightMapProps {
  listings: Listing[];
  locale: Locale;
  region?: Region;
  selectedId?: string | null;
  hoverId?: string | null;
  onSelect?: (id: string | null) => void;
  shape?: Shape;
  onShape?: (s: Shape) => void;
  controls?: boolean;
  className?: string;
  /** Preview of the selected pin: a floating "card" (md and up) or a compact "sheet" row (phones, swipeable). */
  renderPreview?: (l: Listing, variant: "card" | "sheet") => ReactNode;
  /** px kept clear at the bottom of the map (a docked bar over it): the phone sheet sits above it. */
  previewInset?: number;
  /** "Buscar en esta zona": shown once the visitor pans or zooms; gets the visible bounds [south, west, north, east]. */
  onArea?: (bbox: [number, number, number, number]) => void;
  initialTheme?: Theme;
  initialScale?: number;
  focus?: LatLng;
  /** Single marker (e.g. the owner wizard address). */
  pin?: LatLng;
  /** Click on the map (pan mode) returns the lat/lng. */
  onPick?: (p: LatLng) => void;
  /**
   * Fit the first view to these points once the map knows its size, keeping them clear of the overlays (px of
   * padding per side: the tool row on top, the zoom column on the right, a docked bar at the bottom). Re-fits on
   * resize until the visitor pans or zooms.
   */
  fitPoints?: LatLng[];
  fitPadding?: { top: number; right: number; bottom: number; left: number };
  /** Highest zoom a fit may reach (one listing must not zoom to the street). */
  fitMaxScale?: number;
  /** Extra controls in the top-left tool row (e.g. the Caracas / Venezuela switch). */
  toolbar?: ReactNode;
}

/** Default room for the overlays, in px: tool row on top (+ a price label's height), zoom column on the right. */
export const FIT_PADDING = { top: 108, right: 72, bottom: 40, left: 48 };

export function NightMap({
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
  initialTheme = "light",
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
  const B = BOUNDS[region];
  const uid = useId().replace(/:/g, "");
  const P = useCallback(
    (lat: number, lng: number) => ({
      x: ((lng - B.lngMin) / (B.lngMax - B.lngMin)) * B.W,
      y: ((B.latMax - lat) / (B.latMax - B.latMin)) * B.H,
    }),
    [B],
  );
  const unP = useCallback(
    (x: number, y: number): LatLng => ({ lng: B.lngMin + (x / B.W) * (B.lngMax - B.lngMin), lat: B.latMax - (y / B.H) * (B.latMax - B.latMin) }),
    [B],
  );
  const path = (pts: LatLng[], close = false) => pts.map((p, i) => `${i ? "L" : "M"}${P(p.lat, p.lng).x.toFixed(1)} ${P(p.lat, p.lng).y.toFixed(1)}`).join(" ") + (close ? " Z" : "");

  const startScale = initialScale ?? (region === "caracas" ? 1.55 : 1);
  const f = focus ?? (region === "caracas" ? L(10.487, -66.858) : L(8.0, -66.3));
  const fp = P(f.lat, f.lng);
  const [view, setView] = useState({ s: startScale, x: B.W / 2 - fp.x * startScale, y: B.H / 2 - fp.y * startScale });
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const [mode, setMode] = useState<"pan" | "draw" | "radius">("pan");
  const [draft, setDraft] = useState<LatLng[]>([]);
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ x: number; y: number; vx: number; vy: number; moved: boolean } | null>(null);
  const pal = PAL[theme];
  // px → svg units (so pins keep a constant on-screen size)
  const [k, setK] = useState(1.4);
  const [box, setBox] = useState({ w: 0, h: 0 });
  // Once the visitor pans or zooms, the map stops fitting itself to the results.
  const touched = useRef(false);
  // Panned / zoomed since the last "Buscar en esta zona" (shows that button).
  const [moved, setMoved] = useState(false);
  // md and up: the preview floats next to the pin; phones: a bottom sheet.
  const [wide, setWide] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const on = () => setWide(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  const fitRef = useRef({ fitPoints, fitPadding, fitMaxScale });
  fitRef.current = { fitPoints, fitPadding, fitMaxScale };
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      if (r.width && r.height) {
        const kk = Math.min(B.W / r.width, B.H / r.height);
        setK(kk);
        setBox({ w: r.width, h: r.height });
        const { fitPoints: pts, fitPadding: pad, fitMaxScale: maxS } = fitRef.current;
        if (!touched.current && pts?.length) {
          // Visible part of the (sliced) viewBox, then the padded box the points must fit in — all in svg units.
          const x0 = (B.W - r.width * kk) / 2;
          const y0 = (B.H - r.height * kk) / 2;
          const availW = Math.max(40, r.width - pad.left - pad.right) * kk;
          const availH = Math.max(40, r.height - pad.top - pad.bottom) * kk;
          const ps = pts.map((p) => P(p.lat, p.lng));
          const xs = ps.map((p) => p.x);
          const ys = ps.map((p) => p.y);
          const dx = Math.max(...xs) - Math.min(...xs);
          const dy = Math.max(...ys) - Math.min(...ys);
          const s = Math.max(0.9, Math.min(maxS, dx ? availW / dx : maxS, dy ? availH / dy : maxS));
          const cx = x0 + (pad.left * kk + availW / 2);
          const cy = y0 + (pad.top * kk + availH / 2);
          const mx = (Math.max(...xs) + Math.min(...xs)) / 2;
          const my = (Math.max(...ys) + Math.min(...ys)) / 2;
          setView({ s, x: cx - mx * s, y: cy - my * s });
        }
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [B, P]);

  // Map labels keep a fixed on-screen size (CSS px) whatever the zoom or map size: the text is laid out at its
  // font size and scaled by (svg units per px) / zoom, so it stays legible on a 390 px phone instead of ~5 px.
  const labelAt = (x: number, y: number) => `translate(${x} ${y}) scale(${k / view.s})`;

  const toSvg = (e: React.PointerEvent | React.WheelEvent | React.MouseEvent) => {
    const r = svgRef.current!.getBoundingClientRect();
    // "slice": svg units per CSS px is the smaller ratio (same k as the ResizeObserver above).
    const scale = Math.min(B.W / r.width, B.H / r.height);
    const offX = (r.width * scale - B.W) / 2;
    const offY = (r.height * scale - B.H) / 2;
    return { x: (e.clientX - r.left) * scale - offX, y: (e.clientY - r.top) * scale - offY, k: scale };
  };

  const zoom = (factor: number, cx = B.W / 2, cy = B.H / 2) => {
    touched.current = true;
    setMoved(true);
    setView((v) => {
      const s = Math.max(0.9, Math.min(8, v.s * factor));
      const k = s / v.s;
      return { s, x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k };
    });
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (mode !== "pan") return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const { k } = toSvg(e);
    const dx = (e.clientX - drag.current.x) * k;
    const dy = (e.clientY - drag.current.y) * k;
    if (Math.abs(dx) + Math.abs(dy) > 4) {
      drag.current.moved = true;
      touched.current = true;
      setMoved(true);
    }
    setView((v) => ({ ...v, x: drag.current!.vx + dx, y: drag.current!.vy + dy }));
  };
  // The click event fires after pointerup: remember whether this gesture was a drag so panning never drops a pin.
  const wasDrag = useRef(false);
  const onPointerUp = () => {
    wasDrag.current = !!drag.current?.moved;
    drag.current = null;
  };
  const onClick = (e: React.MouseEvent) => {
    const { x, y } = toSvg(e);
    const ll = unP((x - view.x) / view.s, (y - view.y) / view.s);
    if (mode === "draw") setDraft((d) => [...d, ll]);
    else if (mode === "radius") {
      onShape?.({ type: "radius", center: ll, km: 1.2 });
      setMode("pan");
    } else if (!wasDrag.current && onPick) onPick(ll);
    else if (!wasDrag.current && (e.target as Element).tagName === "rect") onSelect?.(null);
    wasDrag.current = false;
  };

  const closePoly = () => {
    if (draft.length >= 3) onShape?.({ type: "poly", pts: draft });
    setDraft([]);
    setMode("pan");
  };

  // Screen-space pins with clustering. Distance-based (not grid cells): two markers whose footprints would overlap —
  // a price label is ~70 px wide and ~40 px tall above its point — always merge, so a label is never half-hidden
  // behind a neighbouring one just because the two fell into adjacent cells.
  const pins = useMemo(() => {
    const pts = listings.map((l) => {
      const p = P(l.lat, l.lng);
      return { l, x: p.x * view.s + view.x, y: p.y * view.s + view.y };
    });
    if (view.s > 5) return pts.map((p) => ({ ...p, items: [p.l] }));
    const f = region === "venezuela" ? 0.88 : 1;
    const near = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.abs(a.x - b.x) < 70 * f * k && Math.abs(a.y - b.y) < 40 * f * k;
    type G = { x: number; y: number; items: Listing[]; l: Listing };
    let groups: G[] = [];
    const solo: typeof pts = [];
    for (const p of pts) {
      if (p.l.id === selectedId) {
        solo.push(p);
        continue;
      }
      const g = groups.find((g) => near(g, p));
      if (g) {
        g.items.push(p.l);
        g.x = (g.x * (g.items.length - 1) + p.x) / g.items.length;
        g.y = (g.y * (g.items.length - 1) + p.y) / g.items.length;
      } else groups.push({ x: p.x, y: p.y, items: [p.l], l: p.l });
    }
    // Moving centroids can bring two groups together: merge until no pair overlaps (a handful of passes at most).
    for (let merged = true; merged; ) {
      merged = false;
      const next: G[] = [];
      for (const g of groups) {
        const h = next.find((h) => near(h, g));
        if (!h) next.push(g);
        else {
          const n = h.items.length + g.items.length;
          h.x = (h.x * h.items.length + g.x * g.items.length) / n;
          h.y = (h.y * h.items.length + g.y * g.items.length) / n;
          h.items.push(...g.items);
          merged = true;
        }
      }
      groups = next;
    }
    return [...groups, ...solo.map((p) => ({ ...p, items: [p.l] }))];
  }, [listings, view, P, region, k, selectedId]);

  // Screen-space boxes of pins and clusters: zone labels that collide with one are faded so "CH[3]AO" never happens.
  const blockers = useMemo(
    () =>
      pins.map((g) => {
        if (g.items.length > 1) return { x0: g.x - 22 * k, x1: g.x + 22 * k, y0: g.y - 22 * k, y1: g.y + 22 * k };
        const hw = (pinWidth(pinLabel(g.items[0], locale)) / 2) * k * 1.15;
        return { x0: g.x - hw, x1: g.x + hw, y0: g.y - 46 * k, y1: g.y + 2 * k };
      }),
    [pins, k, locale],
  );
  /** Opacity for a map label at (x, y) map units, laid out at `fs` px with the given anchor. */
  const labelOpacity = (x: number, y: number, text: string, fs: number, anchor: "middle" | "start" = "middle", spacing = 0) => {
    const sx = x * view.s + view.x;
    const sy = y * view.s + view.y;
    const w = text.length * (fs * 0.62 + spacing) * k;
    const x0 = anchor === "middle" ? sx - w / 2 : sx;
    const box = { x0, x1: x0 + w, y0: sy - fs * k, y1: sy + fs * 0.25 * k };
    return blockers.some((b) => b.x0 < box.x1 && b.x1 > box.x0 && b.y0 < box.y1 && b.y1 > box.y0) ? 0.12 : 1;
  };

  const selected = listings.find((l) => l.id === selectedId);
  // Map controls: white on the light map, navy glass on the night map.
  const ctl = theme === "light" ? "border-[#E3D7C2] bg-[#ffffff] text-[#1E1A18]" : "border-white/10 bg-navy/90 text-ivory backdrop-blur";
  const ctlHover = theme === "light" ? "hover:bg-[#F3EEE5]" : "hover:bg-white/10";
  const ctlLine = theme === "light" ? "border-[#E3D7C2]" : "border-white/10";

  // CSS px inside the map box ⇄ map coordinates (same "slice" geometry as the pins).
  const toPx = useCallback(
    (lat: number, lng: number) => {
      const p = P(lat, lng);
      return { x: (p.x * view.s + view.x) / k - (B.W / k - box.w) / 2, y: (p.y * view.s + view.y) / k - (B.H / k - box.h) / 2 };
    },
    [P, view, k, B, box],
  );
  const fromPx = (px: number, py: number) => unP((px * k + (B.W - box.w * k) / 2 - view.x) / view.s, (py * k + (B.H - box.h * k) / 2 - view.y) / view.s);
  const searchHere = () => {
    const nw = fromPx(0, 0);
    const se = fromPx(box.w, box.h);
    setMoved(false);
    onSelect?.(null);
    onArea?.([se.lat, nw.lng, nw.lat, se.lng]);
  };

  // md and up: the preview card floats by its pin, clamped to the visible map (never half off-screen). Above the pin
  // when it fits, else below it.
  const previewRef = useRef<HTMLDivElement>(null);
  const [previewH, setPreviewH] = useState(290);
  useLayoutEffect(() => {
    const h = previewRef.current?.offsetHeight;
    if (h && Math.abs(h - previewH) > 1) setPreviewH(h);
  });
  const CARD_W = 256;
  const EDGE = 8;
  const cardPos = (() => {
    if (!selected || !wide || !box.w) return null;
    const pt = toPx(selected.lat, selected.lng);
    const left = Math.max(EDGE, Math.min(box.w - CARD_W - EDGE, pt.x - CARD_W / 2));
    let top = pt.y - 46 - previewH - 6;
    if (top < EDGE) top = pt.y + 10;
    top = Math.max(EDGE, Math.min(box.h - previewInset - previewH, top));
    return { left, top };
  })();

  // Phones: a bottom sheet over the docked bar, swipeable between the homes on screen (left → right, as on the map).
  const sheetItems = useMemo(() => {
    if (!selected || wide || !box.w) return [];
    return listings
      .map((l) => ({ l, ...toPx(l.lat, l.lng) }))
      .filter((p) => p.l.id === selected.id || (p.x >= 0 && p.x <= box.w && p.y >= 0 && p.y <= box.h))
      .sort((a, b) => a.x - b.x || a.l.id.localeCompare(b.l.id))
      .slice(0, 40)
      .map((p) => p.l);
  }, [selected, wide, box, listings, toPx]);
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

  const shapeEl =
    shape?.type === "poly" ? (
      <path data-shape="poly" d={path(shape.pts, true)} fill="#8E3B221c" stroke="#8E3B22" strokeWidth={2} strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />
    ) : shape?.type === "radius" ? (
      (() => {
        const c = P(shape.center.lat, shape.center.lng);
        const rx = (shape.km / 111 / Math.cos((shape.center.lat * Math.PI) / 180) / (B.lngMax - B.lngMin)) * B.W;
        return (
          <g>
            <ellipse data-shape="radius" cx={c.x} cy={c.y} rx={rx} ry={rx} fill="#8E3B221c" stroke="#8E3B22" strokeWidth={2} vectorEffect="non-scaling-stroke" />
            <circle cx={c.x} cy={c.y} r={4 / view.s} fill="#8E3B22" />
          </g>
        );
      })()
    ) : null;

  return (
    <div className={cn("relative overflow-hidden", className)} style={{ background: pal.water }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${B.W} ${B.H}`}
        preserveAspectRatio="xMidYMid slice"
        className={cn("h-full w-full select-none", mode === "pan" ? "cursor-grab active:cursor-grabbing" : "cursor-crosshair")}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onClick={onClick}
        onDoubleClick={() => mode === "draw" && closePoly()}
        onWheel={(e) => {
          const { x, y } = toSvg(e);
          zoom(e.deltaY < 0 ? 1.15 : 1 / 1.15, x, y);
        }}
        role="application"
        aria-label={tx(locale, "Mapa de resultados", "Results map")}
      >
        <defs>
          <filter id={`${uid}-pin`} x="-50%" y="-80%" width="200%" height="260%">
            <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#1E1A18" floodOpacity="0.2" />
          </filter>
        </defs>
        <rect x={-5000} y={-5000} width={12000} height={12000} fill={pal.water} />
        <g transform={`translate(${view.x} ${view.y}) scale(${view.s})`}>
          {region === "caracas" ? (
            <>
              <rect x={0} y={0} width={B.W} height={B.H} fill={pal.land} />
              {/* southern hills */}
              {[
                [10.455, -66.93, 60],
                [10.44, -66.9, 80],
                [10.43, -66.82, 70],
                [10.46, -66.8, 55],
                [10.42, -66.87, 70],
              ].map(([la, ln, r], i) => {
                const c = P(la, ln);
                return (
                  <g key={i}>
                    {[1, 0.75, 0.5].map((k) => (
                      <ellipse key={k} cx={c.x} cy={c.y} rx={r * k * 1.5} ry={r * k} fill="none" stroke={pal.contour} strokeWidth={1} vectorEffect="non-scaling-stroke" opacity={0.6} />
                    ))}
                  </g>
                );
              })}
              {/* Ávila */}
              <path d={path([...AVILA_FOOT, L(10.545, -66.79), L(10.545, -66.975)], true)} fill={pal.mountain} />
              {[0.006, 0.012, 0.018, 0.024].map((d) => (
                <path key={d} d={path(AVILA_FOOT.map((p, i) => L(p.lat + d + Math.sin(i * 1.7 + d * 300) * 0.0015, p.lng)))} fill="none" stroke={pal.contour} strokeWidth={1} vectorEffect="non-scaling-stroke" />
              ))}
              {(() => {
                const c = P(10.531, -66.89);
                return (
                  <text transform={labelAt(c.x, c.y)} textAnchor="middle" fontSize={12} letterSpacing={2} fill={pal.label2} fontFamily="var(--font-display)">
                    PARQUE NACIONAL EL ÁVILA
                  </text>
                );
              })()}
              {/* parks */}
              {PARKS.map((p) => (
                <path key={p.name[0]} d={path(p.pts, true)} fill={pal.park} />
              ))}
              {/* La Carlota */}
              <path d={path([L(10.4868, -66.855), L(10.4872, -66.8315), L(10.4838, -66.8312), L(10.4834, -66.8548)], true)} fill={pal.runway} />
              <path d={path([L(10.4853, -66.853), L(10.4855, -66.8335)])} stroke={pal.label2} strokeDasharray="4 4" strokeWidth={1} vectorEffect="non-scaling-stroke" opacity={0.5} />
              {/* minor road grid */}
              {Array.from({ length: 22 }).map((_, i) => {
                const lat = 10.4895 + i * 0.00085;
                return <path key={`h${i}`} d={path([L(lat, -66.965 + (i % 3) * 0.004), L(lat + 0.001, -66.80)])} stroke={pal.road} strokeWidth={0.8} vectorEffect="non-scaling-stroke" />;
              })}
              {Array.from({ length: 48 }).map((_, i) => {
                const lng = -66.965 + i * 0.0034;
                return <path key={`v${i}`} d={path([L(10.489, lng), L(10.5065, lng + 0.0008)])} stroke={pal.road} strokeWidth={0.8} vectorEffect="non-scaling-stroke" />;
              })}
              {Array.from({ length: 18 }).map((_, i) => {
                const lat = 10.415 + i * 0.0036;
                return <path key={`s${i}`} d={`M0 ${P(lat, 0).y} Q ${B.W / 2} ${P(lat, 0).y - 18 + (i % 4) * 9} ${B.W} ${P(lat, 0).y + 6}`} stroke={pal.road} strokeWidth={0.7} fill="none" vectorEffect="non-scaling-stroke" opacity={0.8} />;
              })}
              {/* river */}
              <path d={path(GUAIRE)} stroke={pal.water} strokeWidth={5} fill="none" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
              {/* highways */}
              {[GUAIRE.map((p) => L(p.lat - 0.0018, p.lng)), MIRANDA, LIBERTADOR, PRADOS, HATILLO_RD, BARUTA_RD, EAST_RD, WEST_RD, AVILA_FOOT.map((p) => L(p.lat - 0.0012, p.lng))].map((r, i) => (
                <path key={i} d={path(r)} stroke={i === 0 || i === 8 ? pal.hwy : pal.road} strokeWidth={i === 0 || i === 8 ? 3 : 2.2} fill="none" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
              ))}
              {/* labels */}
              {LABELS.map((lb) => {
                const c = P(lb.lat, lb.lng);
                return (
                  <text
                    key={lb.t}
                    transform={labelAt(c.x, c.y)}
                    textAnchor="middle"
                    fill={lb.big ? pal.label2 : pal.label}
                    fontFamily="var(--font-display)"
                    fontWeight={lb.big ? 600 : 500}
                    letterSpacing={lb.big ? 3 : 0.5}
                    fontSize={lb.big ? 15 : 12}
                    opacity={labelOpacity(c.x, c.y, lb.t, lb.big ? 15 : 12, "middle", lb.big ? 3 : 0.5)}
                    style={{ transition: "opacity 180ms ease-out" }}
                  >
                    {lb.t}
                  </text>
                );
              })}
              {(() => {
                const c = P(10.4852, -66.884);
                return (
                  <text transform={labelAt(c.x, c.y)} fill={pal.label2} fontStyle="italic" fontFamily="var(--font-body)" fontSize={12}>
                    Río Guaire
                  </text>
                );
              })()}
            </>
          ) : (
            <>
              {VE_RINGS.map((r, i) => (
                <path key={i} d={path(r.map(([lat, lng]) => L(lat, lng)), true)} fill={pal.land2 && theme === "night" ? pal.land2 : pal.land} stroke={pal.hwy} strokeWidth={1.2} vectorEffect="non-scaling-stroke" />
              ))}
              {VE_CITIES.map((c) => {
                const p = P(c.lat, c.lng);
                return (
                  <g key={c.t}>
                    <circle cx={p.x} cy={p.y} r={3 / view.s} fill={pal.label} />
                    <text transform={labelAt(p.x + (5 * k) / view.s, p.y - (4 * k) / view.s)} fill={pal.label} fontFamily="var(--font-display)" fontSize={13} opacity={labelOpacity(p.x + (5 * k) / view.s, p.y - (4 * k) / view.s, c.t, 13, "start")} style={{ transition: "opacity 180ms ease-out" }}>
                      {c.t}
                    </text>
                  </g>
                );
              })}
              {(() => {
                const p = P(11.55, -65.6);
                return (
                  <text transform={labelAt(p.x, p.y)} fill={theme === "light" ? "#5A514B" : pal.label2} fontStyle="italic" fontFamily="var(--font-serif)" fontSize={20}>
                    {tx(locale, "Mar Caribe", "Caribbean Sea")}
                  </text>
                );
              })()}
            </>
          )}
          {shapeEl}
          {draft.length > 0 && (
            <path d={path(draft)} fill="#8E3B2218" stroke="#8E3B22" strokeWidth={2} vectorEffect="non-scaling-stroke" />
          )}
          {draft.map((p, i) => {
            const c = P(p.lat, p.lng);
            return <circle key={i} cx={c.x} cy={c.y} r={5 / view.s} fill="#F1EBE3" stroke="#8E3B22" strokeWidth={2 / view.s} />;
          })}
        </g>

        {/* pins (screen space) */}
        {pins.map((g) =>
          g.items.length > 1 ? (
            <g
              key={`c-${g.items[0].id}`}
              transform={`translate(${g.x} ${g.y}) scale(${k})`}
              className="group cursor-pointer focus-visible:outline-none"
              role="button"
              tabIndex={0}
              aria-label={`${plural(g.items.length, locale, ["inmueble", "inmuebles"], ["listing", "listings"])} · ${tx(locale, "acercar", "zoom in")}`}
              onClick={(e) => {
                e.stopPropagation();
                zoom(2.2, g.x, g.y);
              }}
              onKeyDown={(e) => {
                if (e.key !== "Enter" && e.key !== " ") return;
                e.preventDefault();
                zoom(2.2, g.x, g.y);
              }}
            >
              <g className="opacity-0 group-focus-visible:opacity-100">
                <circle r={26} fill="none" stroke="#F1EBE3" strokeWidth={4.5} />
                <circle r={26} fill="none" stroke="#1E1A18" strokeWidth={2} />
              </g>
              <circle r={22} fill="#1E1A18" opacity={0.14} />
              <circle r={16.5} fill="#1E1A18" stroke="#F1EBE3" strokeWidth={2} filter={`url(#${uid}-pin)`} />
              <text textAnchor="middle" dy={4.5} fontSize={13} fontWeight={600} fill="#F1EBE3" fontFamily="var(--font-display)">
                {g.items.length}
              </text>
            </g>
          ) : (
            <PricePin
              key={g.items[0].id}
              l={g.items[0]}
              x={g.x}
              y={g.y}
              active={g.items[0].id === selectedId || g.items[0].id === hoverId}
              locale={locale}
              onClick={() => onSelect?.(g.items[0].id)}
              k={k}
              shadow={`url(#${uid}-pin)`}
            />
          ),
        )}
      </svg>

      {pin && (() => {
        const p = P(pin.lat, pin.lng);
        const x = p.x * view.s + view.x;
        const y = p.y * view.s + view.y;
        return (
          <div className="pointer-events-none absolute z-10" style={{ left: x / k - (B.W / k - box.w) / 2, top: y / k - (B.H / k - box.h) / 2, transform: "translate(-50%, -100%)" }}>
            <svg viewBox="0 0 32 36" width="30" height="34" aria-hidden><path d="M16 35C14.6 35 13.8 34.2 13 33L3.2 16.4C-.6 9.8 4.2 1.5 11.8 1.5H20.2C27.8 1.5 32.6 9.8 28.8 16.4L19 33C18.2 34.2 17.4 35 16 35Z" fill="#1E1A18" stroke="#F1EBE3" strokeWidth="1.5" /><path d="M9.5 14.5 16 9.5l6.5 5" fill="none" stroke="#C9A574" strokeWidth="2.2" /></svg>
          </div>
        );
      })()}
      {selected && renderPreview && cardPos && (
        <div ref={previewRef} data-map-preview className="np-in pointer-events-auto absolute z-20 w-64" style={{ left: cardPos.left, top: cardPos.top }}>
          {renderPreview(selected, "card")}
          <button
            type="button"
            onClick={() => onSelect?.(null)}
            aria-label={tx(locale, "Cerrar vista previa", "Close preview")}
            className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-[#ffffffe6] text-[#1E1A18] shadow-sm backdrop-blur"
          >
            <X size={16} aria-hidden />
          </button>
        </div>
      )}
      {selected && renderPreview && sheetItems.length > 0 && (
        <div data-map-sheet role="region" aria-label={tx(locale, "Casa seleccionada", "Selected home")} className="np-in pointer-events-auto absolute inset-x-0 z-20 px-3" style={{ bottom: previewInset }}>
          <div className="np-glass rounded-[26px] p-1.5 shadow-np">
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
                  {/* Only the shown card and its neighbours render (photos load as you swipe). */}
                  {Math.abs(i - selIdx) <= 1 ? renderPreview(l, "sheet") : <div className="h-[120px] rounded-[20px] bg-white/60" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {onArea && moved && controls && (
        <button
          type="button"
          onClick={searchHere}
          // Phones: under the tool row (the bottom belongs to the sheet and the docked bar). Wider: bottom centre,
          // clear of the tool row that wraps on a narrow desktop map.
          style={wide ? { bottom: previewInset + 24 } : { top: 66 }}
          className="np-in absolute left-1/2 z-10 flex min-h-11 -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-[#1E1A18] px-4 font-display text-sm font-semibold text-[#F1EBE3] shadow-[0_12px_30px_-8px_rgba(30,26,24,.55)] [html.dark_&]:bg-[#F1EBE3] [html.dark_&]:text-[#1E1A18]"
        >
          <Search size={15} aria-hidden /> {tx(locale, "Buscar en esta zona", "Search this area")}
        </button>
      )}

      {controls && (
        <>
          <div className="absolute right-3 top-3 z-10 flex flex-col gap-2">
            <div className={cn("flex flex-col overflow-hidden rounded-xl border shadow-np", ctl)}>
              <button aria-label={tx(locale, "Acercar", "Zoom in")} className={cn("flex h-11 w-11 items-center justify-center", ctlHover)} onClick={() => zoom(1.4)}>
                <Plus size={16} />
              </button>
              <button aria-label={tx(locale, "Alejar", "Zoom out")} className={cn("flex h-11 w-11 items-center justify-center border-t", ctlLine, ctlHover)} onClick={() => zoom(1 / 1.4)}>
                <Minus size={16} />
              </button>
            </div>
            <button
              aria-label={theme === "light" ? tx(locale, "Mapa nocturno", "Night map") : tx(locale, "Mapa claro", "Light map")}
              aria-pressed={theme === "night"}
              className={cn("flex h-11 w-11 items-center justify-center rounded-xl border shadow-np", ctl, ctlHover)}
              onClick={() => setTheme((t) => (t === "night" ? "light" : "night"))}
            >
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
            onClosePoly={closePoly}
            onClear={onShape && shape ? () => onShape(null) : undefined}
            enabled={!!onShape}
            ctl={ctl}
            ctlHover={ctlHover}
            toolbar={toolbar}
          />
          <div className="pointer-events-none absolute bottom-2 left-3 z-10 text-xs" style={{ color: pal.note }}>
            {tx(locale, "Mapa ilustrativo · la ubicación es aproximada", "Illustrative map · locations are approximate")}
          </div>
        </>
      )}
    </div>
  );
}

const pinLabel = (l: Listing, locale: Locale) => compactMoney(l.priceAmount, locale) + (l.pricePeriod === "night" ? tx(locale, "/n", "/nt") : l.pricePeriod === "month" ? tx(locale, "/m", "/mo") : "");
const pinWidth = (label: string) => label.length * 7.8 + 22;

/**
 * Roof-shaped price pin (brand signature): white label with a small roof on top. Selected / hovered: navy label,
 * bigger terracotta roof and a rosa-cal halo. Anchored at its bottom centre.
 */
function PricePin({ l, x, y, active, locale, onClick, k, shadow }: { l: Listing; x: number; y: number; active: boolean; locale: Locale; onClick: () => void; k: number; shadow: string }) {
  const label = pinLabel(l, locale);
  const w = pinWidth(label);
  const period = l.pricePeriod === "night" ? tx(locale, " por noche", " per night") : l.pricePeriod === "month" ? tx(locale, " al mes", " per month") : "";
  const H = 25; // label height
  const top = -H - 3;
  return (
    <g
      transform={`translate(${x} ${y}) scale(${k})`}
      className="group cursor-pointer focus-visible:outline-none"
      role="button"
      tabIndex={0}
      aria-label={`${compactMoney(l.priceAmount, locale)}${period}${l.zone ? ` · ${l.zone}` : ""}`}
      aria-pressed={active}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onKeyDown={(e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        onClick();
      }}
    >
      <g className="opacity-0 group-focus-visible:opacity-100">
        <rect x={-w / 2 - 6} y={top - 18} width={w + 12} height={H + 24} rx={10} fill="none" stroke="#F1EBE3" strokeWidth={4.5} />
        <rect x={-w / 2 - 6} y={top - 18} width={w + 12} height={H + 24} rx={10} fill="none" stroke="#1E1A18" strokeWidth={2} />
      </g>
      {active ? (
        <g>
          <path d={`M-20 ${top - 5} L0 ${top - 17} L20 ${top - 5} Z`} fill="#8E3B22" />
          <rect x={-w / 2 - 4} y={top - 4} width={w + 8} height={H + 8} rx={10} fill="#EBD5C8" opacity={0.95} />
          <rect x={-w / 2} y={top} width={w} height={H} rx={7} fill="#1E1A18" filter={shadow} />
          <text textAnchor="middle" y={top + 17} fontSize={13} fontWeight={600} fontFamily="var(--font-display)" fill="#FFFFFF">
            {label}
          </text>
        </g>
      ) : (
        <g filter={shadow}>
          <path d={`M-16 ${top + 1} L0 ${top - 9} L16 ${top + 1} Z`} fill="#FFFFFF" />
          <rect x={-w / 2} y={top} width={w} height={H} rx={7} fill="#FFFFFF" />
          <text textAnchor="middle" y={top + 17} fontSize={13} fontWeight={600} fontFamily="var(--font-display)" fill="#1E1A18">
            {label}
          </text>
        </g>
      )}
    </g>
  );
}

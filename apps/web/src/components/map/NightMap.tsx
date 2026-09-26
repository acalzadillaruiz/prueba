"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Circle, Minus, Moon, PenLine, Plus, Sun, X } from "lucide-react";
import type { Listing, Locale } from "@/types/domain";
import type { LatLng, Shape } from "@/lib/geo";
import { compactMoney, tx } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { VE_RINGS } from "./venezuela";

type Region = "caracas" | "venezuela";
type Theme = "night" | "light";

const BOUNDS: Record<Region, { latMin: number; latMax: number; lngMin: number; lngMax: number; W: number; H: number }> = {
  caracas: { latMin: 10.405, latMax: 10.545, lngMin: -66.975, lngMax: -66.79, W: 1000, H: 760 },
  venezuela: { latMin: 0.5, latMax: 12.4, lngMin: -73.5, lngMax: -59.6, W: 1000, H: 870 },
};

const PAL: Record<Theme, Record<string, string>> = {
  night: { land: "#101A2C", land2: "#0F1829", water: "#0B1220", mountain: "#15233A", contour: "#1D2D48", park: "#13261F", road: "#1D2B47", hwy: "#2F4670", label: "#8AA4B5", label2: "#5E7486", runway: "#1F2C45", pin: "#F26B4D" },
  light: { land: "#EFEBE3", land2: "#E9E4DA", water: "#BCD3DF", mountain: "#D3DCCB", contour: "#C4CFBC", park: "#CFE0C6", road: "#FFFFFF", hwy: "#F6D6C6", label: "#4F6372", label2: "#8395A1", runway: "#D9D3C8", pin: "#F26B4D" },
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
  renderPreview?: (l: Listing) => ReactNode;
  initialTheme?: Theme;
  initialScale?: number;
  focus?: LatLng;
}

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
  initialTheme = "night",
  initialScale,
  focus,
}: NightMapProps) {
  const B = BOUNDS[region];
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
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      if (r.width) setK(Math.min(B.W / r.width, B.H / r.height));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [B]);

  const toSvg = (e: React.PointerEvent | React.WheelEvent | React.MouseEvent) => {
    const r = svgRef.current!.getBoundingClientRect();
    const scale = Math.max(B.W / r.width, B.H / r.height);
    const offX = (r.width * scale - B.W) / 2;
    const offY = (r.height * scale - B.H) / 2;
    return { x: (e.clientX - r.left) * scale - offX, y: (e.clientY - r.top) * scale - offY, k: scale };
  };

  const zoom = (factor: number, cx = B.W / 2, cy = B.H / 2) =>
    setView((v) => {
      const s = Math.max(0.9, Math.min(8, v.s * factor));
      const k = s / v.s;
      return { s, x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k };
    });

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
    if (Math.abs(dx) + Math.abs(dy) > 4) drag.current.moved = true;
    setView((v) => ({ ...v, x: drag.current!.vx + dx, y: drag.current!.vy + dy }));
  };
  const onPointerUp = () => {
    drag.current = null;
  };
  const onClick = (e: React.MouseEvent) => {
    const { x, y } = toSvg(e);
    const ll = unP((x - view.x) / view.s, (y - view.y) / view.s);
    if (mode === "draw") setDraft((d) => [...d, ll]);
    else if (mode === "radius") {
      onShape?.({ type: "radius", center: ll, km: 1.2 });
      setMode("pan");
    } else if (!drag.current?.moved && (e.target as Element).tagName === "rect") onSelect?.(null);
  };

  const closePoly = () => {
    if (draft.length >= 3) onShape?.({ type: "poly", pts: draft });
    setDraft([]);
    setMode("pan");
  };

  // screen-space pins with clustering
  const pins = useMemo(() => {
    const pts = listings.map((l) => {
      const p = P(l.lat, l.lng);
      return { l, x: p.x * view.s + view.x, y: p.y * view.s + view.y };
    });
    const cell = view.s > 5 ? 0 : (region === "venezuela" ? 44 : 50) * k;
    if (!cell) return pts.map((p) => ({ ...p, items: [p.l] }));
    const groups = new Map<string, { x: number; y: number; items: Listing[]; l: Listing }>();
    const solo: typeof pts = [];
    for (const p of pts) {
      if (p.l.id === selectedId) {
        solo.push(p);
        continue;
      }
      const key = `${Math.round(p.x / cell)}:${Math.round(p.y / cell)}`;
      const g = groups.get(key);
      if (g) {
        g.items.push(p.l);
        g.x = (g.x * (g.items.length - 1) + p.x) / g.items.length;
        g.y = (g.y * (g.items.length - 1) + p.y) / g.items.length;
      } else groups.set(key, { x: p.x, y: p.y, items: [p.l], l: p.l });
    }
    return [...groups.values(), ...solo.map((p) => ({ ...p, items: [p.l] }))];
  }, [listings, view, P, region, k, selectedId]);

  const selected = listings.find((l) => l.id === selectedId);
  const selPt = selected ? { x: P(selected.lat, selected.lng).x * view.s + view.x, y: P(selected.lat, selected.lng).y * view.s + view.y } : null;

  const shapeEl =
    shape?.type === "poly" ? (
      <path d={path(shape.pts, true)} fill="#F26B4D22" stroke="#F26B4D" strokeWidth={2} strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />
    ) : shape?.type === "radius" ? (
      (() => {
        const c = P(shape.center.lat, shape.center.lng);
        const rx = (shape.km / 111 / Math.cos((shape.center.lat * Math.PI) / 180) / (B.lngMax - B.lngMin)) * B.W;
        return (
          <g>
            <ellipse cx={c.x} cy={c.y} rx={rx} ry={rx} fill="#F26B4D1f" stroke="#F26B4D" strokeWidth={2} vectorEffect="non-scaling-stroke" />
            <circle cx={c.x} cy={c.y} r={4 / view.s} fill="#F26B4D" />
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
                  <text x={c.x} y={c.y} textAnchor="middle" fontSize={11} letterSpacing={3} fill={pal.label2} fontFamily="var(--font-display)" style={{ fontSize: 11 / Math.sqrt(view.s) * 1.2 }}>
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
                    x={c.x}
                    y={c.y}
                    textAnchor="middle"
                    fill={lb.big ? pal.label2 : pal.label}
                    fontFamily="var(--font-display)"
                    fontWeight={lb.big ? 600 : 500}
                    letterSpacing={lb.big ? 4 : 1.2}
                    style={{ fontSize: (lb.big ? 16 : 8.5) / view.s + (lb.big ? 0 : 1.2) }}
                  >
                    {lb.t}
                  </text>
                );
              })}
              {(() => {
                const c = P(10.4852, -66.884);
                return (
                  <text x={c.x} y={c.y} fill={pal.label2} fontStyle="italic" fontFamily="var(--font-body)" style={{ fontSize: 8 / view.s + 1 }}>
                    Río Guaire
                  </text>
                );
              })()}
            </>
          ) : (
            <>
              {VE_RINGS.map((r, i) => (
                <path key={i} d={path(r.map(([lat, lng]) => L(lat, lng)), true)} fill={theme === "night" ? "#17243D" : pal.land} stroke={pal.hwy} strokeWidth={1.2} vectorEffect="non-scaling-stroke" />
              ))}
              {VE_CITIES.map((c) => {
                const p = P(c.lat, c.lng);
                return (
                  <g key={c.t}>
                    <circle cx={p.x} cy={p.y} r={3 / view.s} fill={pal.label} />
                    <text x={p.x + 7 / view.s} y={p.y - 6 / view.s} fill={pal.label} fontFamily="var(--font-display)" style={{ fontSize: 13 / view.s }}>
                      {c.t}
                    </text>
                  </g>
                );
              })}
              {(() => {
                const p = P(12.1, -61.5);
                return (
                  <text x={p.x} y={p.y} fill={pal.label2} letterSpacing={3} fontFamily="var(--font-display)" style={{ fontSize: 14 / view.s }}>
                    MAR CARIBE
                  </text>
                );
              })()}
            </>
          )}
          {shapeEl}
          {draft.length > 0 && (
            <path d={path(draft)} fill="#F26B4D18" stroke="#F26B4D" strokeWidth={2} vectorEffect="non-scaling-stroke" />
          )}
          {draft.map((p, i) => {
            const c = P(p.lat, p.lng);
            return <circle key={i} cx={c.x} cy={c.y} r={5 / view.s} fill="#F7F4EF" stroke="#F26B4D" strokeWidth={2 / view.s} />;
          })}
        </g>

        {/* pins (screen space) */}
        {pins.map((g) =>
          g.items.length > 1 ? (
            <g
              key={`c-${g.items[0].id}`}
              transform={`translate(${g.x} ${g.y}) scale(${k})`}
              className="cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                zoom(2.2, g.x, g.y);
              }}
            >
              <circle r={22} fill="#F26B4D" opacity={0.18} />
              <circle r={15} fill="#F26B4D" stroke="#0B1220" strokeWidth={2} />
              <text textAnchor="middle" dy={4.5} fontSize={12.5} fontWeight={700} fill="#fff" fontFamily="var(--font-display)">
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
            />
          ),
        )}
      </svg>

      {selected && selPt && renderPreview && (
        <div
          className="np-in pointer-events-auto absolute z-20 w-64 -translate-x-1/2"
          style={{
            left: `clamp(140px, ${(selPt.x / B.W) * 100}%, calc(100% - 140px))`,
            top: `clamp(10px, calc(${(selPt.y / B.H) * 100}% - 300px), calc(100% - 300px))`,
          }}
        >
          {renderPreview(selected)}
        </div>
      )}

      {controls && (
        <>
          <div className="absolute right-3 top-3 z-10 flex flex-col gap-2">
            <div className="flex flex-col overflow-hidden rounded-xl border border-white/10 bg-navy/90 text-ivory shadow-np backdrop-blur">
              <button aria-label="Zoom in" className="p-2.5 hover:bg-white/10" onClick={() => zoom(1.4)}>
                <Plus size={16} />
              </button>
              <button aria-label="Zoom out" className="border-t border-white/10 p-2.5 hover:bg-white/10" onClick={() => zoom(1 / 1.4)}>
                <Minus size={16} />
              </button>
            </div>
            <button
              aria-label={tx(locale, "Cambiar estilo de mapa", "Toggle map style")}
              className="rounded-xl border border-white/10 bg-navy/90 p-2.5 text-ivory shadow-np backdrop-blur hover:bg-white/10"
              onClick={() => setTheme((t) => (t === "night" ? "light" : "night"))}
            >
              {theme === "night" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
          {onShape && (
            <div className="absolute left-3 top-3 z-10 flex flex-wrap gap-2">
              <button
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-display text-sm shadow-np backdrop-blur transition-colors duration-np",
                  mode === "draw" ? "border-coral bg-coral text-white" : "border-white/10 bg-navy/90 text-ivory hover:bg-navy",
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  setDraft([]);
                  setMode(mode === "draw" ? "pan" : "draw");
                }}
              >
                <PenLine size={14} /> {mode === "draw" ? tx(locale, "Toca para dibujar…", "Tap to draw…") : tx(locale, "Dibujar zona", "Draw area")}
              </button>
              <button
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-display text-sm shadow-np backdrop-blur",
                  mode === "radius" ? "border-coral bg-coral text-white" : "border-white/10 bg-navy/90 text-ivory hover:bg-navy",
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  setMode(mode === "radius" ? "pan" : "radius");
                }}
              >
                <Circle size={14} /> {tx(locale, "Radio 1,2 km", "1.2 km radius")}
              </button>
              {mode === "draw" && draft.length >= 3 && (
                <button className="rounded-full bg-ivory px-3 py-1.5 font-display text-sm text-navy shadow-np" onClick={(e) => { e.stopPropagation(); closePoly(); }}>
                  {tx(locale, "Cerrar zona", "Close area")} ({draft.length})
                </button>
              )}
              {shape && (
                <button
                  className="flex items-center gap-1 rounded-full bg-ivory px-3 py-1.5 font-display text-sm text-navy shadow-np"
                  onClick={(e) => {
                    e.stopPropagation();
                    onShape(null);
                  }}
                >
                  <X size={14} /> {tx(locale, "Quitar zona", "Clear area")}
                </button>
              )}
            </div>
          )}
          <div className="pointer-events-none absolute bottom-2 left-3 z-10 text-[10px] text-mist/70">
            {tx(locale, "Mapa ilustrativo · Google Maps en producción", "Illustrative map · Google Maps in production")}
          </div>
        </>
      )}
    </div>
  );
}

function PricePin({ l, x, y, active, locale, onClick, k }: { l: Listing; x: number; y: number; active: boolean; locale: Locale; onClick: () => void; k: number }) {
  const label = compactMoney(l.priceAmount, locale) + (l.pricePeriod === "night" ? tx(locale, "/n", "/nt") : l.pricePeriod === "month" ? tx(locale, "/m", "/mo") : "");
  const w = label.length * 7.4 + 18;
  const gold = l.luxury;
  return (
    <g
      transform={`translate(${x} ${y}) scale(${k})`}
      className="cursor-pointer"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      style={{ transition: "transform 180ms ease-out" }}
    >
      <g transform={active ? "scale(1.15)" : undefined}>
        <path d={`M0 0 L-6 -9 L6 -9 Z`} fill={active ? "#F7F4EF" : gold ? "#D4AF77" : "#F26B4D"} />
        <rect x={-w / 2} y={-33} width={w} height={25} rx={12.5} fill={active ? "#F7F4EF" : gold ? "#D4AF77" : "#F26B4D"} stroke="#0B1220" strokeWidth={1.5} />
        <text textAnchor="middle" y={-16} fontSize={12.5} fontWeight={700} fontFamily="var(--font-display)" fill={active || gold ? "#0B1220" : "#fff"}>
          {label}
        </text>
      </g>
    </g>
  );
}

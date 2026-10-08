"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

/**
 * Single-series charts for the light cockpit (brand v4): navy-tint bars with the latest/current one in solid navy,
 * muted axis, recessive grid, hover tooltip. No terracotta in data.
 * The SVG is drawn at the box's real pixel size (measured), so axis text is a true 12 px on a phone instead of a
 * 600-unit viewBox scaled down to ~6 px; x labels thin out (every 2nd, 3rd…) when the bars get narrow.
 * `fill` grows the plot to fill a flex-column parent (a card stretched by its grid row) instead of leaving a gap under it.
 */
export function BarChart({ data, height = 180, format = (v: number) => String(v), highlight = "last", fill = false }: { data: { label: string; value: number; hint?: string }[]; height?: number; format?: (v: number) => string; highlight?: "last" | "none"; fill?: boolean }) {
  const [hover, setHover] = useState<number | null>(null);
  const box = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => {
      const w = Math.round(el.clientWidth);
      const h = Math.round(el.clientHeight);
      setSize((cur) => (cur && cur.w === w && cur.h === h ? cur : { w, h }));
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const max = Math.max(...data.map((d) => d.value), 1);
  const W = size?.w || 600;
  const H = Math.max(height, size?.h || height);
  const FONT = 12;
  const pad = { l: 30, r: 6, t: 12, b: 26 };
  const bw = (W - pad.l - pad.r) / Math.max(1, data.length);
  // Room for one x label ≈ 44 px ("12 sep"): show every n-th, counted back from the latest so it is always labelled.
  const step = Math.max(1, Math.ceil(data.length / Math.max(1, Math.floor((W - pad.l - pad.r) / 44))));
  // Deduplicated: with a max of 1 the mid tick rounds to 1 too (duplicate React keys, overlapping labels).
  const ticks = [...new Set([0, 0.5, 1].map((f) => Math.round(max * f)))];
  const current = highlight === "last" ? data.length - 1 : -1;
  return (
    <div ref={box} className={cn("relative", fill && "flex-1")} style={{ minHeight: height }} role="img" aria-label={data.map((d) => `${d.label}: ${format(d.value)}`).join(", ")}>
      {size && (
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 block" aria-hidden>
          {ticks.map((t) => {
            const y = H - pad.b - (t / max) * (H - pad.t - pad.b);
            return (
              <g key={t}>
                <line x1={pad.l} x2={W - pad.r} y1={y} y2={y} className={t === 0 ? "stroke-[#D8CBB7] dark:stroke-white/20" : "stroke-[#EFEAE0] dark:stroke-white/[.07]"} strokeWidth={1} />
                <text x={pad.l - 6} y={y + 4} textAnchor="end" fontSize={FONT} className="fill-muted dark:fill-mist">{t}</text>
              </g>
            );
          })}
          {data.map((d, i) => {
            const h = (d.value / max) * (H - pad.t - pad.b);
            const x = pad.l + i * bw + bw * 0.14;
            const w = bw * 0.72;
            const y = H - pad.b - h;
            const r = Math.min(4, w / 2);
            return (
              <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                <rect x={pad.l + i * bw} y={pad.t} width={bw} height={H - pad.t - pad.b} fill="transparent" />
                {d.value > 0 && (
                  <path
                    d={`M${x} ${H - pad.b} V${Math.min(y + r, H - pad.b)} q0 -${r} ${r} -${r} h${w - 2 * r} q${r} 0 ${r} ${r} V${H - pad.b} Z`}
                    className={cn(i === current ? "fill-navy dark:fill-ivory" : "fill-[#81776F] dark:fill-[#605751]", "transition-opacity duration-np")}
                    opacity={hover === null || hover === i ? 1 : 0.55}
                  />
                )}
                {(data.length - 1 - i) % step === 0 && (
                  <text x={x + w / 2} y={H - 7} textAnchor="middle" fontSize={FONT} className="fill-muted dark:fill-mist">{d.label}</text>
                )}
              </g>
            );
          })}
        </svg>
      )}
      {hover !== null && (
        <div className="pointer-events-none absolute -top-2 rounded-lg bg-navy px-2.5 py-1.5 text-xs text-ivory shadow-np dark:bg-ivory dark:text-navy" style={{ left: `${((pad.l + hover * bw + bw / 2) / W) * 100}%`, transform: "translate(-50%,-100%)" }}>
          <div className="opacity-75">{data[hover].hint ?? data[hover].label}</div>
          <div className="font-display text-sm font-semibold">{format(data[hover].value)}</div>
        </div>
      )}
    </div>
  );
}

export function Funnel({ steps }: { steps: { label: string; value: number }[] }) {
  const max = steps[0]?.value || 1;
  return (
    <div className="space-y-3">
      {steps.map((s, i) => (
        <div key={s.label} className="grid grid-cols-[96px_1fr_64px] items-center gap-3 text-sm">
          <span className="text-muted dark:text-mist">{s.label}</span>
          <div className="h-6 rounded-md bg-[#F1ECE3] dark:bg-white/[.06]">
            <div className={cn("h-full rounded-md", i === steps.length - 1 ? "bg-navy dark:bg-ivory" : "bg-[#81776F] dark:bg-[#605751]")} style={{ width: `${max > 0 ? (s.value / max) * 100 : 0}%` }} />
          </div>
          <span className="text-right font-display font-semibold [font-feature-settings:'lnum','pnum']">
            {s.value}
            {i > 0 && steps[i - 1].value > 0 && <span className="ml-1 text-xs font-normal text-muted dark:text-mist">{Math.round((s.value / steps[i - 1].value) * 100)}%</span>}
          </span>
        </div>
      ))}
    </div>
  );
}

export function Spark({ values, className }: { values: number[]; className?: string }) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * 100},${28 - ((v - min) / (max - min || 1)) * 24}`).join(" ");
  return (
    <svg viewBox="0 0 100 30" className={className} preserveAspectRatio="none" aria-hidden>
      <polyline points={pts} fill="none" className="stroke-navy dark:stroke-ivory" strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}

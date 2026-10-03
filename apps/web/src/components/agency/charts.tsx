"use client";

import { useState } from "react";

/** Single-series charts for the dark cockpit. One hue (coral), recessive grid, hover tooltip. */
export function BarChart({ data, height = 180, format = (v: number) => String(v) }: { data: { label: string; value: number; hint?: string }[]; height?: number; format?: (v: number) => string }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...data.map((d) => d.value), 1);
  const W = 600;
  const H = height;
  const pad = { l: 28, r: 6, t: 12, b: 22 };
  const bw = (W - pad.l - pad.r) / data.length;
  // Deduplicated: with a max of 1 the mid tick rounds to 1 too (duplicate React keys, overlapping labels).
  const ticks = [...new Set([0, 0.5, 1].map((f) => Math.round(max * f)))];
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={data.map((d) => `${d.label}: ${format(d.value)}`).join(", ")}>
        {ticks.map((t) => {
          const y = H - pad.b - (t / max) * (H - pad.t - pad.b);
          return (
            <g key={t}>
              <line x1={pad.l} x2={W - pad.r} y1={y} y2={y} stroke="#2A3E55" strokeWidth={1} />
              <text x={pad.l - 6} y={y + 3.5} textAnchor="end" fontSize={10} fill="#A9B4C2">{t}</text>
            </g>
          );
        })}
        {data.map((d, i) => {
          const h = (d.value / max) * (H - pad.t - pad.b);
          const x = pad.l + i * bw + bw * 0.18;
          const w = bw * 0.64;
          const y = H - pad.b - h;
          return (
            <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={pad.l + i * bw} y={pad.t} width={bw} height={H - pad.t - pad.b} fill="transparent" />
              {d.value > 0 && <path d={`M${x} ${H - pad.b} V${Math.min(y + 4, H - pad.b)} q0 -4 4 -4 h${w - 8} q4 0 4 4 V${H - pad.b} Z`} fill="#A8452A" opacity={hover === null || hover === i ? 1 : 0.45} />}
              {(i % Math.ceil(data.length / 8) === 0 || i === data.length - 1) && (
                <text x={x + w / 2} y={H - 6} textAnchor="middle" fontSize={10} fill="#A9B4C2">{d.label}</text>
              )}
            </g>
          );
        })}
      </svg>
      {hover !== null && (
        <div className="pointer-events-none absolute -top-2 rounded-lg border border-navy-line bg-navy px-2.5 py-1.5 text-xs shadow-np" style={{ left: `${((pad.l + hover * bw + bw / 2) / W) * 100}%`, transform: "translate(-50%,-100%)" }}>
          <div className="text-mist">{data[hover].hint ?? data[hover].label}</div>
          <div className="font-display text-sm font-semibold text-ivory">{format(data[hover].value)}</div>
        </div>
      )}
    </div>
  );
}

export function Funnel({ steps }: { steps: { label: string; value: number }[] }) {
  const max = steps[0]?.value || 1;
  return (
    <div className="space-y-2.5">
      {steps.map((s, i) => (
        <div key={s.label} className="grid grid-cols-[110px_1fr_70px] items-center gap-3 text-sm">
          <span className="text-ivory/80">{s.label}</span>
          <div className="h-6 rounded bg-white/5">
            <div className="h-full rounded bg-coral" style={{ width: `${max > 0 ? (s.value / max) * 100 : 0}%`, opacity: 1 - i * 0.12 }} />
          </div>
          <span className="text-right font-display font-semibold">
            {s.value}
            {i > 0 && steps[i - 1].value > 0 && <span className="ml-1 text-xs font-normal text-mist">{Math.round((s.value / steps[i - 1].value) * 100)}%</span>}
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
      <polyline points={pts} fill="none" stroke="#A8452A" strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}

"use client";

import { useEffect, useRef } from "react";
import { scrubSection, span, useReducedMotion } from "./motion";

/** Stylised Atlantic: the three diaspora cities fly in to Lechería along drawn arcs while the steps light up. */
const CITIES = [
  { name: "Madrid", x: 900, y: 120, d: "M900 120 C 760 40, 470 80, 330 330" },
  { name: "Miami", x: 150, y: 110, d: "M150 110 C 210 170, 260 250, 330 330" },
  { name: "Panamá", x: 70, y: 380, d: "M70 380 C 150 300, 240 300, 330 330" },
];
const LECHERIA = { x: 330, y: 330 };

export function RemoteRoute({ eyebrow, title, subtitle, steps, children }: { eyebrow: string; title: string; subtitle?: string; steps: [string, string][]; children?: React.ReactNode }) {
  const reduced = useReducedMotion();
  const root = useRef<HTMLElement>(null);
  const paths = useRef<(SVGPathElement | null)[]>([]);
  const plane = useRef<SVGGElement>(null);
  const items = useRef<(HTMLLIElement | null)[]>([]);
  const home = useRef<SVGGElement>(null);

  useEffect(() => {
    if (reduced || !root.current) return;
    const lens = paths.current.map((p) => p?.getTotalLength() ?? 0);
    paths.current.forEach((p, i) => {
      if (!p) return;
      p.style.strokeDasharray = `${lens[i]}`;
    });
    const wide = window.matchMedia("(min-width: 1024px)").matches;
    return scrubSection(root.current, (p) => {
      paths.current.forEach((path, i) => {
        if (!path) return;
        const k = span(p, 0.05 + i * 0.08, 0.55 + i * 0.08);
        path.style.strokeDashoffset = String(lens[i] * (1 - k));
        // The plane rides the Madrid arc.
        if (i === 0 && plane.current) {
          const pt = path.getPointAtLength(lens[0] * k);
          const ahead = path.getPointAtLength(Math.min(lens[0], lens[0] * k + 2));
          const deg = (Math.atan2(ahead.y - pt.y, ahead.x - pt.x) * 180) / Math.PI;
          plane.current.setAttribute("transform", `translate(${pt.x} ${pt.y}) rotate(${deg})`);
          plane.current.style.opacity = String(k > 0 && k < 1 ? 1 : 0);
        }
      });
      if (home.current) {
        const k = span(p, 0.62, 0.72);
        home.current.style.opacity = String(0.35 + 0.65 * k);
        home.current.style.transform = `scale(${0.8 + 0.2 * k})`;
      }
      items.current.forEach((li, i) => {
        if (!li) return;
        const on = p >= 0.12 + i * 0.16;
        li.dataset.on = on ? "1" : "0";
      });
    }, wide ? undefined : { start: "top 75%", end: "bottom 85%" });
  }, [reduced]);

  return (
    <section ref={root} id="compra-a-distancia" className={reduced ? "scroll-mt-24 bg-ivory" : "relative scroll-mt-24 bg-ivory lg:h-[240vh]"}>
      <div className={reduced ? "" : "lg:sticky lg:top-0 lg:flex lg:h-[100svh] lg:items-center lg:overflow-hidden"}>
        <div className="mx-auto grid w-full max-w-[1320px] items-center gap-6 px-4 py-14 md:gap-10 md:px-8 md:py-16 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <div className="relative overflow-hidden rounded-[4px] bg-[#ECE5DA]">
            <svg viewBox="0 0 1000 460" className="block h-auto w-full" role="img" aria-label="Madrid, Miami, Panamá → Lechería">
              <defs>
                <pattern id="np-dots" width="14" height="14" patternUnits="userSpaceOnUse">
                  <circle cx="2" cy="2" r="1.3" fill="#1C1D1D" opacity=".12" />
                </pattern>
              </defs>
              <rect width="1000" height="460" fill="url(#np-dots)" />
              {/* Coastlines, abstracted: the Caribbean arc and the Iberian edge */}
              <path d="M0 300 C 120 260, 220 360, 330 350 S 520 330, 600 380 L 600 460 L 0 460 Z" fill="#C9B49C" opacity=".45" />
              <path d="M860 60 C 900 90, 940 80, 1000 100 L 1000 0 L 840 0 Z" fill="#C9B49C" opacity=".45" />
              {CITIES.map((c, i) => (
                <g key={c.name}>
                  <path d={c.d} fill="none" stroke="#1C1D1D" strokeOpacity=".14" strokeWidth="2" strokeDasharray="4 7" />
                  <path ref={(el) => void (paths.current[i] = el)} d={c.d} fill="none" stroke={i === 0 ? "#1F4E5A" : "#1C1D1D"} strokeWidth={i === 0 ? 3 : 2} strokeLinecap="round" />
                  <circle cx={c.x} cy={c.y} r="6" fill="#1C1D1D" />
                  <text x={c.x + (c.x > 500 ? -14 : 14)} y={c.y - 12} textAnchor={c.x > 500 ? "end" : "start"} fontFamily="var(--font-display)" fontSize="20" fontWeight="600" fill="#1C1D1D">
                    {c.name}
                  </text>
                </g>
              ))}
              <g ref={plane} style={{ opacity: 0 }}>
                <path d="M-14 -5 L 12 0 L -14 5 L -9 0 Z" fill="#1F4E5A" />
              </g>
              <g ref={home} style={{ transformOrigin: `${LECHERIA.x}px ${LECHERIA.y}px`, transformBox: "view-box" }}>
                <circle cx={LECHERIA.x} cy={LECHERIA.y} r="26" fill="#1F4E5A" opacity=".16" />
                <path d={`M${LECHERIA.x - 18} ${LECHERIA.y + 6} L${LECHERIA.x} ${LECHERIA.y - 8} L${LECHERIA.x + 18} ${LECHERIA.y + 6}`} fill="none" stroke="#1C1D1D" strokeWidth="3.5" />
                <path d={`M${LECHERIA.x - 9} ${LECHERIA.y + 7} L${LECHERIA.x} ${LECHERIA.y} L${LECHERIA.x + 9} ${LECHERIA.y + 7}`} fill="none" stroke="#1F4E5A" strokeWidth="3" />
                <text x={LECHERIA.x + 34} y={LECHERIA.y + 8} fontFamily="var(--font-serif)" fontSize="34" fontStyle="italic" fill="#1C1D1D">
                  Lechería
                </text>
              </g>
            </svg>
          </div>
          <div>
            <p className="np-eyebrow text-gold-text">{eyebrow}</p>
            <h2 className="mt-2 max-w-[560px] text-[30px] md:mt-3 md:text-[44px]">{title}</h2>
            {subtitle && <p className="mt-3 max-w-[480px] text-[16px] font-light text-muted md:text-[17px]">{subtitle}</p>}
            <ol className="np-steps mt-5 md:mt-8">
              {steps.map(([t, b], i) => (
                <li key={t} ref={(el) => void (items.current[i] = el)} data-on={reduced ? "1" : "0"} className="flex items-baseline gap-5 border-b border-line py-2.5 md:items-start md:gap-6 md:py-4">
                  <span className="np-step-n w-6 shrink-0 font-serif text-[22px] leading-none md:text-[28px]">{i + 1}</span>
                  <span>
                    <span className="block text-[15px] font-semibold text-ink">{t}</span>
                    {/* One short line each, phones included (035: at most two lines per block). */}
                    <span className="block text-sm text-muted">{b}</span>
                  </span>
                </li>
              ))}
            </ol>
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}

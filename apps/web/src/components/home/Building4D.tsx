"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Pause, Play, RotateCw, Sun } from "lucide-react";
import type { Locale } from "@/types/domain";
import { tx } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import s from "./Building4D.module.css";

/**
 * "La Maqueta Viva" (entries 016-C, 018 §d, 021, 022 §4): a white architectural scale model on a brushed-titanium
 * turntable, in real CSS 3D (no Three.js, ~0 KB of extra libraries, the same light build on phones and desktops).
 *
 *  - Plays by itself once 35 % of it is on screen: one turn every 40 s, and every 10 s a cycle in which the floors
 *    separate, the roof lifts, the hotspot lines draw and the light sweeps from 07:00 to 19:00.
 *  - Drag sideways (mouse or finger) to turn it, with inertia; vertical swipes still scroll the page (touch-action:
 *    pan-y). Arrow keys turn it when focused.
 *  - Hour slider 07:00–19:00: starts at the real time in Venezuela (UTC-4); faces light up toward the sun, the shadow
 *    swings across the platform and from 18:00 the windows switch on.
 *  - Floor selector: pulls a floor out like a drawer and shows its plan on the slab.
 *  - Pause / play (aria-pressed). Under prefers-reduced-motion: one still frame and a "Reproducir" button.
 *  - Pauses off screen and while the tab is hidden; 30 fps cap on touch devices. Never pins or hijacks the scroll.
 *
 * Hotspots come from a real listing's data (planta eléctrica, tanque, vista…) and each one opens the search filtered
 * by that service.
 */

export type Hotspot = { label: string; value?: string; href: string };

const FLOORS = 6;
const FH = 34; // floor height (px, model space)
const SLAB = 6;
const VOL = [
  { x: -56, z: -12, w: 112, d: 124 },
  { x: 62, z: 20, w: 116, d: 116 },
];
const PICKS = [0, 2, 5]; // P1, P3, P6
const CYCLE = 10_000;
const TURN = 40_000;
const TILT = -24; // camera elevation (deg)

/** Real hour in Venezuela (UTC-4, no DST), as a decimal, clamped to the slider's 07:00–19:00. */
function caracasHour(now = new Date()) {
  const h = (now.getUTCHours() + 24 - 4) % 24 + now.getUTCMinutes() / 60;
  return Math.min(19, Math.max(7, h));
}
const hhmm = (h: number) => {
  const m = Math.round((h % 1) * 60);
  const hh = Math.floor(h) + (m === 60 ? 1 : 0);
  return `${String(hh).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};
const smooth = (t: number) => t * t * (3 - 2 * t);
/** Explode amount (0–1) through one 10 s cycle: rest, open, hold, close. */
function explodeAt(p: number) {
  if (p < 0.15) return 0;
  if (p < 0.35) return smooth((p - 0.15) / 0.2);
  if (p < 0.7) return 1;
  if (p < 0.9) return 1 - smooth((p - 0.7) / 0.2);
  return 0;
}

type Face = "front" | "back" | "left" | "right" | "top";
/** One axis-aligned box: faces placed with CSS transforms (y up in model space → CSS y down). */
function Box({ w, h, d, kind, faces = ["front", "back", "left", "right", "top"], plan }: { w: number; h: number; d: number; kind: "slab" | "glass" | "roof" | "core"; faces?: Face[]; plan?: boolean }) {
  const t: Record<Face, [number, number, string]> = {
    front: [w, h, `translateZ(${d / 2}px)`],
    back: [w, h, `rotateY(180deg) translateZ(${d / 2}px)`],
    right: [d, h, `rotateY(90deg) translateZ(${w / 2}px)`],
    left: [d, h, `rotateY(-90deg) translateZ(${w / 2}px)`],
    top: [w, d, `rotateX(90deg) translateZ(${h / 2}px)`],
  };
  return (
    <>
      {faces.map((f) => {
        const [fw, fh, tr] = t[f];
        return (
          <i
            key={f}
            className={cn(s.face, s[kind], s[`f_${f}`], plan && f === "top" && s.plan)}
            style={{ width: fw, height: fh, marginLeft: -fw / 2, marginTop: -fh / 2, transform: tr }}
          />
        );
      })}
    </>
  );
}

export function Building4D({
  locale,
  caption,
  hotspots,
  className,
}: {
  locale: Locale;
  /** "Recorrido 4D · {title}, {zone}" with the listing it comes from. */
  caption?: { label: string; href: string };
  hotspots: Hotspot[];
  className?: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [reduced, setReduced] = useState(false);
  const [paused, setPaused] = useState(false);
  const [hour, setHour] = useState(17.67); // server render: a calm late-afternoon frame
  const [hourTouched, setHourTouched] = useState(false);
  const [floor, setFloor] = useState<number | null>(null);
  const [live, setLive] = useState(false); // in view + tab visible
  const st = useRef({ ry: -32, vel: 0, drag: false, lastX: 0, lastT: 0, holdUntil: 0, t0: 0, elapsed: 0, hour: 17.67, ex: 0.25, draw: 1 });
  const hourRef = useRef(hour);
  hourRef.current = hour;
  const touchedRef = useRef(false);
  touchedRef.current = hourTouched;

  // Reduced motion, real Venezuelan hour (client only, so the server HTML never mismatches).
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      setReduced(mq.matches);
      if (mq.matches) setPaused(true);
    };
    apply();
    mq.addEventListener?.("change", apply);
    const h = caracasHour();
    setHour(h);
    st.current.hour = h;
    return () => mq.removeEventListener?.("change", apply);
  }, []);

  // Runs only while ≥ 35 % on screen and the tab is visible.
  useEffect(() => {
    const el = root.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    let inView = false;
    const update = () => setLive(inView && !document.hidden);
    const io = new IntersectionObserver(([e]) => {
      inView = e.intersectionRatio >= 0.35;
      update();
    }, { threshold: [0, 0.35, 0.6] });
    io.observe(el);
    document.addEventListener("visibilitychange", update);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  /** Writes the frame: rotation, explode, light, shadow and the hotspot leader lines. */
  const paint = useCallback(() => {
    const el = root.current;
    const r = st.current;
    if (!el) return;
    const h = r.hour;
    // Sun: rises in the east (azimuth 90°) at 07:00, sets in the west (270°) at 19:00; elevation peaks at noon.
    const day = (h - 7) / 12;
    const az = 90 + day * 180;
    const elev = Math.sin(Math.PI * Math.min(1, Math.max(0, day)));
    const faceAz: Record<string, number> = { front: 180, right: 90, back: 0, left: 270 };
    for (const [f, a] of Object.entries(faceAz)) {
      const world = (a + r.ry + 360 * 4) % 360;
      const lit = Math.max(0, Math.cos(((world - az) * Math.PI) / 180));
      el.style.setProperty(`--sh-${f}`, (0.34 - 0.3 * lit * (0.45 + 0.55 * elev)).toFixed(3));
    }
    el.style.setProperty("--sh-top", (0.16 - 0.14 * elev).toFixed(3));
    el.style.setProperty("--ry", `${r.ry.toFixed(2)}deg`);
    el.style.setProperty("--ex", r.ex.toFixed(3));
    // Warm low sun at the ends of the day; windows on from 18:00.
    el.style.setProperty("--warm", Math.max(0, 1 - elev * 1.6).toFixed(3));
    el.style.setProperty("--lights", Math.min(1, Math.max(0, (h - 17.8) / 0.8)).toFixed(3));
    // Shadow: opposite the sun, longer when it is low (in platform space, which does not turn).
    const len = 26 + (1 - elev) * 70;
    const rad = ((az + 180) * Math.PI) / 180;
    el.style.setProperty("--shx", `${(Math.sin(rad) * len).toFixed(1)}px`);
    el.style.setProperty("--shy", `${(-Math.cos(rad) * len * 0.5).toFixed(1)}px`);
    el.style.setProperty("--sha", (0.18 + 0.12 * elev).toFixed(3));
    el.style.setProperty("--draw", r.draw.toFixed(3));
  }, []);

  // Animation loop.
  useEffect(() => {
    const r = st.current;
    const running = live && !paused;
    if (!running) {
      // Still frame (reduced motion, paused, off screen): keep the model a little open so it reads as a model.
      if (reduced && paused) r.ex = 0.35;
      r.draw = 1;
      paint();
      return;
    }
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const minDt = coarse ? 33 : 0;
    let raf = 0;
    let prev = performance.now();
    let lastPaint = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(64, now - prev);
      prev = now;
      r.elapsed += dt;
      if (!r.drag) {
        if (Math.abs(r.vel) > 0.002) {
          r.ry += r.vel * dt;
          r.vel *= Math.pow(0.94, dt / 16);
        } else if (now > r.holdUntil) {
          r.ry += (360 / TURN) * dt;
        }
      }
      const p = (r.elapsed % CYCLE) / CYCLE;
      r.ex = floor === null ? explodeAt(p) : 0.55;
      // The leader lines redraw (300 ms) each time the model opens.
      r.draw = floor === null && p >= 0.15 && p < 0.18 ? (p - 0.15) / 0.03 : 1;
      if (!touchedRef.current) r.hour = 7 + 12 * p;
      if (now - lastPaint >= minDt) {
        lastPaint = now;
        paint();
      }
    };
    raf = requestAnimationFrame(tick);
    // Mirror the sweeping hour into the slider a few times per second (not every frame).
    const iv = window.setInterval(() => {
      if (!touchedRef.current) setHour(Math.round(r.hour * 4) / 4);
    }, 250);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(iv);
    };
  }, [live, paused, reduced, floor, paint]);

  // Slider → light.
  useEffect(() => {
    if (hourTouched) {
      st.current.hour = hour;
      paint();
    }
  }, [hour, hourTouched, paint]);

  // Drag to turn (pointer events: mouse, pen and touch); vertical swipes keep scrolling the page.
  const onDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const r = st.current;
    r.drag = true;
    r.vel = 0;
    r.lastX = e.clientX;
    r.lastT = performance.now();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    const r = st.current;
    if (!r.drag) return;
    const now = performance.now();
    const dx = e.clientX - r.lastX;
    r.ry += dx * 0.42; // 100 px ≈ 42°
    r.vel = (dx * 0.42) / Math.max(8, now - r.lastT);
    r.lastX = e.clientX;
    r.lastT = now;
    paint();
  };
  const onUp = () => {
    const r = st.current;
    if (!r.drag) return;
    r.drag = false;
    r.holdUntil = performance.now() + 3500;
    if (paused || !live) r.vel = 0;
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    st.current.ry += e.key === "ArrowLeft" ? -15 : 15;
    st.current.holdUntil = performance.now() + 3500;
    paint();
  };

  const floors = useMemo(() => Array.from({ length: FLOORS }, (_, i) => i), []);
  const label = (h: number) => hhmm(h);
  const pct = ((hour - 7) / 12) * 100;

  return (
    <div ref={root} className={cn(s.wrap, className)} data-building4d data-live={live && !paused ? "1" : "0"}>
      {caption && (
        <Link href={caption.href} className="np-label relative z-10 inline-flex max-w-full items-center gap-2 truncate text-gold-text hover:text-ink">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-gold" aria-hidden />
          <span className="truncate">{caption.label}</span>
        </Link>
      )}
      <div
        className={s.viewport}
        role="img"
        aria-roledescription={tx(locale, "maqueta 3D giratoria", "rotating 3D model")}
        aria-label={tx(locale, "Maqueta del edificio. Arrástrala o usa las flechas para girarla.", "Building model. Drag it or use the arrow keys to turn it.")}
        tabIndex={0}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onKeyDown={onKey}
      >
        <div className={s.stage} style={{ ["--tilt" as string]: `${TILT}deg` }}>
          {/* Platform: brushed titanium, does not turn (its highlights stay with the light, like a real turntable). */}
          <div className={s.platform} aria-hidden>
            {Array.from({ length: 7 }, (_, i) => (
              <i key={i} className={s.edge} style={{ transform: `translateY(${(i + 1) * 2.2}px) rotateX(90deg)` }} />
            ))}
            <i className={s.disc} />
            <i className={s.shadow} />
          </div>
          <div className={s.rotor} aria-hidden>
            {floors.map((i) => {
              const out = floor === i;
              const y = i * FH;
              return (
                <div
                  key={i}
                  className={cn(s.floor, out && s.out)}
                  style={{ ["--i" as string]: i, transform: `translate3d(0, calc(${-y - SLAB / 2}px - var(--ex) * ${i * 16}px), ${out ? 46 : 0}px)` }}
                >
                  {VOL.map((v, k) => (
                    <div key={k} className={s.vol} style={{ transform: `translate3d(${v.x}px, 0, ${v.z}px)` }}>
                      {/* Slab with balcony overhang, then the glazed storey on top of it. */}
                      <div className={s.box} style={{ transform: `translateY(0)` }}>
                        <Box w={v.w + 14} h={SLAB} d={v.d + 12} kind="slab" plan={out} />
                      </div>
                      <div className={s.box} style={{ transform: `translateY(${-(FH - SLAB) / 2 - SLAB / 2}px)` }}>
                        <Box w={v.w - 6} h={FH - SLAB} d={v.d - 8} kind="glass" faces={["front", "back", "left", "right"]} />
                      </div>
                      {/* Planters on the balcony edge. */}
                      <i className={s.plant} style={{ transform: `translate3d(${v.w / 2 - 4}px, ${-SLAB / 2 - 5}px, ${v.d / 2 + 2}px)` }} />
                      <i className={s.plant} style={{ transform: `translate3d(${-v.w / 2 + 8}px, ${-SLAB / 2 - 5}px, ${v.d / 2 + 2}px)` }} />
                    </div>
                  ))}
                </div>
              );
            })}
            {/* Roof: lifts higher than the floors when the model opens. */}
            <div className={s.floor} style={{ transform: `translate3d(0, calc(${-FLOORS * FH - SLAB / 2}px - var(--ex) * ${FLOORS * 16 + 22}px), 0)` }}>
              {VOL.map((v, k) => (
                <div key={k} className={s.vol} style={{ transform: `translate3d(${v.x}px, 0, ${v.z}px)` }}>
                  <div className={s.box}>
                    <Box w={v.w + 14} h={SLAB + 2} d={v.d + 12} kind="roof" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Hotspots: thin graphite leader lines to small glass tags, drawn as the model opens. */}
        <ul className={s.hotspots}>
          {hotspots.slice(0, 4).map((h, i) => (
            <li key={h.href + i} className={s.hot} style={{ ["--n" as string]: i }}>
              <span className={s.line} aria-hidden />
              <Link href={h.href} className={cn(s.tag, "np-glass")}>
                <span className={s.tagLabel}>{h.label}</span>
                {h.value && <span className={s.tagValue}>{h.value}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* Control strip: play/pause · floors · hour of the day. */}
      <div className={cn(s.controls, "np-glass")}>
        <button
          type="button"
          className={s.ring}
          aria-pressed={paused}
          onClick={() => setPaused((p) => !p)}
          aria-label={paused ? tx(locale, "Reproducir", "Play") : tx(locale, "Pausar", "Pause")}
        >
          {paused ? <Play size={16} aria-hidden /> : <Pause size={16} aria-hidden />}
          {reduced && paused && <span className="ml-1.5 text-[13px] font-medium">{tx(locale, "Reproducir", "Play")}</span>}
        </button>
        <div className={s.floorsSel} role="group" aria-label={tx(locale, "Plantas", "Floors")}>
          {PICKS.map((i) => (
            <button
              key={i}
              type="button"
              aria-pressed={floor === i}
              onClick={() => setFloor((f) => (f === i ? null : i))}
              className={cn(s.pick, floor === i && s.pickOn)}
              aria-label={tx(locale, `Planta ${i + 1}`, `Floor ${i + 1}`)}
            >
              P{i + 1}
            </button>
          ))}
        </div>
        <label className={s.hour}>
          <Sun size={16} aria-hidden className="shrink-0 text-gold-text" />
          <span className="sr-only">{tx(locale, "Hora del día", "Time of day")}</span>
          <span className={s.hourEnd} aria-hidden>07:00</span>
          <span className={s.track}>
            <input
              type="range"
              min={7}
              max={19}
              step={0.25}
              value={hour}
              onChange={(e) => {
                setHourTouched(true);
                setHour(Number(e.target.value));
              }}
              aria-valuetext={label(hour)}
              className={s.range}
              style={{ ["--p" as string]: `${pct}%` }}
            />
            <span className={s.knobLabel} style={{ left: `${pct}%` }} aria-hidden>{label(hour)}</span>
          </span>
          <span className={s.hourEnd} aria-hidden>19:00</span>
        </label>
        <span className={s.hint} aria-hidden>
          <RotateCw size={15} /> {tx(locale, "Arrastra para girar", "Drag to turn")}
        </span>
      </div>
    </div>
  );
}

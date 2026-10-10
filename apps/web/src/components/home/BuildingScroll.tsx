"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Pause, Play } from "lucide-react";
import type { Locale } from "@/types/domain";
import { tx } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { ease, ScrollTrigger, span, useReducedMotion } from "./motion";
import styles from "./BuildingScroll.module.css";

export type Chapter = { eyebrow: string; title: string; body: string };
export type FloorPick = { href: string; title: string; meta: string; price: string };

const FLOORS = 9;
// Floors (0 = lowest) that hold the featured residences, top first: the penthouse crowns the building.
const PICK_FLOORS = [8, 5, 2];
const W = 6;
const D = 4.2;
const H = 1;
const BASE = 0.5;
const C = { sky: 0xe9e0d3, ground: 0xdccdb8, cal: 0xfbf8f3, arena: 0xd9c6ab, navy: 0x1e1a18, card: 0x2a2420, glass: 0xd6cdc2, teja: 0x8e3b22, tejaLight: 0xc9a574, warm: 0xf3c48d };
/** How long each chapter stays on screen while playing (the last one, the lit building, a little longer). */
const STEP_MS = [6000, 6000, 6000, 8000];
/** 3D build progress reached at each chapter: foundations, all floors, the roof, the lit residences. */
const SCENE_AT = [0.27, 0.5, 0.64, 1];

/**
 * "El edificio que se construye solo": a short cinematic that plays by itself when the section comes into view.
 * Four chapters (how the agency works) advance on a timer while the building rises floor by floor, is crowned with
 * the New Place double roof and finally lights the floors of the featured residences (each label links to its
 * listing). No scroll pinning: the section is one screen tall at most, and the visitor can pause, resume or jump
 * to any chapter (step bars). Playback pauses while the section is off screen or the tab is hidden.
 *
 *  - "scene": real-time 3D (Three.js, loaded only near the viewport) on capable desktops.
 *  - "lite":  a CSS-only tower with the same choreography (phones, Save-Data, modest CPUs, no WebGL). Also the
 *             server render.
 *  - "list":  prefers-reduced-motion: no animation, the four chapters as a readable list.
 */
type Mode = "list" | "lite" | "scene";
const SCENE_OFF = true;

function canRunScene() {
  // 032 (Adolfo): no three.js on the home, so it weighs less — every device gets the light CSS tower.
  if (SCENE_OFF) return false;
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  if (!window.matchMedia("(min-width: 768px)").matches) return false;
  const nav = navigator as Navigator & { connection?: { saveData?: boolean } };
  if (nav.connection?.saveData) return false;
  if ((nav.hardwareConcurrency ?? 8) < 6) return false;
  return true;
}

/**
 * Timer-driven chapters. Runs only while `enabled`, playing, at least a third on screen and the tab is visible;
 * pausing keeps the elapsed time, so resuming continues where it stopped (in sync with the CSS progress bar).
 * When the section has fully left the screen and comes back, it starts again from the first chapter.
 */
function useAutoplay(n: number, enabled: boolean, root: React.RefObject<HTMLElement | null>) {
  const [step, setStep] = useState(0);
  const [nonce, setNonce] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [inView, setInView] = useState(false);
  const [tabOn, setTabOn] = useState(true);
  const left = useRef(false);
  const spent = useRef({ key: "", ms: 0 });
  const running = enabled && playing && inView && tabOn;
  const key = `${step}:${nonce}`;

  useEffect(() => {
    if (!enabled || !root.current || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) left.current = true;
        setInView(e.intersectionRatio >= 0.35);
      },
      { threshold: [0, 0.35] },
    );
    io.observe(root.current);
    const onVis = () => setTabOn(!document.hidden);
    onVis();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [enabled, root]);

  // Back on screen after leaving it entirely: replay from the start (only if the visitor hasn't paused).
  useEffect(() => {
    if (!inView || !left.current) return;
    left.current = false;
    if (!playing) return;
    spent.current = { key: "", ms: 0 };
    setStep(0);
    setNonce((x) => x + 1);
  }, [inView, playing]);

  useEffect(() => {
    if (!running) return;
    if (spent.current.key !== key) spent.current = { key, ms: 0 };
    const started = performance.now();
    let fired = false;
    const t = window.setTimeout(() => {
      fired = true;
      spent.current = { key: "", ms: 0 };
      setStep((s) => (s + 1) % n);
    }, Math.max(0, STEP_MS[step % STEP_MS.length] - spent.current.ms));
    return () => {
      window.clearTimeout(t);
      if (!fired && spent.current.key === key) spent.current.ms += performance.now() - started;
    };
  }, [running, key, step, n]);

  const goTo = useCallback((i: number) => {
    spent.current = { key: "", ms: 0 };
    setStep(i);
    setNonce((x) => x + 1);
  }, []);

  return { step, key, running, playing, setPlaying, goTo };
}

export function BuildingScroll({ locale, chapters, picks, heading, cta }: { locale: Locale; chapters: Chapter[]; picks: FloorPick[]; heading: string; cta: string }) {
  const reduced = useReducedMotion();
  const [mode, setMode] = useState<Mode>("lite");
  const failed = useRef(false);
  const root = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const labels = useRef<(HTMLAnchorElement | null)[]>([]);
  const sceneGo = useRef<((t: number, wrap: boolean) => void) | null>(null);
  const live = useRef(false);
  const n = chapters.length;
  const { step, key, running, playing, setPlaying, goTo } = useAutoplay(n, mode !== "list", root);
  const prevStep = useRef(step);

  // Decide once mounted (and again if the window crosses the phone breakpoint or motion preference changes).
  useEffect(() => {
    if (reduced) return setMode("list");
    const mq = window.matchMedia("(min-width: 768px)");
    const sync = () => setMode(!failed.current && canRunScene() ? "scene" : "lite");
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [reduced]);

  // The section changes height when switching layouts: every scroll trigger below it must be recomputed.
  useEffect(() => {
    const t = window.setTimeout(() => ScrollTrigger.refresh(), 60);
    return () => window.clearTimeout(t);
  }, [mode]);

  // Drive the 3D scene from the chapter timer.
  useEffect(() => {
    live.current = running;
    const wrap = prevStep.current === n - 1 && step === 0;
    prevStep.current = step;
    sceneGo.current?.(SCENE_AT[step] ?? 1, wrap);
  }, [step, key, running, n]);

  useEffect(() => {
    if (mode !== "scene" || !root.current || !canvas.current) return;
    const section = root.current;
    const cv = canvas.current;
    let disposed = false;
    let raf = 0;
    let visible = false;
    let target = SCENE_AT[0];
    let current = 0;
    let pointerX = 0;
    let pointerY = 0;
    let swayT = 0;
    let last = performance.now();
    let fade = 0;
    let kick = () => {};
    let teardown: (() => void) | undefined;

    sceneGo.current = (t, wrap) => {
      window.clearTimeout(fade);
      if (wrap) {
        // Loop: the finished building dissolves and the next one rises from the ground (never flies apart).
        cv.style.opacity = "0";
        fade = window.setTimeout(() => {
          current = 0;
          target = t;
          cv.style.opacity = "1";
          kick();
        }, 520);
        return;
      }
      cv.style.opacity = "1";
      target = t;
      kick();
    };

    const onPointer = (e: PointerEvent) => {
      pointerX = (e.clientX / window.innerWidth) * 2 - 1;
      pointerY = (e.clientY / window.innerHeight) * 2 - 1;
      kick();
    };
    window.addEventListener("pointermove", onPointer, { passive: true });

    const boot = async () => {
      const THREE = await import("three");
      if (disposed) return;
      let renderer: InstanceType<typeof THREE.WebGLRenderer>;
      try {
        renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, powerPreference: "high-performance" });
      } catch {
        failed.current = true;
        setMode("lite");
        return;
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;

      const scene = new THREE.Scene();
      const fog = new THREE.Fog(C.sky, 26, 52);
      scene.fog = fog;
      const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200);

      scene.add(new THREE.HemisphereLight(0xfff8ef, 0xb9a689, 1.9));
      const sun = new THREE.DirectionalLight(0xfff1e2, 2.2);
      sun.position.set(-8, 14, 10);
      scene.add(sun);
      const rim = new THREE.DirectionalLight(0xc2a988, 1.2);
      rim.position.set(10, 6, -8);
      scene.add(rim);

      const disposables: { dispose: () => void }[] = [];
      const keep = <T extends { dispose: () => void }>(x: T) => (disposables.push(x), x);

      // Ground: a soft round plinth on the sunlit sand-coloured page.
      const ground = new THREE.Mesh(keep(new THREE.CircleGeometry(14, 64)), keep(new THREE.MeshStandardMaterial({ color: C.ground, roughness: 1 })));
      ground.rotation.x = -Math.PI / 2;
      scene.add(ground);
      const podium = new THREE.Mesh(keep(new THREE.BoxGeometry(W + 2.2, BASE, D + 2.2)), keep(new THREE.MeshStandardMaterial({ color: C.arena, roughness: 0.9 })));
      podium.position.y = BASE / 2;
      scene.add(podium);

      const slabGeo = keep(new THREE.BoxGeometry(W + 0.5, 0.14, D + 0.5));
      const glassGeo = keep(new THREE.BoxGeometry(W - 0.3, H - 0.14, D - 0.3));
      const finGeo = keep(new THREE.BoxGeometry(0.06, H - 0.14, 0.06));
      const railGeo = keep(new THREE.BoxGeometry(W + 0.4, 0.05, 0.05));
      const fins: [number, number][] = [];
      for (let x = -W / 2 + 0.15; x <= W / 2 - 0.1; x += 1.17) fins.push([x, D / 2 - 0.15], [x, -D / 2 + 0.15]);
      for (let z = -D / 2 + 1.0; z <= D / 2 - 0.5; z += 1.1) fins.push([W / 2 - 0.15, z], [-W / 2 + 0.15, z]);

      type Floor = { g: InstanceType<typeof THREE.Group>; mats: InstanceType<typeof THREE.MeshStandardMaterial>[]; glass: InstanceType<typeof THREE.MeshStandardMaterial>; y: number };
      const floors: Floor[] = [];
      const m4 = new THREE.Matrix4();
      for (let i = 0; i < FLOORS; i++) {
        const g = new THREE.Group();
        const slabM = keep(new THREE.MeshStandardMaterial({ color: C.cal, roughness: 0.7, transparent: true }));
        const glassM = keep(new THREE.MeshStandardMaterial({ color: C.glass, roughness: 0.12, metalness: 0.35, emissive: C.warm, emissiveIntensity: 0, transparent: true }));
        const finM = keep(new THREE.MeshStandardMaterial({ color: C.cal, roughness: 0.6, transparent: true }));
        const slab = new THREE.Mesh(slabGeo, slabM);
        slab.position.y = -0.07;
        const glass = new THREE.Mesh(glassGeo, glassM);
        glass.position.y = (H - 0.14) / 2;
        const inst = new THREE.InstancedMesh(finGeo, finM, fins.length);
        fins.forEach(([x, z], k) => inst.setMatrixAt(k, m4.makeTranslation(x, (H - 0.14) / 2, z)));
        const rail = new THREE.Mesh(railGeo, finM);
        rail.position.set(0, 0.42, D / 2 + 0.22);
        g.add(slab, glass, inst, rail);
        const y = BASE + 0.14 + i * H;
        g.position.y = y;
        g.visible = false;
        scene.add(g);
        floors.push({ g, mats: [slabM, glassM, finM], glass: glassM, y });
      }
      const top = BASE + 0.14 + FLOORS * H;
      const cap = new THREE.Mesh(slabGeo, keep(new THREE.MeshStandardMaterial({ color: C.cal, roughness: 0.7 })));
      cap.position.y = top - 0.07;
      cap.visible = false;
      scene.add(cap);

      // The New Place double roof, extruded through the building's depth: outer in Cal, inner "teja" in terracotta.
      const chevron = (a: number, h: number, t: number) => {
        const s = new THREE.Shape();
        s.moveTo(-a, 0);
        s.lineTo(0, h);
        s.lineTo(a, 0);
        s.lineTo(a - t * 1.6, 0);
        s.lineTo(0, h - t * 1.25);
        s.lineTo(-a + t * 1.6, 0);
        s.closePath();
        return s;
      };
      const roofDepth = D + 0.9;
      const outer = new THREE.Mesh(
        keep(new THREE.ExtrudeGeometry(chevron(W / 2 + 0.9, 2.5, 0.42), { depth: roofDepth, bevelEnabled: false })),
        keep(new THREE.MeshStandardMaterial({ color: C.cal, roughness: 0.5, transparent: true })),
      );
      const inner = new THREE.Mesh(
        keep(new THREE.ExtrudeGeometry(chevron(W / 2 - 0.5, 1.35, 0.34), { depth: roofDepth - 0.3, bevelEnabled: false })),
        keep(new THREE.MeshStandardMaterial({ color: C.teja, roughness: 0.45, emissive: C.teja, emissiveIntensity: 0.25, transparent: true })),
      );
      outer.position.set(0, top, -roofDepth / 2);
      inner.position.set(0, top, -(roofDepth - 0.3) / 2);
      outer.visible = inner.visible = false;
      scene.add(outer, inner);

      const resize = () => {
        const r = cv.getBoundingClientRect();
        renderer.setSize(r.width, r.height, false);
        camera.aspect = r.width / Math.max(1, r.height);
        camera.updateProjectionMatrix();
      };
      resize();
      const ro = new ResizeObserver(() => {
        resize();
        kick();
      });
      ro.observe(cv);

      const v = new THREE.Vector3();
      let px = 0;
      let py = 0;
      const frame = () => {
        raf = 0;
        // Cinematic glide toward the current chapter's state (≈2 s), plus a slow sway of the camera while playing.
        current += (target - current) * 0.035;
        const now = performance.now();
        if (live.current) swayT += Math.min(64, now - last);
        last = now;
        px += (pointerX - px) * 0.05;
        py += (pointerY - py) * 0.05;
        const p = current;

        floors.forEach((f, i) => {
          const a = 0.02 + i * 0.045;
          const k = ease(span(p, a, a + 0.1));
          f.g.visible = k > 0.001;
          f.g.position.y = f.y + (1 - k) * 7;
          f.g.rotation.y = (1 - k) * 0.6;
          f.mats.forEach((m) => (m.opacity = k));
          // Warm night lights once placed; the featured floors glow terracotta at the end.
          const lit = PICK_FLOORS.includes(i);
          const glow = span(p, 0.6, 0.72);
          f.glass.emissive.setHex(lit && glow > 0 ? C.tejaLight : C.warm);
          f.glass.emissiveIntensity = k * (lit ? 0.05 + glow : 0.05);
        });
        const capK = ease(span(p, 0.46, 0.52));
        cap.visible = capK > 0.001;
        cap.position.y = top - 0.07 + (1 - capK) * 5;
        const ro1 = ease(span(p, 0.48, 0.58));
        const ro2 = ease(span(p, 0.53, 0.64));
        outer.visible = ro1 > 0.001;
        inner.visible = ro2 > 0.001;
        outer.position.y = top + (1 - ro1) * 6;
        inner.position.y = top + (1 - ro2) * 8;
        (outer.material as InstanceType<typeof THREE.MeshStandardMaterial>).opacity = ro1;
        (inner.material as InstanceType<typeof THREE.MeshStandardMaterial>).opacity = ro2;

        // Camera: a slow orbit that rises with the building and settles on a three-quarter view.
        const wide = camera.aspect > 1.1;
        const theta = -0.95 + p * 1.45 + px * 0.08 + Math.sin(swayT / 5200) * 0.12;
        // A touch wider than full-screen framing: the section is at most 860 px tall and sits under the header.
        const radius = (wide ? 37 : 66) - p * 2;
        const lookY = 1.6 + span(p, 0, 0.6) * 4.6;
        // Fog only softens the far side of the plinth, whatever the camera distance.
        fog.near = radius - 2;
        fog.far = radius + 26;
        camera.position.set(Math.sin(theta) * radius, lookY + 3.5 + p * 2 - py * 0.6, Math.cos(theta) * radius);
        camera.lookAt(0, lookY, 0);
        // On wide screens the building sits right of centre, leaving the left column to the copy.
        // On phones it sits left and high, leaving room for the labels on the right and the copy below.
        const fh = 1000 / camera.aspect;
        if (wide) camera.setViewOffset(1000, fh, -150, -fh * 0.06, 1000, fh);
        else camera.setViewOffset(1000, fh, 130, fh * 0.1, 1000, fh);
        renderer.render(scene, camera);

        // Residence labels pinned to the right edge of their floor.
        const show = span(p, 0.62, 0.74);
        const rect = cv.getBoundingClientRect();
        labels.current.forEach((el, i) => {
          if (!el) return;
          const f = floors[PICK_FLOORS[i]];
          v.set(W / 2 + 0.35, f.y + H / 2, D / 2 + 0.2).project(camera);
          const x = (v.x * 0.5 + 0.5) * rect.width;
          const y = (-v.y * 0.5 + 0.5) * rect.height;
          el.style.transform = `translate(${x}px, ${y}px) translateY(-50%)`;
          el.style.opacity = String(span(show, i * 0.18, i * 0.18 + 0.5));
          el.style.pointerEvents = show > 0.6 ? "auto" : "none";
          el.tabIndex = show > 0.6 ? 0 : -1;
        });

        // Render only while playing or something still moves; a settled, paused scene costs nothing.
        if (visible && (live.current || Math.abs(target - current) > 0.0005 || Math.abs(pointerX - px) > 0.001 || Math.abs(pointerY - py) > 0.001)) raf = requestAnimationFrame(frame);
      };
      kick = () => {
        if (!raf && visible) raf = requestAnimationFrame(frame);
      };
      // The loop stops entirely while the canvas is off screen.
      const io = new IntersectionObserver(([e]) => {
        visible = e.isIntersecting;
        if (visible) kick();
        else if (raf) {
          cancelAnimationFrame(raf);
          raf = 0;
        }
      });
      io.observe(cv);
      teardown = () => {
        io.disconnect();
        ro.disconnect();
        disposables.forEach((d) => d.dispose());
        renderer.dispose();
      };
      if (disposed) teardown();
    };

    // Load three.js only when the section is about one screen away.
    const near = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          near.disconnect();
          boot().catch(() => {
            failed.current = true;
            setMode("lite");
          });
        }
      },
      { rootMargin: "120% 0px" },
    );
    near.observe(section);

    return () => {
      disposed = true;
      sceneGo.current = null;
      window.clearTimeout(fade);
      near.disconnect();
      window.removeEventListener("pointermove", onPointer);
      if (raf) cancelAnimationFrame(raf);
      teardown?.();
    };
  }, [mode]);

  if (mode === "list")
    return (
      <section data-building className="bg-[#D8CFC1] text-ink" aria-labelledby="np-how-we-work">
        <div className="mx-auto max-w-[1320px] px-4 py-20 md:px-8 lg:py-28">
          <h2 id="np-how-we-work" className="max-w-[760px] text-[36px] leading-[1.05] tracking-[-0.02em] text-ink md:text-[52px]">
            {heading}
          </h2>
          <ol className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {chapters.map((c) => (
              <li key={c.title} className="np-glass flex flex-col rounded-[4px] p-6">
                <p className="np-eyebrow text-[12px] tracking-[0.2em] text-gold-text">{c.eyebrow}</p>
                <h3 className="mt-3 text-[26px] leading-[1.1] text-ink">{c.title}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-ink/75">{c.body}</p>
              </li>
            ))}
          </ol>
          {picks.length > 0 && (
            <ul className="mt-6 grid gap-3 md:grid-cols-3">
              {picks.map((k) => (
                <li key={k.href}>
                  <Link href={k.href} className="np-glass group flex h-full flex-col rounded-[4px] p-5 transition-transform duration-300 hover:-translate-y-0.5">
                    <span className="block font-serif text-[22px] leading-tight text-ink">{k.title}</span>
                    <span className="mt-1 block text-sm text-ink/65">{k.meta}</span>
                    <span className="mt-3 flex items-center justify-between font-display text-[15px] font-semibold text-coral">
                      {k.price}
                      <span className="font-normal text-ink/65 transition-transform group-hover:translate-x-0.5">{cta} →</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    );

  const scene = mode === "scene";
  // Phones: the floating contact buttons step aside while the chapter copy and its controls are on screen.
  const copy = (
    <div data-hide-fab-mobile className="relative min-w-0">
      {/* Same kicker as the other home sections (an h2 for the outline; the span carries the sans kicker face,
          since h2 itself is always set in the serif). */}
      <h2 id="np-how-we-work" className="text-gold-text">
        <span className="np-kicker">{heading}</span>
      </h2>
      {/* All chapters share one grid cell: the box keeps the tallest one's height, so nothing below jumps. */}
      <div className="mt-5 grid lg:mt-7">
        {chapters.map((c, i) => (
          <div
            key={c.title}
            aria-hidden={i !== step}
            className={cn(
              // Crossfade: visibility is part of the transition, so the outgoing chapter stays painted while it fades
              // (no empty frame between chapters, nor when the loop jumps from the last one back to the first).
              "[grid-area:1/1] transition-[opacity,transform,filter,visibility] ease-[cubic-bezier(.16,1,.3,1)]",
              i === step ? "visible translate-y-0 opacity-100 blur-0 delay-100 duration-[900ms]" : cn("invisible opacity-0 blur-[1px] duration-500", i < step ? "-translate-y-2" : "translate-y-2"),
            )}
          >
            <p className="np-eyebrow text-[12px] tracking-[0.2em] text-gold-text">{c.eyebrow}</p>
            <h3 className="mt-2.5 text-[26px] leading-[1.08] tracking-[-0.015em] text-ink sm:text-[40px] lg:text-[52px]">{c.title}</h3>
            <p className="mt-3 max-w-[420px] text-[15px] leading-relaxed text-ink/80 sm:text-[16px]">{c.body}</p>
          </div>
        ))}
      </div>
      <div className="mt-5 flex items-center gap-2 lg:mt-8">
        <ol className="flex min-w-0 max-w-[312px] flex-1 items-center gap-2" aria-label={tx(locale, "Pasos", "Steps")}>
          {chapters.map((c, i) => (
            <li key={c.title} className="min-w-0 max-w-[72px] flex-1">
              <button
                type="button"
                onClick={() => goTo(i)}
                aria-current={i === step ? "step" : undefined}
                aria-label={`${String(i + 1).padStart(2, "0")} · ${c.title}`}
                className="group flex h-11 w-full items-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                <span className="relative block h-[3px] w-full overflow-hidden rounded-full bg-ink/15 transition-colors group-hover:bg-ink/25">
                  <span
                    key={i === step ? key : "idle"}
                    className={cn("np-step-fill absolute inset-0 origin-left rounded-full", i < step && "is-done", i === step && "is-now")}
                    style={i === step ? { animationDuration: `${STEP_MS[i % STEP_MS.length]}ms`, animationPlayState: running ? "running" : "paused" } : undefined}
                  />
                </span>
              </button>
            </li>
          ))}
        </ol>
        <span className="ml-1 shrink-0 font-display text-[12px] font-semibold uppercase tracking-[0.24em] text-ink/70" aria-hidden>
          {String(step + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}
        </span>
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          aria-label={playing ? tx(locale, "Pausar la animación", "Pause the animation") : tx(locale, "Reproducir la animación", "Play the animation")}
          className="np-glass ml-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink transition-transform duration-300 hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          {playing ? <Pause size={16} aria-hidden /> : <Play size={16} aria-hidden className="translate-x-[1px]" />}
        </button>
      </div>
    </div>
  );

  if (!scene)
    return (
      <section ref={root} data-building className="relative overflow-hidden bg-[#D8CFC1] text-ink" aria-labelledby="np-how-we-work">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_20%,rgba(255,250,242,.85),transparent_60%)] [html.dark_&]:opacity-10" aria-hidden />
        <div className="relative mx-auto grid max-w-[1320px] items-center gap-4 px-4 pb-8 pt-6 md:grid-cols-[1fr_1fr] md:gap-10 md:px-8 md:py-20">
          <div className="md:order-2">
            <LiteTower step={step} picks={picks} cta={cta} />
          </div>
          <div className="md:order-1">{copy}</div>
        </div>
      </section>
    );

  return (
    <section ref={root} data-building className="relative h-[min(100svh,860px)] min-h-[620px] overflow-hidden bg-[#D8CFC1] text-ink" aria-labelledby="np-how-we-work">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_65%_35%,rgba(255,250,242,.9),transparent_62%)]" aria-hidden />
      <canvas ref={canvas} className="absolute inset-0 h-full w-full transition-opacity duration-500" aria-hidden />
      <div className="pointer-events-none relative mx-auto flex h-full max-w-[1320px] flex-col justify-end px-4 pb-14 md:px-8 lg:justify-center lg:pb-0">
        <div className="pointer-events-auto max-w-[460px]">{copy}</div>
      </div>
      {/* Residence labels (positioned each frame next to their lit floor) */}
      {picks.map((k, i) => (
        <Link
          key={k.href}
          href={k.href}
          ref={(el) => void (labels.current[i] = el)}
          tabIndex={-1}
          className="group absolute left-0 top-0 flex items-center gap-3 opacity-0 will-change-transform"
        >
          <span className="h-px w-4 bg-ink/40 sm:w-14" aria-hidden />
          <span className="np-glass rounded-2xl px-3 py-2 transition-colors group-hover:border-ink/30 sm:px-4 sm:py-3">
            <span className="block max-w-[150px] truncate font-serif text-[16px] leading-tight text-ink sm:max-w-[240px] sm:text-[20px]">{k.title}</span>
            <span className="hidden text-[12px] text-ink/60 sm:block">{k.meta}</span>
            <span className="mt-1 block font-display text-[14px] font-semibold text-coral">
              {k.price} <span className="font-normal text-ink/60">· {cta} →</span>
            </span>
          </span>
        </Link>
      ))}
    </section>
  );
}

/**
 * The light tower (no WebGL), styled as a quiet architectural render: a warm daylight sky, bronze-mullioned glass
 * floors with soft reflections and ambient occlusion under each slab. Nine CSS floors with an isometric side face rise out of a blueprint grid, the
 * double roof settles on top, a light line scans the facade at every chapter, and in the last chapter the
 * featured floors glow and their labels slide in. Everything is transform/opacity (compositor only).
 */
function LiteTower({ step, picks, cta }: { step: number; picks: FloorPick[]; cta: string }) {
  const placed = step === 0 ? 5 : FLOORS;
  const roof = step >= 2;
  const lit = step >= 3;
  return (
    <div className={cn("np-tower", styles.tower, "relative mx-auto h-[290px] w-full max-w-[520px] md:h-[540px]")} data-step={step}>
      <div className={styles.sky} aria-hidden />
      <div className="np-tower-grid" aria-hidden />
      <div className="np-tower-halo" data-on={lit ? "1" : "0"} aria-hidden />
      {/* Centred in its column while it rises; in the last chapter it glides left to make room for the lit floors' labels. */}
      <div className={cn("np-tower-body absolute inset-y-0 w-[var(--fw)]", styles.body)}>
        <span className="np-tower-podium" aria-hidden />
        {Array.from({ length: FLOORS }, (_, i) => (
          <span
            key={i}
            aria-hidden
            className="np-floor"
            data-on={i < placed ? "1" : "0"}
            data-lit={lit && PICK_FLOORS.includes(i) ? "1" : "0"}
            style={{ "--i": i, "--d": `${Math.max(0, i - (step === 1 ? 5 : 0)) * 110}ms` } as React.CSSProperties}
          />
        ))}
        <svg className="np-tower-roof" data-on={roof ? "1" : "0"} viewBox="0 0 128 44" aria-hidden>
          <path d="M0 44 64 0l64 44h-15L64 11 15 44Z" className="np-roof-cal" />
          <path d="M26 44 64 18l38 26H89L64 29 39 44Z" className="np-roof-teja" />
        </svg>
        <span key={step} className="np-tower-scan" aria-hidden />
        {picks.slice(0, PICK_FLOORS.length).map((k, i) => (
          <Link
            key={k.href}
            href={k.href}
            tabIndex={lit ? 0 : -1}
            aria-hidden={!lit || undefined}
            className="np-tower-label group"
            data-on={lit ? "1" : "0"}
            style={{ "--i": PICK_FLOORS[i], "--d": `${300 + i * 160}ms` } as React.CSSProperties}
          >
            <span className="h-px w-3 shrink-0 bg-ink/40 md:w-8" aria-hidden />
            <span className="np-glass min-w-0 rounded-xl px-2.5 py-1 md:rounded-2xl md:px-3.5 md:py-2">
              <span className="block max-w-[150px] truncate font-serif text-[13px] leading-tight text-ink md:max-w-[220px] md:text-[17px]">{k.title}</span>
              <span className="block font-display text-[12px] font-semibold text-coral md:text-[13px]">
                {k.price} <span className="hidden font-normal text-ink/60 md:inline">· {cta} →</span>
              </span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

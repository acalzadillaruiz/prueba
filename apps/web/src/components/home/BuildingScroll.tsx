"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ease, scrubSection, span, useReducedMotion } from "./motion";

export type Chapter = { eyebrow: string; title: string; body: string };
export type FloorPick = { href: string; title: string; meta: string; price: string };

const FLOORS = 9;
// Floors (0 = lowest) that hold the featured residences, top first: the penthouse crowns the building.
const PICK_FLOORS = [8, 5, 2];
const W = 6;
const D = 4.2;
const H = 1;
const BASE = 0.5;
const C = { cal: 0xf8f5ef, arena: 0xe8dcc8, navy: 0x162638, card: 0x1e3048, glass: 0x35516d, teja: 0xa8452a, tejaLight: 0xe79a7f, warm: 0xf3c48d };

/**
 * "El edificio que se construye": a real-time 3D building (Three.js, loaded only when the section nears the
 * viewport) that rises floor by floor as you scroll, is crowned with the New Place double roof, and finally
 * lights the floors where the featured residences are, each with a label that links to its listing.
 * Four short chapters on the left tell how the agency works while it builds.
 * Reduced motion or no WebGL: the chapters and the residences as a plain, readable layout.
 */
export function BuildingScroll({ chapters, picks, heading, cta }: { chapters: Chapter[]; picks: FloorPick[]; heading: string; cta: string }) {
  const reduced = useReducedMotion();
  const [failed, setFailed] = useState(false);
  const root = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const chapterEls = useRef<(HTMLDivElement | null)[]>([]);
  const dots = useRef<(HTMLSpanElement | null)[]>([]);
  const labels = useRef<(HTMLAnchorElement | null)[]>([]);
  const floorTag = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (reduced || failed || !root.current || !canvas.current) return;
    const section = root.current;
    const cv = canvas.current;
    let disposed = false;
    let raf = 0;
    let visible = false;
    let target = 0;
    let current = 0;
    let pointerX = 0;
    let pointerY = 0;
    let teardown: (() => void) | undefined;

    // Chapters + labels follow the raw scroll so the copy never lags behind the wheel.
    const paint = (p: number) => {
      const n = chapters.length;
      chapterEls.current.forEach((el, i) => {
        if (!el) return;
        const a = i / n;
        const b = (i + 1) / n;
        // Sequential crossfade: the outgoing chapter is gone before the next one rises (no overlapping copy).
        const fadeIn = i === 0 ? 1 : span(p, a + 0.004, a + 0.05);
        const fadeOut = i === n - 1 ? 1 : 1 - span(p, b - 0.045, b - 0.002);
        const k = Math.min(fadeIn, fadeOut);
        el.style.opacity = String(k);
        el.style.transform = `translateY(${(1 - k) * (p < a ? 30 : -30)}px)`;
        el.style.visibility = k < 0.02 ? "hidden" : "visible";
        dots.current[i]?.classList.toggle("is-on", p >= a - 0.03);
      });
      if (floorTag.current) floorTag.current.textContent = String(Math.min(FLOORS, Math.max(0, Math.round(span(p, 0.06, 0.62) * FLOORS)))).padStart(2, "0");
    };
    const off = scrubSection(section, (p) => {
      target = p;
      paint(p);
    });

    const onPointer = (e: PointerEvent) => {
      pointerX = (e.clientX / window.innerWidth) * 2 - 1;
      pointerY = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onPointer, { passive: true });

    const boot = async () => {
      const THREE = await import("three");
      if (disposed) return;
      let renderer: InstanceType<typeof THREE.WebGLRenderer>;
      try {
        renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, powerPreference: "high-performance" });
      } catch {
        setFailed(true);
        return;
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;

      const scene = new THREE.Scene();
      const fog = new THREE.Fog(C.navy, 26, 52);
      scene.fog = fog;
      const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200);

      scene.add(new THREE.HemisphereLight(0xcfe0ee, 0x2a3e55, 1.6));
      const sun = new THREE.DirectionalLight(0xfff1e2, 2.2);
      sun.position.set(-8, 14, 10);
      scene.add(sun);
      const rim = new THREE.DirectionalLight(0xa9c6d8, 1.2);
      rim.position.set(10, 6, -8);
      scene.add(rim);

      const disposables: { dispose: () => void }[] = [];
      const keep = <T extends { dispose: () => void }>(x: T) => (disposables.push(x), x);

      // Ground: a soft round plinth on the night-blue page.
      const ground = new THREE.Mesh(keep(new THREE.CircleGeometry(14, 64)), keep(new THREE.MeshStandardMaterial({ color: C.card, roughness: 1 })));
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
        const glassM = keep(new THREE.MeshStandardMaterial({ color: C.glass, roughness: 0.22, metalness: 0.15, emissive: C.warm, emissiveIntensity: 0, transparent: true }));
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
      const ro = new ResizeObserver(resize);
      ro.observe(cv);

      const v = new THREE.Vector3();
      let px = 0;
      let py = 0;
      const frame = (time: number) => {
        raf = 0;
        current += (target - current) * 0.09;
        px += (pointerX - px) * 0.05;
        py += (pointerY - py) * 0.05;
        const p = current;

        floors.forEach((f, i) => {
          const a = 0.06 + i * 0.055;
          const k = ease(span(p, a, a + 0.12));
          f.g.visible = k > 0.001;
          f.g.position.y = f.y + (1 - k) * 7;
          f.g.rotation.y = (1 - k) * 0.6;
          f.mats.forEach((m) => (m.opacity = k));
          // Warm night lights once placed; the featured floors glow terracotta at the end.
          const lit = PICK_FLOORS.includes(i);
          const glow = span(p, 0.72, 0.84);
          const pulse = 0.85 + 0.15 * Math.sin(time / 420 + i);
          f.glass.emissive.setHex(lit && glow > 0 ? C.tejaLight : C.warm);
          f.glass.emissiveIntensity = k * (lit ? 0.05 + glow * 1.1 * pulse : 0.05);
        });
        const capK = ease(span(p, 0.58, 0.64));
        cap.visible = capK > 0.001;
        cap.position.y = top - 0.07 + (1 - capK) * 5;
        const ro1 = ease(span(p, 0.6, 0.7));
        const ro2 = ease(span(p, 0.65, 0.76));
        outer.visible = ro1 > 0.001;
        inner.visible = ro2 > 0.001;
        outer.position.y = top + (1 - ro1) * 6;
        inner.position.y = top + (1 - ro2) * 8;
        (outer.material as InstanceType<typeof THREE.MeshStandardMaterial>).opacity = ro1;
        (inner.material as InstanceType<typeof THREE.MeshStandardMaterial>).opacity = ro2;

        // Camera: a slow orbit that rises with the building and settles on a three-quarter view.
        const wide = camera.aspect > 1.1;
        const theta = -0.95 + p * 1.45 + px * 0.08;
        const radius = (wide ? 32 : 66) - p * 2;
        const lookY = 1.6 + span(p, 0, 0.72) * 4.6;
        // Fog only softens the far side of the plinth, whatever the camera distance.
        fog.near = radius - 2;
        fog.far = radius + 26;
        camera.position.set(Math.sin(theta) * radius, lookY + 3.5 + p * 2 - py * 0.6, Math.cos(theta) * radius);
        camera.lookAt(0, lookY, 0);
        // On wide screens the building sits right of centre, leaving the left column to the copy.
        // On phones it sits left and high, leaving room for the labels on the right and the copy below.
        const fh = 1000 / camera.aspect;
        if (wide) camera.setViewOffset(1000, fh, -150, 0, 1000, fh);
        else camera.setViewOffset(1000, fh, 130, fh * 0.1, 1000, fh);
        renderer.render(scene, camera);

        // Residence labels pinned to the right edge of their floor.
        const show = span(p, 0.76, 0.86);
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

        if (visible && (Math.abs(target - current) > 0.0005 || Math.abs(pointerX - px) > 0.001 || Math.abs(pointerY - py) > 0.001 || span(p, 0.72, 1) > 0)) raf = requestAnimationFrame(frame);
      };
      const kick = () => {
        if (!raf && visible) raf = requestAnimationFrame(frame);
      };
      const io = new IntersectionObserver(([e]) => {
        visible = e.isIntersecting;
        kick();
      });
      io.observe(section);
      const wake = window.setInterval(kick, 120);
      teardown = () => {
        window.clearInterval(wake);
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
          boot().catch(() => setFailed(true));
        }
      },
      { rootMargin: "120% 0px" },
    );
    near.observe(section);

    return () => {
      disposed = true;
      near.disconnect();
      off();
      window.removeEventListener("pointermove", onPointer);
      if (raf) cancelAnimationFrame(raf);
      teardown?.();
    };
  }, [reduced, failed, chapters.length]);

  if (reduced || failed)
    return (
      <section className="bg-navy text-ivory">
        <div className="mx-auto max-w-[1320px] px-4 py-20 md:px-8">
          <h2 className="max-w-[760px] text-[36px] leading-tight text-ivory md:text-[48px]">{heading}</h2>
          <ol className="mt-10 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {chapters.map((c) => (
              <li key={c.title}>
                <p className="np-eyebrow text-[#D9C59C]">{c.eyebrow}</p>
                <h3 className="mt-2 text-[26px] leading-tight text-ivory">{c.title}</h3>
                <p className="mt-2 text-[15px] text-ivory/75">{c.body}</p>
              </li>
            ))}
          </ol>
          <ul className="mt-12 grid gap-3 md:grid-cols-3">
            {picks.map((k) => (
              <li key={k.href}>
                <Link href={k.href} className="block rounded-2xl border border-ivory/15 p-5 hover:border-[#E79A7F]">
                  <span className="block font-serif text-[22px] text-ivory">{k.title}</span>
                  <span className="block text-sm text-ivory/70">{k.meta}</span>
                  <span className="mt-2 block font-display font-semibold text-[#E79A7F]">{k.price}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    );

  return (
    <section ref={root} className="relative h-[420vh] bg-navy text-ivory" aria-label={heading}>
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_65%_40%,rgba(169,198,216,.16),transparent_60%)]" aria-hidden />
        <canvas ref={canvas} className="absolute inset-0 h-full w-full" aria-hidden />

        {/* Copy column */}
        <div className="pointer-events-none relative mx-auto flex h-full max-w-[1320px] flex-col justify-end px-4 pb-24 md:px-8 lg:justify-center lg:pb-0">
          <h2 className="sr-only">{heading}</h2>
          <div className="relative h-[220px] max-w-[440px] lg:h-[300px]">
            {chapters.map((c, i) => (
              <div key={c.title} ref={(el) => void (chapterEls.current[i] = el)} className="absolute inset-x-0 bottom-0 lg:top-0" style={{ opacity: i === 0 ? 1 : 0 }}>
                <p className="np-eyebrow text-[12px] tracking-[0.2em] text-[#D9C59C]">{c.eyebrow}</p>
                <h3 className="mt-3 text-[34px] leading-[1.05] text-ivory sm:text-[44px] lg:text-[56px]">{c.title}</h3>
                <p className="mt-4 max-w-[400px] text-[16px] leading-relaxed text-ivory/80">{c.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 flex items-center gap-3" aria-hidden>
            {chapters.map((c, i) => (
              <span key={c.title} ref={(el) => void (dots.current[i] = el)} className="np-chapter-dot h-[2px] w-10 bg-ivory/20 transition-colors duration-500" />
            ))}
            <span className="ml-3 font-display text-[12px] font-semibold uppercase tracking-[0.24em] text-ivory/60">
              <span ref={floorTag}>00</span> / {String(FLOORS).padStart(2, "0")}
            </span>
          </div>
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
            <span className="h-px w-4 bg-[#E79A7F] sm:w-14" aria-hidden />
            <span className="rounded-xl border border-ivory/15 bg-[#162638]/85 px-3 py-2 sm:px-4 sm:py-3 shadow-[0_18px_40px_rgba(0,0,0,.35)] backdrop-blur-md transition-colors group-hover:border-[#E79A7F]">
              <span className="block max-w-[150px] truncate font-serif text-[16px] leading-tight text-ivory sm:max-w-[240px] sm:text-[20px]">{k.title}</span>
              <span className="hidden text-[12px] text-ivory/70 sm:block">{k.meta}</span>
              <span className="mt-1 block font-display text-[14px] font-semibold text-[#E79A7F]">
                {k.price} <span className="font-normal text-ivory/70">· {cta} →</span>
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

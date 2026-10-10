"use client";

import { useEffect } from "react";
import { gsap, ScrollTrigger } from "./motion";

/**
 * Home-wide motion layer: inertial smooth scroll (Lenis) driving GSAP ScrollTrigger, plus three small
 * declarative effects used by the server-rendered sections:
 *  - [data-reveal]      fades/slides in when it enters the viewport (children stagger with data-reveal="stagger")
 *  - [data-parallax=n]  drifts n px against the scroll
 *  - [data-magnetic]    leans toward the cursor (buttons)
 * Nothing runs when the visitor prefers reduced motion: the page is fully readable without it.
 * Everything starts after first paint (requestIdleCallback, setTimeout fallback) so it never competes with the
 * hero for the main thread. The hero aurora is paused while the hero is off screen.
 */
export function HomeMotion() {
  // The aurora's blobs (CSS keyframes) stop animating whenever their hero is out of view.
  useEffect(() => {
    const auras = Array.from(document.querySelectorAll<HTMLElement>(".np-aura"));
    if (!auras.length || typeof IntersectionObserver === "undefined") return;
    const setPlaying = (aura: HTMLElement, on: boolean) => {
      const state = on ? "" : "paused";
      aura.style.animationPlayState = state;
      aura.querySelectorAll<HTMLElement>("i").forEach((b) => (b.style.animationPlayState = state));
      aura.classList.toggle("is-paused", !on);
    };
    const io = new IntersectionObserver((entries) => {
      for (const en of entries) setPlaying(en.target as HTMLElement, en.isIntersecting);
    });
    auras.forEach((a) => io.observe(a));
    const onVisibility = () => auras.forEach((a) => document.hidden && setPlaying(a, false));
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      auras.forEach((a) => setPlaying(a, true));
    };
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let stop: (() => void) | undefined;
    let cancelled = false;
    // Lenis (smooth scroll) is fetched in that idle slot too: it is not part of the home's first-load JS.
    const start = () => {
      void import("lenis").then(({ default: Lenis }) => {
        if (!cancelled) stop = initMotion(Lenis);
      });
    };
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
    let idle = 0;
    let timer = 0;
    // Two frames first (the hero is painted), then the first idle slot.
    const raf = requestAnimationFrame(() => {
      timer = window.setTimeout(() => {
        if (w.requestIdleCallback) idle = w.requestIdleCallback(start, { timeout: 2000 });
        else timer = window.setTimeout(start, 200);
      }, 0);
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
      if (idle) w.cancelIdleCallback?.(idle);
      stop?.();
    };
  }, []);
  return null;
}

function initMotion(Lenis: typeof import("lenis").default): () => void {
  document.documentElement.classList.add("np-motion");

  const lenis = new Lenis({ duration: 1.15, easing: (t) => 1 - Math.pow(1 - t, 4), smoothWheel: true });
  lenis.on("scroll", ScrollTrigger.update);
  const tick = (time: number) => lenis.raf(time * 1000);
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);
  // In-page anchors (#explorar…) glide instead of jumping.
  const onAnchor = (e: MouseEvent) => {
    const a = (e.target as HTMLElement).closest?.('a[href^="#"]') as HTMLAnchorElement | null;
    if (!a) return;
    const target = document.querySelector(a.getAttribute("href")!);
    if (target) {
      e.preventDefault();
      lenis.scrollTo(target as HTMLElement, { offset: -80 });
    }
  };
  document.addEventListener("click", onAnchor);

  const ctx = gsap.context(() => {
    gsap.utils.toArray<HTMLElement>("[data-parallax]").forEach((el) => {
      const d = Number(el.dataset.parallax) || 60;
      gsap.fromTo(el, { y: -d }, { y: d, ease: "none", scrollTrigger: { trigger: el.parentElement ?? el, start: "top bottom", end: "bottom top", scrub: true } });
    });
  });

  const magnets = Array.from(document.querySelectorAll<HTMLElement>("[data-magnetic]"));
  const cleanups = magnets.map((m) => {
    const move = (e: PointerEvent) => {
      const r = m.getBoundingClientRect();
      gsap.to(m, { x: (e.clientX - r.left - r.width / 2) * 0.25, y: (e.clientY - r.top - r.height / 2) * 0.3, duration: 0.5, ease: "power3.out" });
    };
    const leave = () => gsap.to(m, { x: 0, y: 0, duration: 0.8, ease: "elastic.out(1, 0.4)" });
    m.addEventListener("pointermove", move);
    m.addEventListener("pointerleave", leave);
    return () => {
      m.removeEventListener("pointermove", move);
      m.removeEventListener("pointerleave", leave);
    };
  });

  // [data-tilt]: cards lean a few degrees toward the pointer (fine pointers only).
  const fine = window.matchMedia("(pointer: fine)").matches;
  const tilts = fine ? Array.from(document.querySelectorAll<HTMLElement>("[data-tilt]")) : [];
  const tiltOff = tilts.map((el) => {
    const max = Number(el.dataset.tilt) || 6;
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      gsap.to(el, { rotateY: x * max, rotateX: -y * max, transformPerspective: 900, duration: 0.6, ease: "power3.out" });
    };
    const leave = () => gsap.to(el, { rotateY: 0, rotateX: 0, duration: 0.9, ease: "power3.out" });
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
    };
  });
  // [data-reveal]: a soft fade-and-lift, driven by an IntersectionObserver with a tiny threshold (not by ScrollTrigger:
  // on iOS Safari a scroll trigger that never fired left text invisible and a Taupe block empty — 035). Content is
  // visible by default; only blocks still below the fold are primed (.np-pre), and any of them that is ever on screen
  // is shown. A safety timer shows whatever is still primed after 6 s, so nothing can stay hidden.
  const revealIo = new IntersectionObserver(
    (entries) => {
      for (const en of entries) {
        if (!en.isIntersecting) continue;
        en.target.classList.add("is-in");
        revealIo.unobserve(en.target);
      }
    },
    { threshold: 0.01, rootMargin: "0px 0px -4% 0px" },
  );
  document.querySelectorAll<HTMLElement>("[data-reveal]").forEach((el) => {
    if (el.getBoundingClientRect().top < window.innerHeight) return;
    el.classList.add("np-pre");
    revealIo.observe(el);
  });
  const revealSafety = window.setTimeout(() => document.querySelectorAll(".np-pre:not(.is-in)").forEach((el) => el.classList.add("is-in")), 6000);
  // [data-count="62"]: numbers count up once, when they come into view.
  const io = new IntersectionObserver(
    (entries) => {
      for (const en of entries) {
        if (!en.isIntersecting) continue;
        const el = en.target as HTMLElement;
        io.unobserve(el);
        if (el.dataset.unveil !== undefined) {
          el.classList.add("is-in");
          continue;
        }
        const to = Number(el.dataset.count) || 0;
        const o = { v: 0 };
        gsap.to(o, { v: to, duration: 1.6, ease: "power2.out", onUpdate: () => void (el.textContent = Math.round(o.v).toLocaleString(document.documentElement.lang || "es")) });
      }
    },
    { threshold: 0.3 },
  );
  document.querySelectorAll("[data-count], [data-unveil]").forEach((el) => io.observe(el));

  // Late layout shifts (fonts, images, the lazy map) move every trigger: recompute once things settle.
  const refresh = () => ScrollTrigger.refresh();
  window.addEventListener("load", refresh);
  const t = window.setTimeout(refresh, 1200);

  return () => {
    document.documentElement.classList.remove("np-motion");
    document.removeEventListener("click", onAnchor);
    window.removeEventListener("load", refresh);
    window.clearTimeout(t);
    cleanups.forEach((c) => c());
    tiltOff.forEach((c) => c());
    io.disconnect();
    revealIo.disconnect();
    window.clearTimeout(revealSafety);
    document.querySelectorAll(".np-pre").forEach((el) => el.classList.remove("np-pre", "is-in"));
    ctx.revert();
    gsap.ticker.remove(tick);
    lenis.destroy();
  };
}

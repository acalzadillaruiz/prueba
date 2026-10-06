"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { gsap, ScrollTrigger } from "./motion";

/**
 * Home-wide motion layer: inertial smooth scroll (Lenis) driving GSAP ScrollTrigger, plus three small
 * declarative effects used by the server-rendered sections:
 *  - [data-reveal]      fades/slides in when it enters the viewport (children stagger with data-reveal="stagger")
 *  - [data-parallax=n]  drifts n px against the scroll
 *  - [data-magnetic]    leans toward the cursor (buttons)
 * Nothing runs when the visitor prefers reduced motion: the page is fully readable without it.
 */
export function HomeMotion() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
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
      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
        const items = el.dataset.reveal === "stagger" ? Array.from(el.children) : [el];
        gsap.from(items, {
          y: 42,
          opacity: 0,
          duration: 1.1,
          ease: "power3.out",
          stagger: 0.09,
          scrollTrigger: { trigger: el, start: "top 86%", once: true },
        });
      });
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
      ctx.revert();
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  }, []);
  return null;
}

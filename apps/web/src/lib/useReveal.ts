"use client";

import { useEffect } from "react";

/**
 * Soft reveals on scroll (043-C), no animation library. Blocks marked [data-reveal] (or the first children of
 * [data-reveal="stagger"]) start at opacity 0 / translateY(16px) and settle in 500 ms with cubic-bezier(.2,.7,.2,1),
 * children 80 ms apart (three at most; the rest come with the third). Once per element, never hidden again.
 * Content is visible by default: the hiding class (.js-reveal on <html>) is only added here, on the client, and never
 * under prefers-reduced-motion — so a page without JS, or a visitor who asked for less motion, sees everything.
 */
export function useReveal() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || typeof IntersectionObserver === "undefined") return;
    const root = document.documentElement;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.classList.add("is-in");
          io.unobserve(e.target);
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" },
    );
    const watch = () => document.querySelectorAll("[data-reveal]:not(.is-in)").forEach((el) => io.observe(el));
    // Anything already on screen when the script runs is marked in before the class can hide it (no flash).
    document.querySelectorAll<HTMLElement>("[data-reveal]").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.top < innerHeight * 0.9 && r.bottom > 0) el.classList.add("is-in");
    });
    root.classList.add("js-reveal");
    watch();
    // Client navigations bring new blocks: keep watching.
    const mo = new MutationObserver(watch);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, []);
}

/** Mount once per page (server pages render it as a leaf). */
export function RevealRoot() {
  useReveal();
  return null;
}

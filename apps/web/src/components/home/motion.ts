"use client";

import { useEffect, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export { gsap, ScrollTrigger };

/** True when the visitor asked the OS for less motion: every scroll scene falls back to its static layout. */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return reduced;
}

/** 0→1 progress of `p` between `a` and `b`, clamped. */
export const span = (p: number, a: number, b: number) => Math.min(1, Math.max(0, (p - a) / (b - a)));

/** Gentle ease used by all scrubbed scenes (fast start, long soft landing). */
export const ease = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Calls `onProgress(0..1)` while the tall `el` scrolls past the viewport (its sticky child stays pinned).
 * Returns the cleanup. No React state on purpose: scenes write styles straight to their nodes.
 */
export function scrubSection(el: HTMLElement, onProgress: (p: number) => void, range: { start: string; end: string } = { start: "top top", end: "bottom bottom" }) {
  const st = ScrollTrigger.create({
    trigger: el,
    ...range,
    onUpdate: (s) => onProgress(s.progress),
    onRefresh: (s) => onProgress(s.progress),
  });
  onProgress(st.progress);
  return () => st.kill();
}

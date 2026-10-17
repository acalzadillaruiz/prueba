"use client";

import { useEffect, type RefObject } from "react";

/**
 * 051-G · 8 — one sideways trackpad gesture = one photo.
 *
 * A full-width scroll-snap strip (a 1440 px gallery, a card) snaps back to where it was when a sideways gesture
 * covers less than half a slide, so on a Mac trackpad it "does not move". This listens to the wheel ONLY when the
 * gesture is clearly sideways (|deltaX| > |deltaY|): it pages to the next or previous slide and swallows the rest of
 * that gesture. Vertical gestures are never touched (no preventDefault), so the page always scrolls.
 */
export function wheelPager(el: HTMLElement): () => void {
  let acc = 0;
  let last = 0; // time of the previous sideways wheel event
  let paged = false; // this gesture already turned a page
  const on = (e: WheelEvent) => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return; // vertical: the page scrolls, untouched
    const max = el.scrollWidth - el.clientWidth;
    if (max <= 0) return;
    const now = performance.now();
    const dir = Math.sign(e.deltaX);
    const at = el.scrollLeft;
    // At either end, let the gesture go (overscroll-behavior-x: contain still stops the browser's back gesture).
    if ((dir < 0 && at <= 0) || (dir > 0 && at >= max - 1)) return;
    e.preventDefault();
    // A pause of 160 ms ends a gesture; until then (momentum included) it turns at most one page.
    if (now - last > 160) { paged = false; acc = 0; }
    last = now;
    if (paged) return;
    acc += e.deltaX;
    if (Math.abs(acc) < 24) return;
    const w = el.clientWidth;
    const i = Math.round(at / Math.max(1, w)) + dir;
    paged = true;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left: Math.max(0, Math.min(max, i * w)), behavior: reduce ? "auto" : "smooth" });
  };
  el.addEventListener("wheel", on, { passive: false });
  return () => el.removeEventListener("wheel", on);
}

export function useWheelPager(ref: RefObject<HTMLElement | null>, enabled = true) {
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    return wheelPager(el);
  }, [ref, enabled]);
}

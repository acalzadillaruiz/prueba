"use client";

import { useEffect, useState } from "react";

/**
 * Scroll-aware chrome: `true` while the reader scrolls down (past `from` px), `false` again as soon as they scroll
 * up, return near the top or (with `idleMs`) stop scrolling for a moment. Small jitters (< `slack` px) are ignored,
 * so the bars don't flicker on momentum scrolling. Disabled (`enabled = false`) it always returns `false`.
 */
export function useHideOnScroll({ enabled = true, from = 120, slack = 10, idleMs }: { enabled?: boolean; from?: number; slack?: number; idleMs?: number } = {}) {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    if (!enabled) {
      setHidden(false);
      return;
    }
    let anchor = window.scrollY;
    let frame = 0;
    let idle = 0;
    const read = () => {
      frame = 0;
      const y = Math.max(0, window.scrollY);
      if (y < from) {
        anchor = y;
        setHidden(false);
        return;
      }
      const dy = y - anchor;
      if (Math.abs(dy) < slack) return;
      setHidden(dy > 0);
      anchor = y;
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(read);
      if (idleMs) {
        window.clearTimeout(idle);
        idle = window.setTimeout(() => setHidden(false), idleMs);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
      window.clearTimeout(idle);
    };
  }, [enabled, from, slack, idleMs]);
  return enabled && hidden;
}

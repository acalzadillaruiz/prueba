"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * A native horizontal carousel (048-A). The browser does the scrolling: scroll-snap on a plain overflow-x track, so a
 * vertical wheel or swipe always moves the page and a sideways trackpad gesture or swipe moves the track. No wheel or
 * touch listeners, no pinning, no scroll-linked transforms. The arrows scroll by one card plus the gap and switch off
 * at either end; a counter («01 / 06») and a thin progress bar say where you are; «Desliza» on touch screens.
 */
export function RailTrack({
  label,
  count,
  prevLabel,
  nextLabel,
  hint,
  className,
  children,
}: {
  label: string;
  count: number;
  prevLabel: string;
  nextLabel: string;
  hint: string;
  className?: string;
  children: React.ReactNode;
}) {
  const track = useRef<HTMLUListElement>(null);
  const [state, setState] = useState({ index: 0, atStart: true, atEnd: count <= 1, progress: count > 0 ? 1 / count : 1 });

  const measure = useCallback(() => {
    const el = track.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const first = el.children[0] as HTMLElement | undefined;
    const step = first ? first.getBoundingClientRect().width + parseFloat(getComputedStyle(el).columnGap || "0") : el.clientWidth;
    const index = Math.min(count - 1, Math.max(0, Math.round(el.scrollLeft / Math.max(1, step))));
    setState({
      index,
      atStart: el.scrollLeft <= 2,
      atEnd: el.scrollLeft >= max - 2,
      progress: max > 0 ? Math.min(1, (el.clientWidth + el.scrollLeft) / el.scrollWidth) : 1,
    });
  }, [count]);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    measure();
    el.addEventListener("scroll", measure, { passive: true });
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", measure);
      ro.disconnect();
    };
  }, [measure]);

  const go = (dir: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    const first = el.children[0] as HTMLElement | undefined;
    const step = first ? first.getBoundingClientRect().width + parseFloat(getComputedStyle(el).columnGap || "0") : el.clientWidth;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * step, behavior: reduce ? "auto" : "smooth" });
  };

  const pad = (n: number) => String(n).padStart(2, "0");
  const arrow =
    "flex h-12 w-12 items-center justify-center rounded-full border border-ink/15 bg-white text-ink transition-[background-color,opacity] duration-np ease-np hover:bg-[#DCE8F2] disabled:cursor-default disabled:opacity-35 disabled:hover:bg-white";

  return (
    <div className={className}>
      <ul
        ref={track}
        aria-label={label}
        tabIndex={0}
        className="np-rail no-scrollbar flex gap-5 overflow-x-auto [padding-inline:clamp(20px,6vw,96px)] [scroll-padding-inline:clamp(20px,6vw,96px)] md:gap-7"
      >
        {children}
      </ul>
      <div className="np-gutter mx-auto mt-8 flex max-w-[1280px] box-content items-center gap-5">
        <span className="np-num shrink-0 text-[15px] text-muted" aria-live="polite">
          {pad(state.index + 1)} / {pad(count)}
        </span>
        <span aria-hidden className="relative h-[2px] flex-1 overflow-hidden rounded-full bg-ink/10">
          <span className="absolute inset-y-0 left-0 rounded-full bg-[#5B8DB8] transition-[width] duration-np ease-np" style={{ width: `${state.progress * 100}%` }} />
        </span>
        <span className="text-[15px] text-muted [@media(hover:hover)_and_(pointer:fine)]:hidden">{hint}</span>
        <span className="hidden gap-2 [@media(hover:hover)_and_(pointer:fine)]:flex">
          <button type="button" className={cn(arrow)} aria-label={prevLabel} disabled={state.atStart} onClick={() => go(-1)}>
            <ArrowLeft size={18} aria-hidden />
          </button>
          <button type="button" className={cn(arrow)} aria-label={nextLabel} disabled={state.atEnd} onClick={() => go(1)}>
            <ArrowRight size={18} aria-hidden />
          </button>
        </span>
      </div>
    </div>
  );
}

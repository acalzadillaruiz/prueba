"use client";

import { useEffect, useRef, useState, type ReactNode, type Ref } from "react";
import { cn } from "@/lib/cn";

/**
 * Horizontally scrolling box for wide tables: a named region that takes keyboard focus while it actually scrolls
 * (axe "scrollable-region-focusable": arrow keys move it), with soft fades on the edge(s) that hide more columns.
 * `className` styles the outer frame (card, `hidden md:block`…); `fade={false}` for tables whose last column is
 * already sticky (np-sticky-last) so the fade never washes over the actions.
 */
export function ScrollRegion({ label, className, fade = true, children, scrollRef }: { label: string; className?: string; fade?: boolean; children: ReactNode; /** The scrolling element (e.g. to scroll a calendar to "now"). */ scrollRef?: Ref<HTMLDivElement> }) {
  const inner = useRef<HTMLDivElement | null>(null);
  const [edge, setEdge] = useState({ l: false, r: false });
  useEffect(() => {
    const el = inner.current;
    if (!el) return;
    const update = () => {
      const max = el.scrollWidth - el.clientWidth;
      setEdge((cur) => {
        const next = { l: el.scrollLeft > 1, r: el.scrollLeft < max - 1 };
        return cur.l === next.l && cur.r === next.r ? cur : next;
      });
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
    ro?.observe(el);
    if (el.firstElementChild) ro?.observe(el.firstElementChild);
    return () => {
      el.removeEventListener("scroll", update);
      ro?.disconnect();
    };
  }, []);
  const scrollable = edge.l || edge.r;
  const setRef = (node: HTMLDivElement | null) => {
    inner.current = node;
    if (typeof scrollRef === "function") scrollRef(node);
    else if (scrollRef) (scrollRef as { current: HTMLDivElement | null }).current = node;
  };
  return (
    <div className={cn("relative overflow-hidden", className)} data-scroll-region>
      <div
        ref={setRef}
        role="region"
        aria-label={label}
        tabIndex={scrollable ? 0 : undefined}
        className="overflow-x-auto overscroll-x-contain rounded-[inherit] scrollbar-thin focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-navy dark:focus-visible:outline-[#C9A574]"
      >
        {children}
      </div>
      {fade && (
        <>
          <span aria-hidden className={cn("pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-white to-transparent transition-opacity duration-np dark:from-navy-card", edge.l ? "opacity-100" : "opacity-0")} />
          <span aria-hidden className={cn("pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-white to-transparent transition-opacity duration-np dark:from-navy-card", edge.r ? "opacity-100" : "opacity-0")} />
        </>
      )}
    </div>
  );
}

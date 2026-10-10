"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Renders its children only once the box nears the viewport. Used for the illustrated maps (hundreds of SVG nodes):
 * they stay out of the server HTML and of hydration, so the page paints and becomes interactive sooner.
 * The box keeps its size (className) meanwhile, so nothing shifts when the map appears.
 */
export function LazyMount({ className, children, loadingLabel = "Cargando el mapa…" }: { className?: string; children: ReactNode; loadingLabel?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      setShow(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShow(true);
          io.disconnect();
        }
      },
      { rootMargin: "300px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={cn("relative overflow-hidden bg-[#E9E2D5]", className)}>
      {show ? (
        children
      ) : (
        // Until the map mounts (037b): a quiet map-like texture and a label, never a plain empty block.
        <div aria-hidden className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle,rgb(28_29_29/.13)_1px,transparent_1.4px)] [background-size:16px_16px]">
          <span className="rounded-full bg-white/70 px-3 py-1 font-display text-[13px] text-muted">{loadingLabel}</span>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Renders its children only once the box nears the viewport. Used for the illustrated maps (hundreds of SVG nodes):
 * they stay out of the server HTML and of hydration, so the page paints and becomes interactive sooner.
 * The box keeps its size (className) meanwhile, so nothing shifts when the map appears.
 */
export function LazyMount({ className, children }: { className?: string; children: ReactNode }) {
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
    <div ref={ref} className={cn("relative overflow-hidden bg-[#DCDFE2]", className)}>
      {show && children}
    </div>
  );
}

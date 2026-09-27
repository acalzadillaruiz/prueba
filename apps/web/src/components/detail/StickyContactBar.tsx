"use client";

import { useEffect, useState } from "react";
import { CalendarCheck, MessageSquare } from "lucide-react";
import type { Locale } from "@/types/domain";
import { tx } from "@/lib/i18n";
import { cn } from "@/lib/cn";

/**
 * Mobile-only bottom bar on the listing detail: price + "Request a tour" that jumps to the contact panel.
 * Hidden while the panel itself or the footer is on screen, so it never covers them.
 */
export function StickyContactBar({ locale, price, suffix, tour, dark }: { locale: Locale; price: string; suffix: string; tour: boolean; dark?: boolean }) {
  const [shown, setShown] = useState(true);
  useEffect(() => {
    const targets = [document.getElementById("contact"), document.querySelector("footer")].filter((el): el is HTMLElement => !!el);
    if (!targets.length || typeof IntersectionObserver === "undefined") return;
    const visible = new Set<Element>();
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) visible.add(e.target);
        else visible.delete(e.target);
      }
      setShown(visible.size === 0);
    });
    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, []);
  const go = () => {
    const box = document.getElementById("contact");
    if (!box) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    box.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    // Move keyboard / screen-reader focus to the panel without a second scroll jump.
    document.getElementById("contact-panel")?.focus({ preventScroll: true });
  };
  return (
    <div
      data-sticky-cta={shown ? "shown" : "hidden"}
      aria-hidden={!shown}
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t px-4 pt-3 shadow-np transition-transform duration-np ease-out md:hidden print:hidden",
        dark ? "border-navy-line bg-navy text-ivory" : "border-line bg-white text-ink",
        !shown && "pointer-events-none translate-y-full",
      )}
      style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
    >
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1 font-display text-xl font-bold leading-tight">
          {price}
          <span className={cn("text-sm font-normal", dark ? "text-mist" : "text-ink/65")}>{suffix}</span>
        </div>
        <button onClick={go} tabIndex={shown ? 0 : -1} className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-np bg-coral-cta px-4 font-display text-sm font-medium text-white hover:bg-coral-cta-hover">
          {tour ? <CalendarCheck size={16} aria-hidden /> : <MessageSquare size={16} aria-hidden />}
          {tour ? tx(locale, "Pedir visita", "Request a tour") : tx(locale, "Contactar", "Contact")}
        </button>
      </div>
    </div>
  );
}

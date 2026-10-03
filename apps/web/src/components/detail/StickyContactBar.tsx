"use client";

import { useEffect, useState } from "react";
import { CalendarCheck, MessageSquare } from "lucide-react";
import type { Locale } from "@/types/domain";
import { tx } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { WhatsAppIcon } from "@/components/brand/PublicChrome";

/**
 * Mobile-only bottom bar on the listing detail: price + "Request a tour" that jumps to the contact panel.
 * Hidden while the panel itself or the footer is on screen, so it never covers them.
 */
export function StickyContactBar({ locale, price, suffix, tour, dark, whatsapp, agentFirst }: { locale: Locale; price: string; suffix: string; tour: boolean; dark?: boolean; whatsapp?: string | null; agentFirst?: string }) {
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
  const label = tour ? tx(locale, "Pedir visita", "Request a tour") : tx(locale, "Contactar", "Contact");
  return (
    <div
      data-sticky-cta={shown ? "shown" : "hidden"}
      aria-hidden={!shown}
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t px-4 pt-3 shadow-[0_-10px_30px_rgba(22,38,56,.12)] transition-transform duration-np ease-out md:hidden print:hidden",
        dark ? "border-navy-line bg-navy text-ivory" : "border-line bg-white text-ink",
        !shown && "pointer-events-none translate-y-full",
      )}
      style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
    >
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1 font-serif text-[24px] font-semibold leading-tight">
          {price}
          <span className={cn("font-display text-sm font-normal", dark ? "text-mist" : "text-ink/60")}>{suffix}</span>
        </div>
        {whatsapp ? (
          <>
            {/* One terracotta action: WhatsApp with the advisor. The tour form stays one tap away (navy outline). */}
            <button onClick={go} tabIndex={shown ? 0 : -1} aria-label={label} className="np-btn-outline flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-[1.5px] border-navy text-navy">
              {tour ? <CalendarCheck size={18} aria-hidden /> : <MessageSquare size={18} aria-hidden />}
            </button>
            <a href={whatsapp} target="_blank" rel="noopener noreferrer" tabIndex={shown ? 0 : -1} className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-coral-cta px-4 font-display text-sm font-semibold text-white hover:bg-coral-cta-hover">
              <WhatsAppIcon size={17} /> WhatsApp
              {agentFirst && <span className="sr-only">{tx(locale, ` con ${agentFirst}`, ` ${agentFirst}`)}</span>}
            </a>
          </>
        ) : (
          <button onClick={go} tabIndex={shown ? 0 : -1} className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-coral-cta px-5 font-display text-sm font-semibold text-white hover:bg-coral-cta-hover">
            {tour ? <CalendarCheck size={16} aria-hidden /> : <MessageSquare size={16} aria-hidden />}
            {label}
          </button>
        )}
      </div>
    </div>
  );
}

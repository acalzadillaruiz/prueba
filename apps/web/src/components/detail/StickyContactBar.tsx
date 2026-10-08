"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarCheck, MessageSquare, Scale } from "lucide-react";
import type { Locale } from "@/types/domain";
import { tx } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { WhatsAppIcon } from "@/components/brand/PublicChrome";
import { useApp } from "@/lib/store";
import { compareHref } from "@/components/compare/CompareTray";
import { useListingWhatsApp } from "./useListingWhatsApp";

/** Short price for narrow bars: "USD 265k" / "USD 1,2 M" (es), "$265k" / "$1.2M" (en). Never cut with an ellipsis. */
export function compactPrice(amount: number, locale: Locale) {
  const es = locale === "es";
  const pre = es ? "USD " : "$";
  const fmt = (n: number, digits: number) => new Intl.NumberFormat(es ? "es-VE" : "en-US", { maximumFractionDigits: digits }).format(n);
  if (amount >= 1_000_000) return `${pre}${fmt(amount / 1_000_000, amount >= 10_000_000 ? 0 : 1)}${es ? " M" : "M"}`;
  if (amount >= 10_000) return `${pre}${fmt(Math.round(amount / 1000), 0)}k`;
  if (amount >= 1000) return `${pre}${fmt(amount / 1000, 1)}k`;
  return `${pre}${fmt(amount, 0)}`;
}

/**
 * Mobile-only bottom bar on the listing detail: price + "Request a tour" that jumps to the contact panel.
 * Hidden while the panel itself or the footer is on screen, so it never covers them. On listing pages it also carries the
 * comparator (a slim chip on top) instead of a floating tray over the form, and the floating contact buttons stay
 * hidden while it is up ([data-hide-fab-mobile]).
 */
export function StickyContactBar({ locale, price, amount, meta, suffix, tour, dark, whatsapp: waBase, agentFirst }: { locale: Locale; price: string; /** Raw amount: lets the bar fall back to "USD 265k" when the full price doesn't fit. */ amount?: number; /** Second line, e.g. "Venta · 160 m²". */ meta?: string; suffix: string; tour: boolean; dark?: boolean; whatsapp?: string | null; agentFirst?: string }) {
  // Prefilled WhatsApp text carries this listing's URL.
  const whatsapp = useListingWhatsApp(waBase);
  const { compare } = useApp();
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
  // The price is never truncated: if the full figure doesn't fit the space left by the buttons, show the compact one.
  const box = useRef<HTMLDivElement>(null);
  const probe = useRef<HTMLSpanElement>(null);
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    if (amount == null || !box.current || !probe.current || typeof ResizeObserver === "undefined") return;
    const fit = () => setCompact(!!box.current && !!probe.current && probe.current.offsetWidth > box.current.clientWidth);
    const ro = new ResizeObserver(fit);
    ro.observe(box.current);
    fit();
    return () => ro.disconnect();
  }, [amount, price, suffix]);
  const shownPrice = compact && amount != null ? compactPrice(amount, locale) : price;
  const label = tour ? tx(locale, "Pedir visita", "Request a tour") : tx(locale, "Contactar", "Contact");
  const short = tour ? tx(locale, "Visitar", "Visit") : tx(locale, "Contactar", "Contact");
  return (
    <div
      data-sticky-cta={shown ? "shown" : "hidden"}
      data-hide-fab-mobile
      aria-hidden={!shown}
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t px-4 pt-3 shadow-[0_-10px_30px_rgba(30,26,24,.12)] transition-transform duration-np ease-out md:hidden print:hidden",
        dark ? "border-navy-line bg-navy text-ivory" : "border-line bg-white text-ink",
        !shown && "pointer-events-none translate-y-full",
      )}
      style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
    >
      {compare.length > 0 && (
        <Link
          href={compareHref(locale, compare)}
          tabIndex={shown ? 0 : -1}
          data-compare-chip
          className={cn(
            "-mt-1 mb-2.5 flex min-h-9 items-center gap-2 rounded-full px-3 font-display text-[13px] font-semibold",
            dark ? "bg-white/10 text-ivory" : "bg-[#F1EBE3] text-ink",
          )}
        >
          <Scale size={14} aria-hidden className={dark ? "text-[#D4B98C]" : "text-[#8E3B22]"} />
          <span className="flex-1">{tx(locale, `Comparando ${compare.length} de 3`, `Comparing ${compare.length} of 3`)}</span>
          <span className="inline-flex items-center gap-1 underline-offset-4">{tx(locale, "Ver comparación", "View comparison")} <ArrowRight size={14} aria-hidden /></span>
        </Link>
      )}
      <div className="flex items-center gap-2">
        <div ref={box} className="relative min-w-0 flex-1">
          {/* Off-screen copy of the full price + suffix, measured to decide whether the compact figure is needed. */}
          <span ref={probe} aria-hidden className="pointer-events-none invisible absolute left-0 top-0 whitespace-nowrap font-serif text-[clamp(19px,5.6vw,24px)] font-semibold leading-tight">
            {price}
            <span className="font-display text-sm font-normal">{suffix}</span>
          </span>
          <div className="whitespace-nowrap font-serif text-[clamp(19px,5.6vw,24px)] font-semibold leading-tight" data-sticky-price>
            {compact && <span className="sr-only">{price}{suffix}</span>}
            <span aria-hidden={compact || undefined}>{shownPrice}</span>
            <span aria-hidden={compact || undefined} className={cn("font-display text-sm font-normal", dark ? "text-mist" : "text-muted")}>{suffix}</span>
          </div>
          {meta && <div className={cn("truncate font-display text-[13px] leading-snug", dark ? "text-mist" : "text-muted")}>{meta}</div>}
        </div>
        {whatsapp ? (
          <>
            {/* One terracotta action: WhatsApp with the advisor. The tour form stays one tap away (navy outline). */}
            <button onClick={go} tabIndex={shown ? 0 : -1} className={cn("np-btn-outline inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-full border-[1.5px] px-3.5 font-display text-sm font-semibold max-[399px]:px-0", dark ? "border-ivory text-ivory" : "border-navy text-navy")}>
              {tour ? <CalendarCheck size={17} aria-hidden /> : <MessageSquare size={17} aria-hidden />}
              <span className="max-[399px]:sr-only">{short}</span>
              {tour && <span className="sr-only">{tx(locale, ": pedir visita", ": request a tour")}</span>}
            </button>
            <a href={whatsapp} target="_blank" rel="noopener noreferrer" tabIndex={shown ? 0 : -1} className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-full bg-coral-cta px-3.5 font-display text-sm font-semibold text-white hover:bg-coral-cta-hover max-[399px]:px-0">
              <WhatsAppIcon size={17} /> <span className="max-[399px]:sr-only">WhatsApp</span>
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

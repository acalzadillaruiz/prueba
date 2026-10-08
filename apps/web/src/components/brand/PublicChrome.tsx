"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { Heart, Home, Map as MapIcon, MessageCircle, Phone, PhoneCall, ShieldCheck, User, X } from "lucide-react";
import type { Locale } from "@/types/domain";
import type { OnCallAdvisor } from "@/lib/on-call";
import { Avatar } from "@/components/ui";
import { useApp } from "@/lib/store";
import { api } from "@/lib/api";
import { msg, tx } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { RoofGlyph } from "./Logo";

/** WhatsApp glyph (outline, currentColor). */
export function WhatsAppIcon({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden fill="currentColor">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.9-4.45 9.9-9.91A9.85 9.85 0 0 0 12.04 2Zm.01 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.23 8.23 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24a8.2 8.2 0 0 1 8.24 8.25c0 4.54-3.7 8.23-8.24 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.43.13-.15.17-.25.25-.42.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48a.92.92 0 0 0-.67.31c-.23.25-.87.85-.87 2.07 0 1.22.89 2.4 1.02 2.57.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.1-.23-.16-.48-.29Z" />
    </svg>
  );
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Guardia 24/7 dialog: today's on-call advisor per verified agency (Caracas weekday), with a visible phone number
 * (`tel:`) and WhatsApp. On a listing, that listing's agency comes first. Accessible modal: labelled, focus kept
 * inside, Esc / backdrop close, focus returns to the trigger. Portalled to <body> so no transformed parent clips it.
 */
export function OnCallDialog({ locale, listingSlug, onClose }: { locale: Locale; listingSlug?: string; onClose: () => void }) {
  const panel = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descId = useId();
  const q = useQuery({
    queryKey: ["on-call", listingSlug ?? ""],
    queryFn: () => api<{ advisors: OnCallAdvisor[] }>(`on-call${listingSlug ? `?listing=${encodeURIComponent(listingSlug)}` : ""}`),
    staleTime: 5 * 60_000,
  });
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panel.current) return;
      const items = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || !panel.current.contains(document.activeElement))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (document.activeElement === last || !panel.current.contains(document.activeElement))) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      prev?.focus?.();
    };
  }, [onClose]);
  const list = q.data?.advisors ?? [];
  const ring = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy";
  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-[#1E1A18]/55 p-0 sm:items-center sm:p-6 print:hidden" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="np-in max-h-[88vh] w-full overflow-y-auto rounded-t-[24px] bg-ivory p-6 text-ink shadow-[0_24px_60px_rgba(30,26,24,.25)] sm:max-w-[480px] sm:rounded-[24px]"
        style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="np-eyebrow text-gold-text">{tx(locale, "Guardia 24/7", "24/7 on-call")}</div>
            <h2 id={titleId} className="mt-1 font-serif text-[28px] font-medium leading-tight text-navy">{tx(locale, "Asesores de guardia hoy", "Advisors on call today")}</h2>
          </div>
          <button ref={closeBtn} type="button" onClick={onClose} aria-label={tx(locale, "Cerrar", "Close")} className={cn("-mr-2 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-navy hover:bg-navy/5", ring)}>
            <X size={20} aria-hidden />
          </button>
        </div>
        <p id={descId} className="mt-2 text-[15px] text-muted">
          {tx(locale, "Cada agencia tiene un asesor de guardia todos los días, también fines de semana. Llámalo o escríbele por WhatsApp.", "Each agency has an advisor on call every day, weekends included. Call or message them on WhatsApp.")}
        </p>
        {q.isLoading && (
          <div className="mt-5 space-y-3" aria-label={tx(locale, "Cargando…", "Loading…")}>
            {[0, 1].map((i) => <div key={i} className="np-skeleton h-[124px] rounded-2xl" />)}
          </div>
        )}
        {q.isError && (
          <div role="alert" className="mt-5 rounded-xl bg-[#B3261E1A] px-3.5 py-2.5 text-sm text-danger">
            {tx(locale, "No pudimos cargar la guardia. ", "We couldn’t load the on-call rota. ")}
            <button type="button" onClick={() => q.refetch()} className={cn("font-semibold underline underline-offset-4", ring)}>{tx(locale, "Reintentar", "Retry")}</button>
          </div>
        )}
        {q.isSuccess && list.length === 0 && <p className="mt-5 rounded-2xl bg-white p-4 text-[15px] text-muted ring-1 ring-black/[.04]">{tx(locale, "Hoy ninguna agencia tiene guardia asignada. Escríbenos desde cualquier ficha y te responderán en horario de oficina.", "No agency has anyone on call today. Write from any listing and they’ll reply during office hours.")}</p>}
        {list.length > 0 && (
          <ul className="mt-5 space-y-3">
            {list.map((o, i) => (
              <li key={o.agency.id} className="rounded-2xl bg-white p-4 ring-1 ring-black/[.04]">
                <div className="flex items-center gap-3">
                  <Avatar initials={o.advisor.initials} hue={o.advisor.hue} size={48} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-[17px] font-semibold text-ink">
                      <span className="truncate">{o.advisor.name}</span>
                      {o.advisor.verified && <ShieldCheck size={15} className="shrink-0 text-ok" aria-label={tx(locale, "Verificado", "Verified")} />}
                    </div>
                    <div className="truncate text-sm text-muted">
                      {o.agency.name}
                      {listingSlug && i === 0 ? tx(locale, " · agencia de este inmueble", " · this listing’s agency") : ""}
                    </div>
                  </div>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {o.advisor.tel && o.advisor.phone && (
                    <a href={o.advisor.tel} className={cn("flex min-h-11 items-center justify-center gap-2 rounded-full border-[1.5px] border-navy px-4 font-display text-[15px] font-semibold text-navy hover:bg-navy/5", ring)}>
                      <Phone size={16} aria-hidden />
                      <span className="sr-only">{tx(locale, `Llamar a ${o.advisor.name}:`, `Call ${o.advisor.name}:`)}</span>
                      <span className="whitespace-nowrap [font-feature-settings:'lnum']">{o.advisor.phone}</span>
                    </a>
                  )}
                  {o.advisor.whatsapp && (
                    <a href={o.advisor.whatsapp} target="_blank" rel="noopener noreferrer" className={cn("flex min-h-11 items-center justify-center gap-2 rounded-full bg-navy px-4 font-display text-[15px] font-semibold text-ivory hover:bg-navy-2", ring)}>
                      <WhatsAppIcon size={18} /> WhatsApp
                      <span className="sr-only">{tx(locale, `con ${o.advisor.name} (se abre en una pestaña nueva)`, `${o.advisor.name} (opens in a new tab)`)}</span>
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-center text-sm text-muted">{tx(locale, "Guardia según el día en Caracas (UTC−4).", "Rota follows the day in Caracas (UTC−4).")}</p>
      </div>
    </div>,
    document.body,
  );
}

/** Opens the Guardia 24/7 dialog. Unstyled by default: callers pass the look (pill on the FAB, quiet link on a listing). */
export function OnCallButton({ locale, listingSlug, className, children, ...rest }: { locale: Locale; listingSlug?: string; className?: string; children: React.ReactNode } & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick" | "type">) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <>
      <button type="button" aria-haspopup="dialog" onClick={() => setOpen(true)} className={className} {...rest}>
        {children}
      </button>
      {open && <OnCallDialog locale={locale} listingSlug={listingSlug} onClose={close} />}
    </>
  );
}

/**
 * Floating contact button (brand: navy with a 2 px #C9A574 ring). Opens WhatsApp only when a real number exists;
 * otherwise it links to the contact flow. A quiet "Guardia 24/7" pill above it opens today's on-call advisors.
 * Sits above the mobile tab bar and hides while the footer or any [data-hide-fab] block (e.g. a contact panel)
 * (or, on phones, [data-hide-fab-mobile]) is on screen, so it never covers content.
 */
export function FloatingContact({ href, label, whatsapp = false, tabbar = false, locale: localeProp }: { href: string; label: string; whatsapp?: boolean; tabbar?: boolean; locale?: Locale }) {
  const pathname = usePathname();
  const locale: Locale = localeProp ?? (pathname?.startsWith("/en") ? "en" : "es");
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    // Phones also hide them over [data-hide-fab-mobile] blocks (the hero search spans the full width there).
    const phone = window.matchMedia("(max-width: 767px)").matches;
    const targets = [...document.querySelectorAll(phone ? "footer, [data-hide-fab], [data-hide-fab-mobile]" : "footer, [data-hide-fab]")];
    if (!targets.length || typeof IntersectionObserver === "undefined") return;
    const visible = new Set<Element>();
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) visible.add(e.target);
        else visible.delete(e.target);
      }
      setHidden(visible.size > 0);
    });
    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, []);
  const external = /^https?:/.test(href);
  return (
    <div
      aria-hidden={hidden || undefined}
      className={cn(
        "fixed right-4 z-40 flex flex-col items-end gap-3 transition-[opacity,transform] duration-300 md:bottom-8 md:right-8 print:hidden",
        tabbar ? "bottom-[calc(5.25rem+env(safe-area-inset-bottom))]" : "bottom-[calc(1rem+env(safe-area-inset-bottom))]",
        hidden && "pointer-events-none translate-y-3 opacity-0",
      )}
    >
      <OnCallButton
        locale={locale}
        tabIndex={hidden ? -1 : undefined}
        className="flex min-h-11 items-center gap-2 rounded-full bg-ivory/95 px-4 font-display text-sm font-semibold text-navy shadow-[0_0_0_1.5px_#1E1A18,0_10px_24px_rgba(30,26,24,.18)] backdrop-blur transition-colors duration-np hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
      >
        <PhoneCall size={16} strokeWidth={1.8} aria-hidden /> {tx(locale, "Guardia 24/7", "24/7 on-call")}
      </OnCallButton>
      <Link
        href={href}
        aria-label={label}
        title={label}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        tabIndex={hidden ? -1 : undefined}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-navy text-ivory shadow-[0_0_0_2px_#C9A574,0_14px_30px_rgba(30,26,24,.35)] hover:bg-navy-2"
      >
        {whatsapp ? <WhatsAppIcon size={24} /> : <MessageCircle size={23} aria-hidden />}
      </Link>
    </div>
  );
}

/** Phones: bottom tab bar (Inicio · Mapa · Guardados · Cuenta). The active item carries the roof glyph. */
export function MobileTabBar({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const { saved, user } = useApp();
  const t = msg(locale, "nav");
  const items = [
    { href: `/${locale}`, label: t("home"), Icon: Home, active: pathname === `/${locale}` },
    { href: `/${locale}/search?type=SALE`, label: t("map"), Icon: MapIcon, active: pathname.endsWith("/search") },
    { href: `/${locale}/saved`, label: t("saved"), Icon: Heart, active: pathname.endsWith("/saved"), badge: saved.length },
    { href: user ? `/${locale}/account` : `/${locale}/login`, label: t("account"), Icon: User, active: pathname.endsWith("/account") || pathname.endsWith("/login") },
  ];
  return (
    <nav
      data-tabbar
      aria-label={locale === "es" ? "Navegación inferior" : "Bottom navigation"}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ivory/95 backdrop-blur md:hidden print:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid grid-cols-4">
        {items.map(({ href, label, Icon, active, badge }) => (
          <li key={label}>
            <Link href={href} aria-current={active ? "page" : undefined} className={cn("relative flex h-16 flex-col items-center justify-center gap-1 font-display text-[13px]", active ? "text-ink" : "text-muted")}>
              {active && <RoofGlyph className="absolute top-1.5 h-[6px] w-[18px]" />}
              <span className="relative">
                <Icon size={21} strokeWidth={1.6} aria-hidden />
                {!!badge && <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-navy px-1 text-[10px] font-bold text-ivory">{badge}</span>}
              </span>
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

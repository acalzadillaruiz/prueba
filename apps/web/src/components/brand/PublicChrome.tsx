"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { Heart, Home, MessageCircle, Phone, PhoneCall, Search, ShieldCheck, User, X } from "lucide-react";
import { useHideOnScroll } from "./useScrollChrome";
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
 * (`tel:`) and WhatsApp. On a listing (`listingSlug`), only that listing's agency is shown. Accessible modal: labelled, focus kept
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
            <h2 id={titleId} className="mt-1 font-serif text-[28px] font-medium leading-tight text-navy">{tx(locale, "Hoy te atienden", "Here for you today")}</h2>
          </div>
          <button ref={closeBtn} type="button" onClick={onClose} aria-label={tx(locale, "Cerrar", "Close")} className={cn("-mr-2 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-navy hover:bg-navy/5", ring)}>
            <X size={20} aria-hidden />
          </button>
        </div>
        <p id={descId} className="mt-2 text-[15px] text-muted">
          {listingSlug
            ? tx(locale, "La agencia de esta casa tiene a alguien disponible todos los días, también los fines de semana. Llama o escribe por WhatsApp, sin compromiso.", "This home’s agency has someone available every day, weekends included. Call or send a WhatsApp, no strings attached.")
            : tx(locale, "Cada agencia tiene a alguien disponible todos los días, también los fines de semana. Llama o escribe por WhatsApp, sin compromiso.", "Every agency has someone available every day, weekends included. Call or send a WhatsApp, no strings attached.")}
        </p>
        {q.isLoading && (
          <div className="mt-5 space-y-3" aria-label={tx(locale, "Un momento…", "One moment…")}>
            {[0, 1].map((i) => <div key={i} className="np-skeleton h-[124px] rounded-2xl" />)}
          </div>
        )}
        {q.isError && (
          <div role="alert" className="mt-5 rounded-xl bg-[#B3261E1A] px-3.5 py-2.5 text-sm text-danger">
            {tx(locale, "No pudimos ver quién está de guardia. ", "We couldn’t check who’s on call. ")}
            <button type="button" onClick={() => q.refetch()} className={cn("font-semibold underline underline-offset-4", ring)}>{tx(locale, "Intentar de nuevo", "Try again")}</button>
          </div>
        )}
        {q.isSuccess && list.length === 0 && (
          <p className="mt-5 rounded-2xl bg-white p-4 text-[15px] text-muted ring-1 ring-black/[.04]">
            {listingSlug
              ? tx(locale, "Hoy no hay nadie de guardia en esta agencia. Escríbele desde esta página y te responde en horario de oficina.", "No one at this agency is on call today. Write from this page and they’ll reply during office hours.")
              : tx(locale, "Hoy no hay nadie de guardia. Escríbenos desde cualquier casa y te respondemos en horario de oficina.", "No one is on call today. Write to us from any home and we’ll reply during office hours.")}
          </p>
        )}
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
                      {listingSlug && i === 0 ? tx(locale, " · agencia de esta casa", " · this home’s agency") : ""}
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
        <p className="mt-4 text-center text-sm text-muted">{tx(locale, "La guardia sigue el horario de Caracas (UTC−4).", "On-call hours follow Caracas time (UTC−4).")}</p>
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
 * Floating contact: ONE round button (brand: Obsidiana with a 2 px Bronce ring). It opens a small menu with both ways
 * to reach a person: today's on-call advisor (Guardia 24/7 dialog: phone + WhatsApp) and the chat (WhatsApp when a real
 * number exists, otherwise the contact flow). Sits above the mobile tab bar, slides away while the reader scrolls
 * down (back on scroll-up or after a short pause), and hides while the footer or any [data-hide-fab] block (on phones
 * also [data-hide-fab-mobile]) is on screen, so it never covers content.
 */
export function FloatingContact({ href, label, whatsapp = false, tabbar = false, locale: localeProp }: { href: string; label: string; whatsapp?: boolean; tabbar?: boolean; locale?: Locale }) {
  const pathname = usePathname();
  const locale: Locale = localeProp ?? (pathname?.startsWith("/en") ? "en" : "es");
  const [covering, setCovering] = useState(false);
  const [open, setOpen] = useState(false);
  const [onCall, setOnCall] = useState(false);
  const closeOnCall = useCallback(() => setOnCall(false), []);
  const scrolledAway = useHideOnScroll({ from: 240, idleMs: 1400 });
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  useEffect(() => {
    // Phones also hide it over [data-hide-fab-mobile] blocks (the hero search spans the full width there).
    const phone = window.matchMedia("(max-width: 767px)").matches;
    const targets = [...document.querySelectorAll(phone ? "footer, [data-hide-fab], [data-hide-fab-mobile]" : "footer, [data-hide-fab]")];
    if (!targets.length || typeof IntersectionObserver === "undefined") return;
    const visible = new Set<Element>();
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) visible.add(e.target);
        else visible.delete(e.target);
      }
      setCovering(visible.size > 0);
    });
    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, []);
  const hidden = !open && (covering || scrolledAway);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      trigger.current?.focus();
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  const external = /^https?:/.test(href);
  // On a listing page the Guardia shows only that listing's agency (same as the contact panel's link).
  const listingSlug = pathname?.match(/^\/(?:es|en)\/listing\/([^/?#]+)/)?.[1];
  const item = "flex min-h-12 w-full items-center gap-3 rounded-2xl px-3 text-left font-display text-[15px] text-ink transition-colors hover:bg-black/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy";
  const glyph = "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink text-ivory";
  return (
    <div
      ref={root}
      data-fab
      aria-hidden={hidden || undefined}
      className={cn(
        "fixed right-4 z-40 flex flex-col items-end gap-3 transition-[opacity,transform] duration-300 md:bottom-8 md:right-8 print:hidden",
        tabbar ? "bottom-[calc(5.25rem+env(safe-area-inset-bottom))]" : "bottom-[calc(1rem+env(safe-area-inset-bottom))]",
        hidden && "pointer-events-none translate-y-3 opacity-0",
      )}
    >
      {open && (
        <div id={menuId} role="group" aria-label={tx(locale, "Hablar con una persona", "Talk to a person")} className="np-glass-nav np-in w-[min(300px,calc(100vw-2rem))] rounded-[24px] p-2 shadow-[0_18px_40px_rgba(30,26,24,.22)]">
          <button
            type="button"
            aria-haspopup="dialog"
            onClick={() => {
              setOpen(false);
              setOnCall(true);
            }}
            className={item}
          >
            <span className={glyph}><PhoneCall size={16} strokeWidth={1.8} aria-hidden /></span>
            <span className="min-w-0">
              <span className="block font-semibold">{tx(locale, "Llamar a un asesor", "Call an advisor")}</span>
              <span className="block text-[13px] text-ink/65">{tx(locale, "De guardia 24/7, también hoy", "On call 24/7, today too")}</span>
            </span>
          </button>
          <Link href={href} onClick={() => setOpen(false)} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})} className={item}>
            <span className={glyph}>{whatsapp ? <WhatsAppIcon size={17} /> : <MessageCircle size={16} aria-hidden />}</span>
            <span className="min-w-0">
              <span className="block font-semibold">{whatsapp ? tx(locale, "Escribir por WhatsApp", "Message on WhatsApp") : tx(locale, "Escríbenos", "Write to us")}</span>
              <span className="block text-[13px] text-ink/65">{tx(locale, "Te responde una persona, no un robot", "A person replies, not a bot")}</span>
            </span>
          </Link>
        </div>
      )}
      <button
        ref={trigger}
        type="button"
        aria-label={open ? tx(locale, "Cerrar", "Close") : label}
        title={label}
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        tabIndex={hidden ? -1 : undefined}
        onClick={() => setOpen((o) => !o)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-navy text-ivory shadow-[0_0_0_2px_#C9A574,0_14px_30px_rgba(30,26,24,.35)] transition-colors hover:bg-navy-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-navy"
      >
        {open ? <X size={22} aria-hidden /> : <MessageCircle size={23} aria-hidden />}
      </button>
      {onCall && <OnCallDialog locale={locale} listingSlug={listingSlug} onClose={closeOnCall} />}
    </div>
  );
}

/** Where a signed-in user's own space lives, by role (seekers: the hub "Tu espacio" at /app). */
export function roleHome(role: string | undefined) {
  if (role === "SUPERADMIN") return "/platform";
  if (["AGENT", "AGENCY_OWNER", "CAPTOR", "PHOTOGRAPHER", "BACKOFFICE"].includes(role ?? "")) return "/agency";
  if (role === "OWNER_PRIVATE") return "/owner/listings";
  return "/app";
}

/**
 * Unread messages of a signed-in seeker (sum over their threads). Shared cache with the header drawer's "Tu espacio"
 * block. Light on purpose: no polling, it refreshes on mount (when older than 30 s) and when the tab becomes visible
 * again (React Query's focus/visibility refetch).
 */
export function useUnreadMessages(enabled: boolean, opts: { refetchOnWindowFocus?: boolean } = {}) {
  const q = useQuery({
    queryKey: ["threads", "drawer"],
    queryFn: () => api<{ threads: { unread?: number }[] }>("threads"),
    enabled,
    staleTime: 30_000,
    refetchOnWindowFocus: opts.refetchOnWindowFocus ?? false,
  });
  return enabled ? (q.data?.threads ?? []).reduce((n, th) => n + (th.unread ?? 0), 0) : 0;
}

/**
 * Phones: bottom tab bar (Inicio · Buscar · Guardados · Cuenta). The active item carries the roof glyph. "Buscar" opens
 * the search (list first; its own floating toggle switches to the map). "Cuenta" opens the user's own space when signed
 * in (seekers: /app "Tu espacio"), the sign-in page otherwise.
 */
export function MobileTabBar({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const { saved, user } = useApp();
  const t = msg(locale, "nav");
  const seeker = !!user && roleHome(user.role) === "/app";
  const unread = useUnreadMessages(seeker, { refetchOnWindowFocus: true });
  const items: { href: string; label: string; Icon: typeof Home; active: boolean; badge?: number; badgeLabel?: string }[] = [
    { href: `/${locale}`, label: t("home"), Icon: Home, active: pathname === `/${locale}` },
    { href: `/${locale}/search?type=SALE`, label: tx(locale, "Buscar", "Search"), Icon: Search, active: pathname.endsWith("/search") },
    { href: `/${locale}/saved`, label: t("saved"), Icon: Heart, active: pathname.endsWith("/saved"), badge: saved.length },
    {
      href: user ? `/${locale}${roleHome(user.role)}` : `/${locale}/login`,
      label: t("account"),
      Icon: User,
      active: /^\/(es|en)\/(app|account|alerts|login|register|owner\/listings)(\/|$)/.test(pathname),
      badge: unread,
      badgeLabel: tx(locale, unread === 1 ? "mensaje sin leer" : "mensajes sin leer", unread === 1 ? "unread message" : "unread messages"),
    },
  ];
  return (
    <nav
      data-tabbar
      aria-label={locale === "es" ? "Navegación inferior" : "Bottom navigation"}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ivory/95 backdrop-blur md:hidden print:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid grid-cols-4">
        {items.map(({ href, label, Icon, active, badge, badgeLabel }) => (
          <li key={label}>
            <Link href={href} aria-current={active ? "page" : undefined} className={cn("relative flex h-16 flex-col items-center justify-center gap-1 font-display text-[13px]", active ? "text-ink" : "text-muted")}>
              {active && <RoofGlyph className="absolute top-1.5 h-[6px] w-[18px]" />}
              <span className="relative">
                <Icon size={21} strokeWidth={1.6} aria-hidden />
                {!!badge && (
                  <span className={cn("absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold", badgeLabel ? "bg-coral-cta text-white" : "bg-navy text-ivory")}>
                    {badge}
                    {badgeLabel && <span className="sr-only"> {badgeLabel}</span>}
                  </span>
                )}
              </span>
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

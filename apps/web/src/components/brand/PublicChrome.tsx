"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { Heart, Home, MessageCircle, PhoneCall, Search, ShieldCheck, User, X } from "lucide-react";
import { WhatsAppIcon } from "./WhatsAppIcon";
import { useHideOnScroll } from "./useScrollChrome";
import type { Locale } from "@/types/domain";
import { useApp } from "@/lib/store";
import { api } from "@/lib/api";
import { msg, tx } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { RoofGlyph } from "./Logo";

export { WhatsAppIcon } from "./WhatsAppIcon";

/** Guardia 24/7 dialog: loaded on first open (it is never on screen at first paint). */
const OnCallDialog = dynamic(() => import("./OnCallDialog").then((m) => m.OnCallDialog), { ssr: false });

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
        <div id={menuId} role="group" aria-label={tx(locale, "Hablar con una persona", "Talk to a person")} className="np-glass-nav np-in w-[min(300px,calc(100vw-2rem))] rounded-[24px] p-2 shadow-[0_18px_40px_rgba(31,35,40,.22)]">
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
        className="flex h-14 w-14 items-center justify-center rounded-full bg-navy text-ivory shadow-[0_0_0_2px_#C3C8CD,0_14px_30px_rgba(31,35,40,.35)] transition-colors hover:bg-navy-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-navy"
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
  // While the on-screen keyboard is open (visible viewport < 75 % of the window) the bar steps away, so nothing
  // fixed sits over the field, its suggestions or the "Buscar" button.
  const [keyboard, setKeyboard] = useState(false);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const check = () => setKeyboard(vv.height < window.innerHeight * 0.75);
    check();
    vv.addEventListener("resize", check);
    return () => vv.removeEventListener("resize", check);
  }, []);
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
  const cell = (active: boolean) => cn("relative flex h-[60px] w-full flex-col items-center justify-center gap-1 rounded-[22px] font-display text-[11.5px] transition-colors", active ? "bg-black/[.05] font-medium text-ink [html.dark_&]:bg-white/[.08]" : "text-muted");
  const link = (it: (typeof items)[number]) => (
    <li key={it.label}>
      <Link href={it.href} aria-current={it.active ? "page" : undefined} className={cell(it.active)}>
        <span className="relative">
          <it.Icon size={21} strokeWidth={1.5} aria-hidden />
          {!!it.badge && (
            <span className={cn("absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold", it.badgeLabel ? "bg-coral-cta text-white" : "bg-navy text-ivory")}>
              {it.badge}
              {it.badgeLabel && <span className="sr-only"> {it.badgeLabel}</span>}
            </span>
          )}
        </span>
        {it.label}
      </Link>
    </li>
  );
  return (
    <nav
      data-tabbar
      data-keyboard={keyboard ? "open" : undefined}
      aria-label={locale === "es" ? "Navegación inferior" : "Bottom navigation"}
      className={cn("fixed inset-x-3 z-40 transition-[transform,opacity] duration-300 md:hidden print:hidden", keyboard && "pointer-events-none translate-y-[calc(100%+24px)] opacity-0")}
      style={{ bottom: "calc(env(safe-area-inset-bottom) + 10px)" }}
      inert={keyboard || undefined}
    >
      {/* Floating frosted-glass bar (022): Inicio · Buscar · Guardia · Guardados · Cuenta. */}
      <ul className="np-glass-nav grid grid-cols-5 gap-0.5 rounded-[28px] p-1">
        {items.slice(0, 2).map(link)}
        <li>
          <OnCallButton locale={locale} className={cell(false)}>
            <ShieldCheck size={21} strokeWidth={1.5} aria-hidden />
            {tx(locale, "Guardia", "On call")}
          </OnCallButton>
        </li>
        {items.slice(2).map(link)}
      </ul>
    </nav>
  );
}

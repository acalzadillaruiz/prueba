"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, CalendarCheck, ChevronDown, FlaskConical, Heart, LogIn, Menu, MessageCircle, Moon, Settings, Sun, User, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Locale } from "@/types/domain";
import { Logo, RoofGlyph } from "@/components/brand/Logo";
import { Avatar, Button } from "@/components/ui";
import { useHideOnScroll } from "@/components/brand/useScrollChrome";
import { roleHome } from "@/components/brand/PublicChrome";
import { DemoLoginList, useDemoVisible } from "./DemoBar";
import { useApp } from "@/lib/store";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { msg, tx } from "@/lib/i18n";

/** The logo's roof draws itself once per visit (first load), not on every client navigation. */
let roofPlayed = false;

/** Search pages update their query with history.replaceState: they announce it so the active nav item follows. */
export const URL_CHANGE_EVENT = "np:urlchange";

/**
 * The compact search (CompactAsk) carries its own menu button while it replaces the header (html[data-np-compact="on"]
 * hides the header, see globals.css): it dispatches this event and the header's drawer opens.
 */
export const OPEN_MENU_EVENT = "np:open-menu";

/** Theme: the visitor's explicit choice (np-theme) wins; without one, the device setting (applied before paint in layout.tsx). */
function storedTheme() {
  try {
    return localStorage.getItem("np-theme");
  } catch {
    return null;
  }
}

/**
 * Public header (floating glass pill). `autoHide`: it slides away while the reader scrolls down and comes back on
 * scroll-up. It publishes its state as `html[data-np-header="hidden"]`, which switches the CSS custom property
 * `--np-header-offset` (globals.css: 80px phones / 84px from md when shown, 8px when hidden) so bars pinned under
 * it (the compact search) can follow. While the compact search is pinned (html[data-np-compact="on"]) the header is
 * hidden altogether and its drawer opens on the `np:open-menu` event.
 */
export function PublicHeader({ locale, variant = "light", autoHide = false }: { locale: Locale; variant?: "light" | "dark" | "transparent"; autoHide?: boolean }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  // Demo mode (DEMO_AUTH): desktop popover and the drawer's section keep separate states.
  const [deskDemo, setDeskDemo] = useState(false);
  const [drawerDemo, setDrawerDemo] = useState(false);
  const demo = useDemoVisible();
  // Query string read in the browser (keeps the header static-renderable): used to keep filters on EN/ES switch
  // and to mark the active section on /search.
  const [qs, setQs] = useState("");
  const [animate] = useState(() => !roofPlayed);
  // What opened the drawer (header menu button or the compact search's), to give focus back on close.
  const opener = useRef<HTMLElement | null>(null);
  useEffect(() => {
    roofPlayed = true;
  }, []);
  useEffect(() => {
    // A navigation closes the drawer without pulling focus back to its opener.
    opener.current = null;
    setMenuOpen(false);
    setDeskDemo(false);
    const read = () => setQs(window.location.search.replace(/^\?/, ""));
    read();
    window.addEventListener(URL_CHANGE_EVENT, read);
    window.addEventListener("popstate", read);
    return () => {
      window.removeEventListener(URL_CHANGE_EVENT, read);
      window.removeEventListener("popstate", read);
    };
  }, [pathname]);
  // The compact search's menu button (the header is hidden while it is pinned) opens this drawer.
  useEffect(() => {
    const open = () => {
      opener.current = document.activeElement as HTMLElement | null;
      setMenuOpen(true);
    };
    window.addEventListener(OPEN_MENU_EVENT, open);
    return () => window.removeEventListener(OPEN_MENU_EVENT, open);
  }, []);
  useEffect(() => {
    if (!menuOpen) {
      setDrawerDemo(false);
      // Back to whatever opened it (the compact search's menu button), when it is still there.
      const el = opener.current;
      opener.current = null;
      if (el?.isConnected && el !== document.body) el.focus({ preventScroll: true });
      return;
    }
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [menuOpen]);
  // Pointer light for [data-spotlight] surfaces (cards, glass panels) on every public page.
  useEffect(() => {
    const onSpot = (e: PointerEvent) => {
      const el = (e.target as HTMLElement).closest?.("[data-spotlight]") as HTMLElement | null;
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - r.left}px`);
      el.style.setProperty("--my", `${e.clientY - r.top}px`);
    };
    document.addEventListener("pointermove", onSpot, { passive: true });
    return () => document.removeEventListener("pointermove", onSpot);
  }, []);
  // Transparent header (over the hero) turns into frosted glass once the page scrolls.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    if (variant !== "transparent") return;
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, [variant]);
  const { saved, user: u, ready } = useApp();
  const t = msg(locale, "nav");
  const [isDark, setDarkState] = useState(false);
  useEffect(() => {
    setDarkState(document.documentElement.classList.contains("dark"));
    // No explicit choice yet: follow the device when it switches (e.g. at sunset).
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!mq) return;
    const onChange = (e: MediaQueryListEvent) => {
      if (storedTheme()) return;
      document.documentElement.classList.toggle("dark", e.matches);
      setDarkState(e.matches);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  const toggleTheme = () => {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("np-theme", next ? "dark" : "light");
    } catch {}
    setDarkState(next);
  };
  const other = locale === "es" ? "en" : "es";
  const switchHref = pathname.replace(/^\/(es|en)/, `/${other}`) + (qs ? `?${qs}` : "");
  const dark = variant === "dark";
  const float = variant !== "dark";
  const type = new URLSearchParams(qs).get("type") ?? "SALE";
  const onSearch = /\/search$/.test(pathname);
  const buy = { href: `/${locale}/search?type=SALE`, label: t("buy"), active: onSearch && type === "SALE" };
  const rent = { href: `/${locale}/search?type=LONG_RENT`, label: t("rent"), active: onSearch && type === "LONG_RENT" };
  const vacation = { href: `/${locale}/search?type=SHORT_RENT`, label: t("vacation"), active: onSearch && type === "SHORT_RENT" };
  const luxury = { href: `/${locale}/luxury`, label: t("privateCollection"), active: /\/luxury$/.test(pathname) };
  const remote = { href: `/${locale}#compra-a-distancia`, label: t("remoteBuying"), active: false };
  // Desktop: "Vacacional" joins from 1400 px (below that the pill has no room for it; it stays in the search filters).
  const nav = [buy, rent, { ...vacation, wide: true }, luxury, remote];
  // Drawer: every way to search (the four search types the search page understands), then the rest.
  const searchTypes = [buy, rent, vacation, { href: `/${locale}/search?type=COMMERCIAL`, label: t("commercial"), active: onSearch && type === "COMMERCIAL" }];
  const home = u ? roleHome(u.role) : "/app";
  const seeker = !!u && home === "/app";
  // Unread messages for the drawer's "Tu espacio" block: fetched only while the drawer is open.
  const inbox = useQuery({
    queryKey: ["threads", "drawer"],
    queryFn: () => api<{ threads: { unread?: number }[] }>("threads"),
    enabled: menuOpen && seeker,
    staleTime: 30_000,
  });
  const unread = (inbox.data?.threads ?? []).reduce((n, th) => n + (th.unread ?? 0), 0);
  const space = [
    { href: `/${locale}/app#visitas`, label: tx(locale, "Visitas", "Tours"), Icon: CalendarCheck },
    { href: `/${locale}/app#mensajes`, label: tx(locale, "Mensajes", "Messages"), Icon: MessageCircle, badge: unread },
    { href: `/${locale}/alerts`, label: tx(locale, "Alertas", "Alerts"), Icon: Bell },
    { href: `/${locale}/account`, label: tx(locale, "Ajustes", "Settings"), Icon: Settings },
  ];
  // Hide on scroll-down (never while the drawer is open or focus is inside the header).
  const [focusIn, setFocusIn] = useState(false);
  const scrolledAway = useHideOnScroll({ enabled: autoHide && variant !== "dark" });
  const away = scrolledAway && !menuOpen && !focusIn && !deskDemo;
  useEffect(() => {
    if (!autoHide) return;
    const el = document.documentElement;
    if (away) el.dataset.npHeader = "hidden";
    else delete el.dataset.npHeader;
  }, [away, autoHide]);
  useEffect(() => () => void delete document.documentElement.dataset.npHeader, []);
  // Desktop demo popover: closes on Escape / outside click.
  const demoRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!deskDemo) return;
    const onDown = (e: PointerEvent) => !demoRef.current?.contains(e.target as Node) && setDeskDemo(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDeskDemo(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [deskDemo]);
  const drawerItem = "flex min-h-12 items-center gap-3 rounded-lg px-3 font-display text-[16px] hover:bg-white/5";
  const iconBtn = cn("flex h-11 w-11 items-center justify-center rounded-full transition-colors duration-np", dark ? "hover:bg-white/10" : "hover:bg-black/5");
  const switchLang = (e: React.MouseEvent) => {
    // use the live query (filters may have changed since render)
    e.preventDefault();
    window.location.assign(pathname.replace(/^\/(es|en)/, `/${other}`) + window.location.search);
  };
  return (
    <>
    <a href="#main" className="sr-only-focusable fixed left-3 top-3 z-[70] rounded-full bg-navy px-4 py-2 font-display text-ivory">{locale === "es" ? "Saltar al contenido" : "Skip to content"}</a>
    <header
      data-public-header
      style={{ paddingTop: "env(safe-area-inset-top)" }}
      // Keyboard focus inside keeps it in view (a mouse click on a link doesn't pin it).
      onFocus={(e) => (e.target as HTMLElement).matches?.(":focus-visible") && setFocusIn(true)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node | null) && setFocusIn(false)}
      className={cn(
        "top-0 z-40 transition-[background-color,border-color,transform] duration-300 ease-[cubic-bezier(.2,.7,.2,1)]",
        away && "-translate-y-[calc(100%+12px)]",
        variant === "dark" && "np-navy-panel sticky border-b border-navy-line bg-navy text-ivory",
        float && "inset-x-0 px-2.5 pt-2.5 text-ink md:px-5 md:pt-3",
        variant === "transparent" ? "fixed" : variant === "light" && "sticky",
      )}
    >
      <div
        className={cn(
          "mx-auto flex max-w-[1320px] items-center gap-8 transition-[background-color,box-shadow,border-color] duration-500",
          float ? "h-[62px] rounded-full border pl-5 pr-2 md:pl-6" : "h-[72px] px-4 md:px-8",
          float && (variant === "light" || scrolled || menuOpen ? "np-glass" : "border-transparent bg-transparent"),
        )}
      >
        <Link href={`/${locale}`} aria-label="New Place" className="flex min-h-11 shrink-0 items-center whitespace-nowrap">
          <Logo tone={dark ? "ivory" : "navy"} animate={animate} />
        </Link>
        <nav aria-label={locale === "es" ? "Principal" : "Main"} className="hidden items-center gap-1 lg:flex">
          {nav.map((n) => (
            <Link
              key={n.label}
              href={n.href}
              aria-current={n.active ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center px-3 font-display text-[15px] transition-colors duration-np",
                "wide" in n && "hidden min-[1400px]:flex",
                n.active ? (dark ? "text-ivory" : "text-ink") : dark ? "text-ivory/85 hover:text-ivory" : "text-ink/80 hover:text-ink",
              )}
            >
              <span className={cn(n.active && "np-navroof")}>{n.label}</span>
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1.5">
          <div className={cn("hidden items-center font-display text-[14px] font-semibold tracking-[0.14em] md:flex", dark ? "text-ivory/70" : "text-ink/70")}>
            {(["es", "en"] as const).map((lng, i) => (
              <span key={lng} className="flex items-center">
                {i > 0 && <span aria-hidden className="px-1">·</span>}
                {lng === locale ? (
                  <span aria-current="true" className={dark ? "text-ivory" : "text-ink"} lang={locale}>{locale.toUpperCase()}</span>
                ) : (
                  <Link
                    href={switchHref}
                    // full navigation (below): prefetching the other language's RSC payload would only waste bandwidth
                    prefetch={false}
                    onClick={switchLang}
                    hrefLang={other}
                    lang={other}
                    aria-label={other === "en" ? "English" : "Español"}
                    className={cn("flex min-h-11 items-center px-1 transition-colors", dark ? "hover:text-ivory" : "hover:text-ink")}
                  >
                    {other.toUpperCase()}
                  </Link>
                )}
              </span>
            ))}
          </div>
          <button
            onClick={toggleTheme}
            className={cn(iconBtn, "hidden md:flex")}
            aria-label={isDark ? (locale === "es" ? "Modo claro" : "Light mode") : locale === "es" ? "Modo oscuro" : "Dark mode"}
            aria-pressed={isDark}
          >
            {isDark ? <Sun size={18} aria-hidden /> : <Moon size={18} aria-hidden />}
          </button>
          <Link href={`/${locale}/saved`} className={cn(iconBtn, "relative hidden sm:flex")} aria-label={t("saved")}>
            <Heart size={19} aria-hidden />
            {saved.length > 0 && <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-navy px-1 text-[11px] font-bold leading-none text-ivory ring-2 ring-ivory">{saved.length}</span>}
          </Link>
          {!ready ? (
            // session still loading (public pages are cached without it): keep the slot's size, no flash
            <span className="hidden h-9 w-16 rounded-full md:inline-block" aria-hidden />
          ) : u ? (
            <Link href={`/${locale}${home}`} className={cn("hidden items-center gap-2 rounded-full p-0.5 pr-2 md:flex", dark ? "hover:bg-white/10" : "hover:bg-black/5")}>
              <Avatar initials={u.initials} hue={u.hue} size={32} />
              <span className="hidden font-display text-sm xl:inline">{u.name.split(" ")[0]}</span>
            </Link>
          ) : (
            <Link href={`/${locale}/login`} className={cn("hidden min-h-11 items-center gap-1.5 rounded-full px-3 font-display text-[15px] md:flex", dark ? "text-ivory/85 hover:bg-white/10" : "text-ink/80 hover:bg-black/5")}>
              <User size={17} aria-hidden /> {t("signIn")}
            </Link>
          )}
          {demo && (
            // Demo mode (DEMO_AUTH) on desktop: a small header button + popover, never floating over content.
            <div ref={demoRef} className="relative hidden lg:block">
              <button
                type="button"
                onClick={() => setDeskDemo((o) => !o)}
                aria-expanded={deskDemo}
                aria-label={tx(locale, "Modo demo: entrar como…", "Demo mode: sign in as…")}
                title={tx(locale, "Modo demo", "Demo mode")}
                className={cn(iconBtn, "text-gold-text")}
              >
                <FlaskConical size={17} aria-hidden />
              </button>
              {deskDemo && (
                <div className="np-in absolute right-0 top-full z-50 mt-2 max-h-[70vh] w-72 overflow-y-auto rounded-np border border-navy-line bg-navy p-1 text-ivory shadow-np">
                  <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-mist">{tx(locale, "Entrar como… (modo demo)", "Sign in as… (demo mode)")}</div>
                  <DemoLoginList locale={locale} onDone={() => setDeskDemo(false)} />
                </div>
              )}
            </div>
          )}
          <Button href={`/${locale}/sell`} variant={dark ? "dark-outline" : "outline"} size="sm" className="ml-1 hidden h-11 md:inline-flex">
            {t("sell")}
          </Button>
          <button
            onClick={(e) => {
              opener.current = e.currentTarget;
              setMenuOpen(true);
            }}
            className={cn("flex h-11 w-11 items-center justify-center rounded-full lg:hidden", dark ? "bg-white/15 backdrop-blur hover:bg-white/25" : "hover:bg-black/5")}
            aria-label={t("menu")}
            aria-expanded={menuOpen}
            aria-controls="np-mobile-menu"
          >
            <Menu size={20} />
          </button>
        </div>
      </div>
    </header>
    {menuOpen && (
      // Not lg:hidden: on desktop it only opens from the compact search's menu button (np:open-menu).
      <div className="fixed inset-0 z-[65]" role="dialog" aria-modal="true" aria-label={t("menu")} id="np-mobile-menu">
        <button className="absolute inset-0 bg-navy/60" aria-label={locale === "es" ? "Cerrar menú" : "Close menu"} onClick={() => setMenuOpen(false)} />
        <div className="np-in absolute inset-y-0 right-0 flex w-[min(340px,88vw)] flex-col bg-navy text-ivory shadow-np" style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}>
          <div className="flex h-[72px] items-center justify-between px-5">
            <Logo tone="ivory" />
            <button autoFocus onClick={() => setMenuOpen(false)} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/10" aria-label={locale === "es" ? "Cerrar menú" : "Close menu"}>
              <X size={20} />
            </button>
          </div>
          <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-4 pt-1" aria-label={locale === "es" ? "Principal" : "Main"}>
            {searchTypes.map((n) => (
              <Link key={n.href} href={n.href} onClick={() => setMenuOpen(false)} aria-current={n.active ? "page" : undefined} className="flex min-h-[50px] items-center gap-3 rounded-lg px-3 font-serif text-[23px] hover:bg-white/5">
                {n.label}
                {n.active && <RoofGlyph className="text-[#C9A574]" />}
              </Link>
            ))}
            <div className="mx-3 my-3 h-px bg-[#B08A55]/40" aria-hidden />
            <Link href={luxury.href} onClick={() => setMenuOpen(false)} aria-current={luxury.active ? "page" : undefined} className={drawerItem}>
              <RoofGlyph className="w-[18px] text-[#C9A574]" /> {luxury.label}
            </Link>
            <Link href={remote.href} onClick={() => setMenuOpen(false)} className={drawerItem}>
              <span aria-hidden className="w-[18px] text-center text-[#C9A574]">↗</span> {remote.label}
            </Link>
            <Link href={`/${locale}/saved`} onClick={() => setMenuOpen(false)} className={drawerItem}>
              <Heart size={18} aria-hidden /> {t("saved")} {saved.length > 0 && <span className="text-sm text-mist">({saved.length})</span>}
            </Link>
            {seeker && (
              <>
                <div className="mx-3 mb-1 mt-4 font-display text-[12px] font-semibold uppercase tracking-[.18em] text-[#C9A574]">{tx(locale, "Tu espacio", "Your space")}</div>
                {space.map(({ href, label, Icon, badge }) => (
                  <Link key={href} href={href} onClick={() => setMenuOpen(false)} className={drawerItem}>
                    <Icon size={18} aria-hidden /> {label}
                    {!!badge && (
                      <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-[#C9A574] px-1.5 text-[11px] font-bold text-navy">
                        {badge}
                        <span className="sr-only">{tx(locale, " sin leer", " unread")}</span>
                      </span>
                    )}
                  </Link>
                ))}
              </>
            )}
            <div className="mx-3 my-3 h-px bg-[#B08A55]/40" aria-hidden />
            <div className="flex items-center gap-2 px-1">
              <Link href={switchHref} prefetch={false} onClick={switchLang} hrefLang={other} lang={other} className="flex min-h-12 items-center rounded-lg px-2 font-display text-[16px] hover:bg-white/5">
                {other === "en" ? "English" : "Español"}
              </Link>
              <button onClick={toggleTheme} aria-pressed={isDark} className="ml-auto flex min-h-12 items-center gap-2 rounded-lg px-3 font-display text-[16px] hover:bg-white/5">
                {isDark ? <Sun size={18} aria-hidden /> : <Moon size={18} aria-hidden />} {isDark ? (locale === "es" ? "Modo claro" : "Light mode") : locale === "es" ? "Modo oscuro" : "Dark mode"}
              </button>
            </div>
            {demo && (
              <div className="mt-2 rounded-xl border border-navy-line">
                <button type="button" onClick={() => setDrawerDemo((o) => !o)} aria-expanded={drawerDemo} className="flex min-h-12 w-full items-center gap-2.5 rounded-xl px-3 font-display text-[15px] text-mist hover:bg-white/5">
                  <FlaskConical size={16} className="text-[#C9A574]" aria-hidden /> {tx(locale, "Modo demo · entrar como…", "Demo mode · sign in as…")}
                  <ChevronDown size={16} aria-hidden className={cn("ml-auto transition-transform", drawerDemo && "rotate-180")} />
                </button>
                {drawerDemo && <DemoLoginList locale={locale} onDone={() => setMenuOpen(false)} className="px-1 pb-1" />}
              </div>
            )}
          </nav>
          <div className="shrink-0 space-y-3 border-t border-navy-line p-5">
            <Link href={`/${locale}/sell`} className="flex min-h-12 items-center justify-center rounded-full border-[1.5px] border-ivory/60 font-display font-semibold text-ivory hover:bg-white/5">
              {t("sell")}
            </Link>
            {u ? (
              <Link href={`/${locale}${home}`} className="flex min-h-12 items-center gap-3 rounded-lg px-2 hover:bg-white/5">
                <Avatar initials={u.initials} hue={u.hue} size={32} />
                <span className="font-display">{u.name}</span>
              </Link>
            ) : (
              <Link href={`/${locale}/login`} className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-ivory font-display font-semibold text-navy">
                <LogIn size={18} aria-hidden /> {t("signIn")}
              </Link>
            )}
          </div>
        </div>
      </div>
    )}
    </>
  );
}

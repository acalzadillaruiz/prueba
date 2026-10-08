"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft, FlaskConical, Heart, Menu, Moon, Sun, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { Locale } from "@/types/domain";
import { Logo } from "@/components/brand/Logo";
import { Avatar, Button } from "@/components/ui";
import { useHideOnScroll } from "@/components/brand/useScrollChrome";
import { roleHome } from "@/components/brand/PublicChrome";
import { useDemoVisible } from "./useDemoVisible";
import type { DrawerLink } from "./MenuDrawer";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/cn";
import { msg, tx } from "@/lib/i18n";

/** The menu drawer and the demo list are never on screen at first paint: their code arrives on demand (and the
 *  drawer's is warmed in an idle slot after load, so the first tap still opens it at once). */
const loadDrawer = () => import("./MenuDrawer");
const MenuDrawer = dynamic(() => loadDrawer().then((m) => m.MenuDrawer), { ssr: false });
const DemoLoginList = dynamic(() => import("./DemoLoginList").then((m) => m.DemoLoginList), { ssr: false });

/** The logo's roof draws itself once per visit (first load), not on every client navigation. */
let roofPlayed = false;

/** Search pages update their query with history.replaceState: they announce it so the active nav item follows. */
export const URL_CHANGE_EVENT = "np:urlchange";

/**
 * The compact search (CompactAsk) carries its own menu button while it replaces the header (html[data-np-compact="on"]
 * hides the header, see globals.css): it dispatches this event and the header's drawer opens.
 */
export const OPEN_MENU_EVENT = "np:open-menu";

/** Header mounts in this document: only the first page loaded can trust `document.referrer` as "the page before". */
let headerMounts = 0;

/** Same-origin search path only (never an open redirect): "/es/search?…" or "/en/search…" (same rule as BackToResults). */
const searchPath = (v: string | null) => (v && /^\/(?:es|en)\/search(?:[?#]|$)/.test(v) ? v : null);

type BackTarget = { kind: "back" | "push"; href: string };

/**
 * Where the header's back chevron leads on a listing: the last search of this tab (sessionStorage `np-last-search`,
 * written by the search page), by history when that search is really the previous entry (full load from it), or
 * history.back() when the visitor came from another page of this site. Arriving from outside: no chevron.
 */
function useListingBack(enabled: boolean) {
  const [target, setTarget] = useState<BackTarget | null>(null);
  useEffect(() => {
    const first = headerMounts++ === 0;
    if (!enabled) return;
    let stored: string | null = null;
    try {
      stored = searchPath(sessionStorage.getItem("np-last-search"));
    } catch {
      /* storage blocked */
    }
    let sameOrigin = false;
    let fromSearch = false;
    try {
      const ref = document.referrer ? new URL(document.referrer) : null;
      sameOrigin = !!ref && ref.origin === location.origin;
      fromSearch = sameOrigin && !!searchPath(ref!.pathname + ref!.search);
    } catch {
      /* bad referrer */
    }
    if (stored) setTarget({ kind: first && fromSearch && window.history.length > 1 ? "back" : "push", href: stored });
    else if ((sameOrigin || !first) && window.history.length > 1) setTarget({ kind: "back", href: `/${location.pathname.split("/")[1]}` });
  }, [enabled]);
  return target;
}

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
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  // Listing detail: once the page's own "← Resultados" has scrolled away, the returning header carries a back chevron.
  const onListing = /^\/(?:es|en)\/listing\//.test(pathname);
  const back = useListingBack(onListing);
  const [deep, setDeep] = useState(false);
  useEffect(() => {
    if (!onListing || !back) return;
    const on = () => setDeep(window.scrollY > 280);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, [onListing, back]);
  const showBack = onListing && !!back && deep;
  // Demo mode (DEMO_AUTH): the desktop popover (the drawer keeps its own state).
  const [deskDemo, setDeskDemo] = useState(false);
  const demo = useDemoVisible();
  // Query string read in the browser (keeps the header static-renderable): used to keep filters on EN/ES switch
  // and to mark the active section on /search.
  const [qs, setQs] = useState("");
  const [animate] = useState(() => !roofPlayed);
  // What opened the drawer (header menu button or the compact search's), to give focus back on close.
  const opener = useRef<HTMLElement | null>(null);
  useEffect(() => {
    roofPlayed = true;
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
    const warm = () => void loadDrawer().catch(() => {});
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(warm, { timeout: 4000 });
      return () => w.cancelIdleCallback?.(id);
    }
    const t = window.setTimeout(warm, 2500);
    return () => window.clearTimeout(t);
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
    const root = document.documentElement;
    setDarkState(root.classList.contains("dark"));
    // Other switches (the footer's) flip html.dark too: follow the class so the icon stays right.
    const mo = new MutationObserver(() => setDarkState(root.classList.contains("dark")));
    mo.observe(root, { attributes: true, attributeFilter: ["class"] });
    // No explicit choice yet: follow the device when it switches (e.g. at sunset).
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => {
      if (storedTheme()) return;
      root.classList.toggle("dark", e.matches);
      setDarkState(e.matches);
    };
    mq?.addEventListener("change", onChange);
    return () => {
      mo.disconnect();
      mq?.removeEventListener("change", onChange);
    };
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
  // Narrow desktops (lg) keep only the essentials; the rest join as room allows (all of them are always in the drawer).
  const nav = [buy, rent, { ...vacation, wide: true }, { ...luxury, mid: true }, { ...remote, wide: true }];
  // Drawer: every way to search (the four search types the search page understands), then the rest.
  const searchTypes: DrawerLink[] = [buy, rent, vacation, { href: `/${locale}/search?type=COMMERCIAL`, label: t("commercial"), active: onSearch && type === "COMMERCIAL" }];
  const home = u ? roleHome(u.role) : "/app";
  const seeker = !!u && home === "/app";
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
        <div className={cn("flex shrink-0 items-center", showBack && "-ml-3 gap-0.5 md:-ml-3.5")}>
          {showBack && back && (
            <a
              href={back.href}
              onClick={(e) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                e.preventDefault();
                if (back.kind === "back") router.back();
                else router.push(back.href);
              }}
              aria-label={searchPath(back.href) ? tx(locale, "Volver a los resultados", "Back to results") : tx(locale, "Volver", "Back")}
              data-header-back
              className={cn("np-in flex h-11 w-11 shrink-0 items-center justify-center rounded-full", dark ? "hover:bg-white/10" : "hover:bg-black/5")}
            >
              <ChevronLeft size={22} aria-hidden />
            </a>
          )}
          <Link href={`/${locale}`} aria-label="New Place" className="flex min-h-11 shrink-0 items-center whitespace-nowrap">
            <Logo tone={dark ? "ivory" : "navy"} size={showBack ? "sm" : "md"} animate={animate} />
          </Link>
        </div>
        <nav aria-label={locale === "es" ? "Principal" : "Main"} className="hidden items-center gap-1 lg:flex">
          {nav.map((n) => (
            <Link
              key={n.label}
              href={n.href}
              aria-current={n.active ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center whitespace-nowrap px-3 font-display text-[15px] transition-colors duration-np",
                "wide" in n && "hidden min-[1400px]:flex",
                "mid" in n && "hidden xl:flex",
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
      <MenuDrawer
        locale={locale}
        onClose={() => setMenuOpen(false)}
        searchTypes={searchTypes}
        luxury={luxury}
        remote={remote}
        seeker={seeker}
        home={home}
        switchHref={switchHref}
        onSwitchLang={switchLang}
        isDark={isDark}
        onToggleTheme={toggleTheme}
        demo={demo}
      />
    )}
    </>
  );
}

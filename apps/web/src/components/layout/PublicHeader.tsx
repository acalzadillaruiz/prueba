"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, LogIn, Menu, Moon, Sun, User, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { Locale } from "@/types/domain";
import { Logo, RoofGlyph } from "@/components/brand/Logo";
import { Avatar, Button } from "@/components/ui";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/cn";
import { msg } from "@/lib/i18n";

/** The logo's roof draws itself once per visit (first load), not on every client navigation. */
let roofPlayed = false;

/** Search pages update their query with history.replaceState: they announce it so the active nav item follows. */
export const URL_CHANGE_EVENT = "np:urlchange";

export function PublicHeader({ locale, variant = "light" }: { locale: Locale; variant?: "light" | "dark" | "transparent" }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  // Query string read in the browser (keeps the header static-renderable): used to keep filters on EN/ES switch
  // and to mark the active section on /search.
  const [qs, setQs] = useState("");
  const [animate] = useState(() => !roofPlayed);
  useEffect(() => {
    roofPlayed = true;
  }, []);
  useEffect(() => {
    setMenuOpen(false);
    const read = () => setQs(window.location.search.replace(/^\?/, ""));
    read();
    window.addEventListener(URL_CHANGE_EVENT, read);
    window.addEventListener("popstate", read);
    return () => {
      window.removeEventListener(URL_CHANGE_EVENT, read);
      window.removeEventListener("popstate", read);
    };
  }, [pathname]);
  useEffect(() => {
    if (!menuOpen) return;
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
  useEffect(() => setDarkState(document.documentElement.classList.contains("dark")), []);
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
  const nav = [
    { href: `/${locale}/search?type=SALE`, label: t("buy"), active: onSearch && type === "SALE" },
    { href: `/${locale}/search?type=LONG_RENT`, label: t("rent"), active: onSearch && type === "LONG_RENT" },
    { href: `/${locale}/luxury`, label: t("privateCollection"), active: /\/luxury$/.test(pathname) },
    { href: `/${locale}#compra-a-distancia`, label: t("remoteBuying"), active: false },
  ];
  const home = u?.role === "SUPERADMIN" ? "/platform" : ["AGENT", "AGENCY_OWNER", "CAPTOR", "PHOTOGRAPHER", "BACKOFFICE"].includes(u?.role ?? "") ? "/agency" : u?.role === "OWNER_PRIVATE" ? "/owner/listings" : "/app";
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
      style={{ paddingTop: "env(safe-area-inset-top)" }}
      className={cn(
        "top-0 z-40 transition-[background-color,border-color] duration-300",
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
                n.active ? (dark ? "text-ivory" : "text-ink") : dark ? "text-ivory/80 hover:text-ivory" : "text-ink/75 hover:text-ink",
              )}
            >
              <span className={cn(n.active && "np-navroof")}>{n.label}</span>
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1.5">
          <div className={cn("hidden items-center font-display text-[13px] font-semibold tracking-[0.16em] md:flex", dark ? "text-ivory/60" : "text-muted")}>
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
            <Link href={`/${locale}/login`} className={cn("hidden min-h-11 items-center gap-1.5 rounded-full px-3 font-display text-sm md:flex", dark ? "text-ivory/85 hover:bg-white/10" : "text-ink/80 hover:bg-black/5")}>
              <User size={17} aria-hidden /> {t("signIn")}
            </Link>
          )}
          <Button href={`/${locale}/owner/new`} variant={dark ? "dark-outline" : "outline"} size="sm" className="ml-1 hidden h-11 md:inline-flex">
            {t("sell")}
          </Button>
          <button
            onClick={() => setMenuOpen(true)}
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
      <div className="fixed inset-0 z-[65] lg:hidden" role="dialog" aria-modal="true" aria-label={t("menu")} id="np-mobile-menu">
        <button className="absolute inset-0 bg-navy/60" aria-label={locale === "es" ? "Cerrar menú" : "Close menu"} onClick={() => setMenuOpen(false)} />
        <div className="np-in absolute inset-y-0 right-0 flex w-[min(340px,88vw)] flex-col bg-navy text-ivory shadow-np" style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}>
          <div className="flex h-[72px] items-center justify-between px-5">
            <Logo tone="ivory" />
            <button autoFocus onClick={() => setMenuOpen(false)} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/10" aria-label={locale === "es" ? "Cerrar menú" : "Close menu"}>
              <X size={20} />
            </button>
          </div>
          <nav className="flex flex-col px-3 pt-2" aria-label={locale === "es" ? "Principal" : "Main"}>
            {nav.map((n) => (
              <Link key={n.label} href={n.href} onClick={() => setMenuOpen(false)} aria-current={n.active ? "page" : undefined} className="flex min-h-[52px] items-center gap-3 rounded-lg px-3 font-serif text-[24px] hover:bg-white/5">
                {n.label}
                {n.active && <RoofGlyph className="text-[#C9A574]" />}
              </Link>
            ))}
            <div className="mx-3 my-3 h-px bg-[#B08A55]/40" aria-hidden />
            <Link href={`/${locale}/saved`} className="flex min-h-12 items-center gap-2.5 rounded-lg px-3 font-display text-[16px] hover:bg-white/5">
              <Heart size={18} aria-hidden /> {t("saved")} {saved.length > 0 && <span className="text-sm text-mist">({saved.length})</span>}
            </Link>
            <div className="flex items-center gap-2 px-1">
              <Link href={switchHref} prefetch={false} onClick={switchLang} hrefLang={other} lang={other} className="flex min-h-12 items-center rounded-lg px-2 font-display text-[16px] hover:bg-white/5">
                {other === "en" ? "English" : "Español"}
              </Link>
              <button onClick={toggleTheme} aria-pressed={isDark} className="ml-auto flex min-h-12 items-center gap-2 rounded-lg px-3 font-display text-[16px] hover:bg-white/5">
                {isDark ? <Sun size={18} aria-hidden /> : <Moon size={18} aria-hidden />} {isDark ? (locale === "es" ? "Modo claro" : "Light mode") : locale === "es" ? "Modo oscuro" : "Dark mode"}
              </button>
            </div>
          </nav>
          <div className="mt-auto space-y-3 border-t border-navy-line p-5">
            <Link href={`/${locale}/owner/new`} className="flex min-h-12 items-center justify-center rounded-full border-[1.5px] border-ivory/60 font-display font-semibold text-ivory hover:bg-white/5">
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

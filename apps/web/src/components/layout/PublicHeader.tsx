"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, LogIn, Menu, Moon, Plus, Sun, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { Locale } from "@/types/domain";
import { Logo } from "@/components/brand/Logo";
import { Avatar, Button } from "@/components/ui";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/cn";
import { msg } from "@/lib/i18n";

export function PublicHeader({ locale, variant = "light" }: { locale: Locale; variant?: "light" | "dark" | "transparent" }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  // Query string read in the browser (keeps the header static-renderable): used to keep filters on EN/ES switch.
  const [qs, setQs] = useState("");
  useEffect(() => {
    setMenuOpen(false);
    setQs(window.location.search.replace(/^\?/, ""));
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
  const dark = variant !== "light";
  const nav = [
    { href: `/${locale}/search?type=SALE`, label: t("buy") },
    { href: `/${locale}/search?type=LONG_RENT`, label: t("rent") },
    { href: `/${locale}/search?type=SHORT_RENT`, label: t("vacation") },
    { href: `/${locale}/search?type=COMMERCIAL`, label: t("commercial") },
    { href: `/${locale}/luxury`, label: t("luxury"), gold: true },
  ];
  const home = u?.role === "SUPERADMIN" ? "/platform" : ["AGENT", "AGENCY_OWNER", "CAPTOR", "PHOTOGRAPHER", "BACKOFFICE"].includes(u?.role ?? "") ? "/agency" : u?.role === "OWNER_PRIVATE" ? "/owner/listings" : "/app";
  return (
    <>
    <a href="#main" className="sr-only-focusable fixed left-3 top-3 z-[70] rounded-np bg-navy px-4 py-2 font-display text-ivory">{locale === "es" ? "Saltar al contenido" : "Skip to content"}</a>
    <header
      style={{ paddingTop: "env(safe-area-inset-top)" }}
      className={cn(
        "sticky top-0 z-40 border-b",
        variant === "light" && "border-line bg-ivory/90 backdrop-blur",
        variant === "dark" && "border-navy-line bg-navy text-ivory",
        variant === "transparent" && "border-transparent bg-transparent text-ivory absolute inset-x-0",
      )}
    >
      <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-6 px-4 md:px-6">
        <Link href={`/${locale}`} aria-label="New Place" className="flex min-h-11 items-center">
          <Logo tone={dark ? "ivory" : "navy"} />
        </Link>
        <nav className="hidden items-center gap-1 lg:flex">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "rounded-full px-3 py-1.5 font-display text-[15px] transition-colors duration-np",
                n.gold ? "text-gold hover:bg-gold/10" : dark ? "text-ivory/80 hover:bg-white/10 hover:text-ivory" : "text-ink/75 hover:bg-black/5 hover:text-ink",
              )}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link
            href={switchHref}
            // full navigation (below): prefetching the other language's RSC payload would only waste bandwidth
            prefetch={false}
            onClick={(e) => {
              // use the live query (filters may have changed since render)
              e.preventDefault();
              window.location.assign(pathname.replace(/^\/(es|en)/, `/${other}`) + window.location.search);
            }}
            hrefLang={other} lang={other} aria-label={other === "en" ? "English" : "Español"} className={cn("flex min-h-11 min-w-11 items-center justify-center rounded-full px-2 font-display text-sm font-semibold", dark ? "text-ivory/80 hover:bg-white/10" : "text-ink/70 hover:bg-black/5")}>
            {other.toUpperCase()}
          </Link>
          <button
            onClick={toggleTheme}
            className={cn("flex h-11 w-11 items-center justify-center rounded-full", variant !== "light" ? "hover:bg-white/10" : "hover:bg-black/5")}
            aria-label={isDark ? (locale === "es" ? "Modo claro" : "Light mode") : locale === "es" ? "Modo oscuro" : "Dark mode"}
            aria-pressed={isDark}
          >
            {isDark ? <Sun size={18} aria-hidden /> : <Moon size={18} aria-hidden />}
          </button>
          <Link href={`/${locale}/saved`} className={cn("relative hidden h-11 w-11 items-center justify-center rounded-full sm:flex", dark ? "hover:bg-white/10" : "hover:bg-black/5")} aria-label={t("saved")}>
            <Heart size={20} aria-hidden />
            {saved.length > 0 && <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-coral-cta px-1 text-xs font-bold leading-none text-white">{saved.length}</span>}
          </Link>
          <Button href={`/${locale}/owner/new`} variant={dark ? "dark-outline" : "outline"} size="sm" className="hidden md:inline-flex">
            <Plus size={15} /> {t("publish")}
          </Button>
          {!ready ? (
            // session still loading (public pages are cached without it): keep the slot's size, no flash
            <span className="inline-block h-8 w-16 rounded-full bg-black/5" aria-hidden />
          ) : u ? (
            <Link href={`/${locale}${home}`} className="flex items-center gap-2 rounded-full p-0.5 pr-2 hover:bg-black/5">
              <Avatar initials={u.initials} hue={u.hue} size={32} />
              <span className="hidden font-display text-sm xl:inline">{u.name.split(" ")[0]}</span>
            </Link>
          ) : (
            <Button href={`/${locale}/login`} size="sm" className="h-11 md:h-8">{t("signIn")}</Button>
          )}
          <button
            onClick={() => setMenuOpen(true)}
            className={cn("flex h-11 w-11 items-center justify-center rounded-full lg:hidden", dark ? "hover:bg-white/10" : "hover:bg-black/5")}
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
        <div className="np-in absolute inset-y-0 right-0 flex w-[min(320px,86vw)] flex-col bg-navy text-ivory shadow-np" style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}>
          <div className="flex h-16 items-center justify-between px-4">
            <Logo tone="ivory" />
            <button autoFocus onClick={() => setMenuOpen(false)} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/10" aria-label={locale === "es" ? "Cerrar menú" : "Close menu"}>
              <X size={20} />
            </button>
          </div>
          <nav className="flex flex-col px-2">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} className={cn("flex min-h-12 items-center rounded-lg px-3 font-display text-lg", n.gold ? "text-gold" : "text-ivory hover:bg-white/5")}>
                {n.label}
              </Link>
            ))}
            <Link href={`/${locale}/saved`} className="flex min-h-12 items-center gap-2 rounded-lg px-3 font-display text-lg hover:bg-white/5">
              <Heart size={18} /> {t("saved")} {saved.length > 0 && <span className="text-sm text-mist">({saved.length})</span>}
            </Link>
            <Link href={`/${locale}/owner/new`} className="flex min-h-12 items-center gap-2 rounded-lg px-3 font-display text-lg hover:bg-white/5">
              <Plus size={18} /> {t("publish")}
            </Link>
          </nav>
          <div className="mt-auto border-t border-navy-line p-4">
            {u ? (
              <Link href={`/${locale}${home}`} className="flex min-h-12 items-center gap-3 rounded-lg px-2 hover:bg-white/5">
                <Avatar initials={u.initials} hue={u.hue} size={32} />
                <span className="font-display">{u.name}</span>
              </Link>
            ) : (
              <Link href={`/${locale}/login`} className="flex min-h-12 items-center justify-center gap-2 rounded-np bg-coral-cta font-display font-semibold text-white">
                <LogIn size={18} /> {t("signIn")}
              </Link>
            )}
          </div>
        </div>
      </div>
    )}
    </>
  );
}

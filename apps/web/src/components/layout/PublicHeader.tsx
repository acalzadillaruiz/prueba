"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, Menu, Moon, Plus, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import type { Locale } from "@/types/domain";
import { Logo } from "@/components/brand/Logo";
import { Avatar, Button } from "@/components/ui";
import { useTranslations } from "next-intl";
import { useApp } from "@/lib/store";
import { tx } from "@/lib/i18n";
import { cn } from "@/lib/cn";

export function PublicHeader({ locale, variant = "light" }: { locale: Locale; variant?: "light" | "dark" | "transparent" }) {
  const pathname = usePathname();
  const { saved, user: u } = useApp();
  const t = useTranslations("nav");
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
  const switchHref = pathname.replace(/^\/(es|en)/, `/${other}`);
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
    <header
      className={cn(
        "sticky top-0 z-40 border-b",
        variant === "light" && "border-line bg-ivory/90 backdrop-blur",
        variant === "dark" && "border-navy-line bg-navy text-ivory",
        variant === "transparent" && "border-transparent bg-transparent text-ivory absolute inset-x-0",
      )}
    >
      <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-6 px-4 md:px-6">
        <Link href={`/${locale}`} aria-label="New Place">
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
          <Link href={switchHref} className={cn("rounded-full px-2.5 py-1 font-display text-sm font-semibold", dark ? "text-ivory/80 hover:bg-white/10" : "text-ink/70 hover:bg-black/5")}>
            {other.toUpperCase()}
          </Link>
          <button onClick={toggleTheme} className={cn("rounded-full p-2", variant !== "light" ? "hover:bg-white/10" : "hover:bg-black/5")} aria-label={isDark ? "Light mode" : "Dark mode"} title={isDark ? "Light" : "Dark"}>
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <Link href={`/${locale}/saved`} className={cn("relative hidden rounded-full p-2 sm:block", dark ? "hover:bg-white/10" : "hover:bg-black/5")} aria-label={t("saved")}>
            <Heart size={20} />
            {saved.length > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-coral px-1 text-[10px] font-bold text-white">{saved.length}</span>}
          </Link>
          <Button href={`/${locale}/owner/new`} variant={dark ? "dark-outline" : "outline"} size="sm" className="hidden md:inline-flex">
            <Plus size={15} /> {t("publish")}
          </Button>
          {u ? (
            <Link href={`/${locale}${home}`} className="flex items-center gap-2 rounded-full p-0.5 pr-2 hover:bg-black/5">
              <Avatar initials={u.initials} hue={u.hue} size={32} />
              <span className="hidden font-display text-sm xl:inline">{u.name.split(" ")[0]}</span>
            </Link>
          ) : (
            <Button href={`/${locale}/login`} size="sm">{t("signIn")}</Button>
          )}
          <button className="rounded-full p-2 lg:hidden" aria-label={t("menu")}><Menu size={20} /></button>
        </div>
      </div>
    </header>
  );
}

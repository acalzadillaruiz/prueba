"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Globe, Moon, Sun } from "lucide-react";
import type { Locale } from "@/types/domain";
import { tx } from "@/lib/i18n";
import { cn } from "@/lib/cn";

/**
 * Footer preferences row: language (keeps the current page and its query) and light/dark theme. The theme is the same
 * site-wide switch as the header's (html.dark, saved as np-theme); the header follows the html class, so both stay in sync.
 */
export function FooterPrefs({ locale, className }: { locale: Locale; className?: string }) {
  const pathname = usePathname() ?? `/${locale}`;
  const other: Locale = locale === "es" ? "en" : "es";
  const [isDark, setDark] = useState(false);
  useEffect(() => {
    const el = document.documentElement;
    const read = () => setDark(el.classList.contains("dark"));
    read();
    const mo = new MutationObserver(read);
    mo.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => mo.disconnect();
  }, []);
  const toggle = () => {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("np-theme", next ? "dark" : "light");
    } catch {}
  };
  const href = pathname.replace(/^\/(es|en)/, `/${other}`);
  const pill = "inline-flex min-h-11 items-center gap-2 rounded-full px-3.5 font-display text-[14px] text-ink/75 ring-1 ring-ink/15 transition-colors hover:bg-black/5 hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <Link
        href={href}
        prefetch={false}
        hrefLang={other}
        lang={other}
        onClick={(e) => {
          // Full navigation with the live query (filters may have changed since render).
          e.preventDefault();
          window.location.assign(href + window.location.search);
        }}
        className={pill}
      >
        <Globe size={16} aria-hidden /> {other === "en" ? "English" : "Español"}
      </Link>
      <button type="button" onClick={toggle} aria-pressed={isDark} className={pill}>
        {isDark ? <Sun size={16} aria-hidden /> : <Moon size={16} aria-hidden />}
        {isDark ? tx(locale, "Modo claro", "Light mode") : tx(locale, "Modo oscuro", "Dark mode")}
      </button>
    </div>
  );
}

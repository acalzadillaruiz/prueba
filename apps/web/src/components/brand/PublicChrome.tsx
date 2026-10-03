"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Heart, Home, Map as MapIcon, MessageCircle, User } from "lucide-react";
import type { Locale } from "@/types/domain";
import { useApp } from "@/lib/store";
import { msg } from "@/lib/i18n";
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

/**
 * Floating contact button (brand: navy with a 2 px #E79A7F ring). Opens WhatsApp only when a real number exists;
 * otherwise it links to the contact flow. Sits above the mobile tab bar and hides while the footer or any
 * [data-hide-fab] block (e.g. a contact panel) is on screen, so it never covers content.
 */
export function FloatingContact({ href, label, whatsapp = false, tabbar = false }: { href: string; label: string; whatsapp?: boolean; tabbar?: boolean }) {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const targets = [...document.querySelectorAll("footer, [data-hide-fab]")];
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
    <Link
      href={href}
      aria-label={label}
      title={label}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      tabIndex={hidden ? -1 : undefined}
      aria-hidden={hidden || undefined}
      className={cn(
        "fixed right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-navy text-ivory transition-[opacity,transform] duration-300 md:bottom-8 md:right-8 print:hidden",
        "shadow-[0_0_0_2px_#E79A7F,0_14px_30px_rgba(22,38,56,.35)] hover:bg-navy-2",
        tabbar ? "bottom-[calc(5.25rem+env(safe-area-inset-bottom))]" : "bottom-[calc(1rem+env(safe-area-inset-bottom))]",
        hidden && "pointer-events-none translate-y-3 opacity-0",
      )}
    >
      {whatsapp ? <WhatsAppIcon size={24} /> : <MessageCircle size={23} aria-hidden />}
    </Link>
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

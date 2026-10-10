"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, CalendarCheck, ChevronDown, FlaskConical, Gem, Heart, LogIn, MessageCircle, Moon, Settings, Sun, X } from "lucide-react";
import type { Locale } from "@/types/domain";
import { Logo } from "@/components/brand/Logo";
import { Avatar } from "@/components/ui";
import { useUnreadMessages } from "@/components/brand/PublicChrome";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/cn";
import { msg, tx } from "@/lib/i18n";
import { DemoLoginList } from "./DemoLoginList";

export type DrawerLink = { href: string; label: string; active: boolean };

/**
 * The public menu drawer (phones, and desktop when opened from the compact search). Its own chunk: PublicHeader
 * loads it with next/dynamic, so its code stays out of every page's first load. Escape, body scroll lock and focus
 * return are handled by the header (it owns the open state).
 */
export function MenuDrawer({
  locale,
  onClose,
  searchTypes,
  luxury,
  remote,
  seeker,
  home,
  switchHref,
  onSwitchLang,
  isDark,
  onToggleTheme,
  demo,
}: {
  locale: Locale;
  onClose: () => void;
  searchTypes: DrawerLink[];
  luxury: DrawerLink;
  remote: DrawerLink;
  seeker: boolean;
  home: string;
  switchHref: string;
  onSwitchLang: (e: React.MouseEvent) => void;
  isDark: boolean;
  onToggleTheme: () => void;
  demo: boolean;
}) {
  const { saved, user: u } = useApp();
  const t = msg(locale, "nav");
  const other = locale === "es" ? "en" : "es";
  const [drawerDemo, setDrawerDemo] = useState(false);
  // Unread messages for the "Tu espacio" block: fetched only while the drawer is open (it is mounted only then).
  const unread = useUnreadMessages(seeker);
  const space = [
    { href: `/${locale}/app#visitas`, label: tx(locale, "Visitas", "Tours"), Icon: CalendarCheck },
    { href: `/${locale}/app#mensajes`, label: tx(locale, "Mensajes", "Messages"), Icon: MessageCircle, badge: unread },
    { href: `/${locale}/alerts`, label: tx(locale, "Alertas", "Alerts"), Icon: Bell },
    { href: `/${locale}/account`, label: tx(locale, "Ajustes", "Settings"), Icon: Settings },
  ];
  const drawerItem = "flex min-h-12 items-center gap-3 rounded-lg px-3 font-display text-[16px] hover:bg-white/5";
  return (
    // Not lg:hidden: on desktop it only opens from the compact search's menu button (np:open-menu).
    <div className="fixed inset-0 z-[65]" role="dialog" aria-modal="true" aria-label={t("menu")} id="np-mobile-menu">
      <button className="absolute inset-0 bg-navy/60" aria-label={locale === "es" ? "Cerrar menú" : "Close menu"} onClick={() => onClose()} />
      <div className="np-in absolute inset-y-0 right-0 flex w-[min(340px,88vw)] flex-col bg-navy text-ivory shadow-np" style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="flex h-[72px] items-center justify-between px-5">
          <Logo tone="ivory" />
          <button autoFocus onClick={() => onClose()} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/10" aria-label={locale === "es" ? "Cerrar menú" : "Close menu"}>
            <X size={20} />
          </button>
        </div>
        <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-4 pt-1" aria-label={locale === "es" ? "Principal" : "Main"}>
          {searchTypes.map((n) => (
            <Link key={n.href} href={n.href} onClick={() => onClose()} aria-current={n.active ? "page" : undefined} className="flex min-h-[50px] items-center gap-3 rounded-lg px-3 font-serif text-[23px] hover:bg-white/5">
              {/* Current section: a gold underline (a chevron-like mark read as "expand"). */}
              <span className={cn(n.active && "underline decoration-[#9CC3CC] decoration-2 underline-offset-[7px]")}>{n.label}</span>
            </Link>
          ))}
          <div className="mx-3 my-3 h-px bg-[#B79D83]/40" aria-hidden />
          <Link href={luxury.href} onClick={() => onClose()} aria-current={luxury.active ? "page" : undefined} className={drawerItem}>
            <Gem size={18} strokeWidth={1.6} aria-hidden className="text-[#9CC3CC]" />
            <span className={cn(luxury.active && "underline decoration-[#9CC3CC] decoration-2 underline-offset-[6px]")}>{luxury.label}</span>
          </Link>
          <Link href={remote.href} onClick={() => onClose()} className={drawerItem}>
            <span aria-hidden className="w-[18px] text-center text-[#9CC3CC]">↗</span> {remote.label}
          </Link>
          <Link href={`/${locale}/saved`} onClick={() => onClose()} className={drawerItem}>
            <Heart size={18} aria-hidden /> {t("saved")} {saved.length > 0 && <span className="text-sm text-mist">({saved.length})</span>}
          </Link>
          {seeker && (
            <>
              <div className="mx-3 mb-1 mt-4 font-display text-[12px] font-semibold uppercase tracking-[.18em] text-[#9CC3CC]">{tx(locale, "Tu espacio", "Your space")}</div>
              {space.map(({ href, label, Icon, badge }) => (
                <Link key={href} href={href} onClick={() => onClose()} className={drawerItem}>
                  <Icon size={18} aria-hidden /> {label}
                  {!!badge && (
                    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-[#9CC3CC] px-1.5 text-[11px] font-bold text-navy">
                      {badge}
                      <span className="sr-only">{tx(locale, " sin leer", " unread")}</span>
                    </span>
                  )}
                </Link>
              ))}
            </>
          )}
          <div className="mx-3 my-3 h-px bg-[#B79D83]/40" aria-hidden />
          <div className="flex items-center gap-2 px-1">
            <Link href={switchHref} prefetch={false} onClick={onSwitchLang} hrefLang={other} lang={other} className="flex min-h-12 items-center rounded-lg px-2 font-display text-[16px] hover:bg-white/5">
              {other === "en" ? "English" : "Español"}
            </Link>
            <button onClick={onToggleTheme} aria-pressed={isDark} className="ml-auto flex min-h-12 items-center gap-2 rounded-lg px-3 font-display text-[16px] hover:bg-white/5">
              {isDark ? <Sun size={18} aria-hidden /> : <Moon size={18} aria-hidden />} {isDark ? (locale === "es" ? "Modo claro" : "Light mode") : locale === "es" ? "Modo oscuro" : "Dark mode"}
            </button>
          </div>
          {demo && (
            <div className="mt-2 rounded-xl border border-navy-line">
              <button type="button" onClick={() => setDrawerDemo((o) => !o)} aria-expanded={drawerDemo} className="flex min-h-12 w-full items-center gap-2.5 rounded-xl px-3 font-display text-[15px] text-mist hover:bg-white/5">
                <FlaskConical size={16} className="text-[#9CC3CC]" aria-hidden /> {tx(locale, "Modo demo · entrar como…", "Demo mode · sign in as…")}
                <ChevronDown size={16} aria-hidden className={cn("ml-auto transition-transform", drawerDemo && "rotate-180")} />
              </button>
              {drawerDemo && <DemoLoginList locale={locale} onDone={onClose} className="px-1 pb-1" />}
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
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  Bell,
  Bot,
  Building2,
  Calendar,
  Camera,
  ChevronUp,
  ClipboardList,
  ExternalLink,
  Gauge,
  Home,
  LogOut,
  MessageSquare,
  Moon,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sun,
  Users,
} from "lucide-react";
import type { Role } from "@newplace/config";
import type { Locale } from "@/types/domain";
import { Logo } from "@/components/brand/Logo";
import { Avatar } from "@/components/ui";
import { Count, k } from "@/components/agency/kit";
import { useQuery } from "@tanstack/react-query";
import { logout } from "@/lib/logout";
import { useTranslations } from "next-intl";
import { useApp } from "@/lib/store";
import { AGENCY_PAGE_PATH, AGENCY_PAGE_ROLES, type AgencyPage } from "@/lib/agency-pages";
import { AgencyMobileNav } from "@/components/agency/MobileNav";
import { DemoSidebarSlot } from "@/components/layout/DemoBarSlot";
import { api } from "@/lib/api";
import { tx } from "@/lib/i18n";
import { cn } from "@/lib/cn";

type Item = { href: string; icon: React.ElementType; label: string; roles?: Role[]; page?: AgencyPage };

const AGENCY_NAV: Item[] = (
  [
    ["dashboard", Home, "dashboard"],
    ["leads", MessageSquare, "leads"],
    ["listings", Building2, "listings"],
    ["calendar", Calendar, "calendar"],
    ["capture", Search, "capture"],
    ["media", Camera, "media"],
    ["team", Users, "team"],
    ["reports", BarChart3, "reports"],
    ["auditoria", ShieldCheck, "teamAudit"],
    ["settings", Settings, "settings"],
  ] as const
).map(([page, icon, label]) => ({ href: AGENCY_PAGE_PATH[page], icon, label, roles: AGENCY_PAGE_ROLES[page], page }));

/** Phone bottom bar: the first 4 sections the role may open, in this order (agents live in listings, leads and the calendar). */
const MOBILE_PRIMARY: AgencyPage[] = ["dashboard", "listings", "leads", "calendar", "capture", "media", "team", "reports", "auditoria", "settings"];

const PLATFORM_NAV: Item[] = [
  { href: "", icon: Gauge, label: "globalMetrics" },
  { href: "/agencies", icon: Building2, label: "agencies" },
  { href: "/users", icon: Users, label: "users" },
  { href: "/moderation", icon: ShieldAlert, label: "moderation" },
  { href: "/audit", icon: ClipboardList, label: "audit" },
  { href: "/ai", icon: Bot, label: "ai" },
];

/** Follows the site-wide theme (html.dark, saved as np-theme) so the toggle works here too. */
export function useDarkTheme() {
  const [dark, setDark] = useState(false);
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
    } catch {
      /* private mode: the choice lasts for this page only */
    }
  };
  return { dark, toggle };
}

/** Admin cockpit (brand v4): navy sidebar with the logo, light "Cal" content, Cormorant page title. */
export function AdminShell({
  locale,
  area,
  children,
  title,
  actions,
  eyebrow,
  back,
  headless = false,
}: {
  locale: Locale;
  area: "agency" | "platform";
  children: React.ReactNode;
  title: string;
  actions?: React.ReactNode;
  eyebrow?: string;
  /** "← Volver a …" link above the eyebrow (focused flows such as the new-listing wizard). */
  back?: { href: string; label: string };
  /** The page renders its own <h1> (e.g. one per wizard step): the header keeps eyebrow, back link and bell only. */
  headless?: boolean;
}) {
  const pathname = usePathname();
  const { user, agency } = useApp();
  const t = useTranslations("admin");
  const tr = useTranslations("roles");
  const theme = useDarkTheme();
  const u = user ?? { id: "", name: "—", email: "", role: "SEEKER" as Role, agencyId: null, hue: 200, initials: "?" };
  const canLeads = area === "agency" && ["AGENCY_OWNER", "AGENT", "BACKOFFICE", "SUPERADMIN"].includes(u.role) && !!u.agencyId;
  const newLeads = useQuery({
    queryKey: ["leads", "NEW"],
    queryFn: () => api<{ items: unknown[] }>("leads?stage=NEW"),
    enabled: canLeads,
    refetchInterval: 15_000,
  });
  const nNew = newLeads.data?.items.length ?? 0;
  const badges: Record<string, number | undefined> = { "/leads": newLeads.data?.items.length };
  const base = `/${locale}/${area}`;
  const items = (area === "agency" ? AGENCY_NAV : PLATFORM_NAV).filter((i) => !i.roles || i.roles.includes(u.role));
  const kicker = eyebrow ?? (area === "agency" ? (agency ? `${agency.name} · ${agency.city}` : "New Place") : tx(locale, "New Place · Plataforma", "New Place · Platform"));
  const isActive = (i: Item) => {
    const href = base + i.href;
    return i.href === "" ? pathname === href : pathname.startsWith(href);
  };
  const mobilePrimary = area === "agency" ? MOBILE_PRIMARY.map((p) => items.find((i) => i.page === p)).filter((i): i is Item => !!i).slice(0, 4) : [];
  const toMobile = (i: Item) => ({ href: base + i.href, icon: i.icon, label: t(i.label), active: isActive(i), badge: badges[i.href] });
  const themeLabel = theme.dark ? tx(locale, "Modo claro", "Light mode") : tx(locale, "Modo oscuro", "Dark mode");
  const bell = canLeads && (
    // Bell = new leads waiting (real count, polled); opens the inbox.
    <Link
      href={`${base}/leads`}
      className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-navy shadow-[inset_0_0_0_1px_#D3D7DB] hover:bg-white dark:text-ivory dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,.18)] dark:hover:bg-white/5"
      aria-label={`${t("notifications")}: ${nNew}`}
    >
      <Bell size={17} strokeWidth={1.7} />
      {nNew > 0 && <Count className="absolute -right-1 -top-1 bg-navy text-ivory dark:bg-[#C3C8CD] dark:text-navy">{nNew}</Count>}
    </Link>
  );
  return (
    <div className={cn("min-h-screen bg-ivory text-navy dark:bg-[#0E1013] dark:text-ivory", k.darkVars)}>
      {/* Laptop heights (1024×768, 1280×720): compact logo block, 38 px rows and a one-row footer, so every section shows
          without the nav scrolling; secondary actions live in the account menu at the bottom. */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] flex-col bg-navy text-ivory lg:flex">
        <div className="px-7 pb-6 pt-8 [@media(max-height:820px)]:pb-3 [@media(max-height:820px)]:pt-5">
          <Link href={`/${locale}`} aria-label="New Place" className="inline-block rounded-md"><Logo tone="ivory" /></Link>
          <div className="mt-2 pl-[62px] text-[10px] font-semibold uppercase tracking-[.22em] text-[#A8B0B8]/80 [@media(max-height:820px)]:mt-1">{area === "agency" ? tx(locale, "Agencia", "Agency") : tx(locale, "Plataforma", "Platform")}</div>
        </div>
        <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-4 scrollbar-thin" aria-label={area === "agency" ? tx(locale, "Panel de agencia", "Agency dashboard") : tx(locale, "Consola de plataforma", "Platform console")}>
          {items.map((i) => {
            const active = isActive(i);
            return (
              <Link
                key={i.href}
                href={base + i.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-[38px] items-center gap-3.5 rounded-xl px-4 py-2 text-[14.5px] leading-[22px] transition-colors duration-np",
                  active ? "bg-[#1C2025] text-ivory shadow-[inset_3px_0_0_#A8B0B8]" : "text-ivory/75 hover:bg-white/[.04] hover:text-ivory",
                )}
              >
                <i.icon size={18} strokeWidth={1.6} className={active ? "text-ivory" : "text-ivory/70"} />
                <span className="flex-1">{t(i.label)}</span>
                {(badges[i.href] ?? 0) > 0 && <Count>{badges[i.href]}</Count>}
              </Link>
            );
          })}
        </nav>
        <div className="px-4 pb-4 pt-3">
          <SidebarAccount
            locale={locale}
            card={
              area === "agency" && agency ? (
                <>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-display text-[12px] font-bold text-navy" style={{ background: agency.color }}>{agency.initials}</span>
                  <span className="min-w-0 flex-1 leading-tight">
                    <span className="block truncate text-[13px] font-semibold">{agency.name}</span>
                    <span className="block truncate text-[11px] text-mist">Plan {agency.plan} · {agency.city}</span>
                  </span>
                </>
              ) : (
                <>
                  <Avatar initials={u.initials} hue={u.hue} size={32} />
                  <span className="min-w-0 flex-1 leading-tight">
                    <span className="block truncate text-[13px] font-semibold">{u.name}</span>
                    <span className="block truncate text-[11px] text-mist">{tr(u.role)}</span>
                  </span>
                </>
              )
            }
          >
            {(close) => (
              <>
                <Link href={`/${locale}`} onClick={close} className={menuRow}><ExternalLink size={15} strokeWidth={1.6} aria-hidden /> {t("publicSite")}</Link>
                {area === "agency" && u.role === "SUPERADMIN" && (
                  <Link href={`/${locale}/platform`} onClick={close} className={menuRow}><ClipboardList size={15} strokeWidth={1.6} aria-hidden /> Platform</Link>
                )}
                <button type="button" onClick={theme.toggle} className={menuRow}>
                  {theme.dark ? <Sun size={15} strokeWidth={1.6} aria-hidden /> : <Moon size={15} strokeWidth={1.6} aria-hidden />} {themeLabel}
                </button>
                <button type="button" onClick={() => logout(locale)} className={menuRow}>
                  <LogOut size={15} strokeWidth={1.6} aria-hidden /> {tx(locale, "Cerrar sesión", "Sign out")}
                </button>
                <DemoSidebarSlot locale={locale} />
              </>
            )}
          </SidebarAccount>
        </div>
      </aside>

      <div className="lg:pl-[264px]">
        {/* Phones and tablets: navy bar with the logo + horizontal section nav (same look as the sidebar). */}
        <div className="sticky top-0 z-20 bg-navy text-ivory lg:hidden">
          <div className="flex h-14 items-center gap-2 px-4">
            <Link href={`/${locale}`} aria-label="New Place" className="rounded-md"><Logo tone="ivory" size="sm" /></Link>
            <div className="ml-auto" />
            <button type="button" onClick={theme.toggle} className="flex h-10 w-10 items-center justify-center rounded-full text-ivory/80 hover:bg-white/5" aria-label={themeLabel}>
              {theme.dark ? <Sun size={17} strokeWidth={1.6} /> : <Moon size={17} strokeWidth={1.6} />}
            </button>
            <Avatar initials={u.initials} hue={u.hue} size={30} />
          </div>
          {area !== "agency" && <nav className="no-scrollbar flex gap-1 overflow-x-auto px-3 pb-2.5" aria-label={tx(locale, "Secciones", "Sections")}>
            {items.map((i) => {
              const active = isActive(i);
              return (
                <Link
                  key={i.href}
                  href={base + i.href}
                  aria-current={active ? "page" : undefined}
                  className={cn("flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[14px]", active ? "bg-[#1C2025] text-ivory shadow-[inset_0_-2px_0_#A8B0B8]" : "text-ivory/70")}
                >
                  <i.icon size={15} strokeWidth={1.6} /> {t(i.label)}
                  {(badges[i.href] ?? 0) > 0 && <Count>{badges[i.href]}</Count>}
                </Link>
              );
            })}
            <Link href={`/${locale}`} className="flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[14px] text-ivory/60"><ExternalLink size={15} strokeWidth={1.6} /> {t("publicSite")}</Link>
            <button type="button" onClick={() => logout(locale)} className="flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[14px] text-ivory/60"><LogOut size={15} strokeWidth={1.6} /> {tx(locale, "Salir", "Sign out")}</button>
          </nav>}
        </div>
        {area === "agency" && (
          <AgencyMobileNav
            locale={locale}
            primary={mobilePrimary.map(toMobile)}
            more={items.filter((i) => !mobilePrimary.includes(i)).map(toMobile)}
            agency={agency}
            superadmin={u.role === "SUPERADMIN"}
            onLogout={() => logout(locale)}
          />
        )}

        {area === "agency" && u.role === "SUPERADMIN" && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-[#D4D8DB] bg-rosa/60 px-4 py-2.5 text-sm text-navy md:px-10 dark:border-white/10 dark:bg-[#1C2025] dark:text-ivory">
            {agency ? tx(locale, `Viendo como superadmin: ${agency.name}`, `Viewing as superadmin: ${agency.name}`) : tx(locale, "Elige una agencia en Platform → Agencias para impersonarla.", "Pick an agency in Platform → Agencies to impersonate it.")}
            <Link href={`/${locale}/platform/agencies`} className={cn("ml-auto", k.link)}>Platform →</Link>
          </div>
        )}

        <header className="mx-auto flex max-w-[1360px] flex-wrap items-end gap-x-4 gap-y-3 px-4 pb-2 pt-6 md:px-10 md:pt-10">
          <div className="min-w-0 flex-1 basis-64">
            {back && (
              <Link href={back.href} className="mb-2 inline-flex min-h-10 items-center gap-1.5 rounded-full text-[14px] font-semibold text-navy hover:underline hover:underline-offset-4 dark:text-ivory">
                <ArrowLeft size={16} strokeWidth={1.8} aria-hidden /> {back.label}
              </Link>
            )}
            <div className={cn(k.eyebrow, "truncate")}>{headless ? `${kicker} · ${title}` : kicker}</div>
            {!headless && <h1 className="mt-1.5 font-serif text-[34px] font-medium leading-[1.05] text-navy md:text-[44px] dark:text-ivory" suppressHydrationWarning>{title}</h1>}
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            {actions}
            {bell}
            <div className="hidden items-center gap-2.5 pl-1 xl:flex">
              <Avatar initials={u.initials} hue={u.hue} size={36} />
              <div className="leading-tight">
                <div className="text-[13px] font-semibold">{u.name}</div>
                <div className={cn("text-[12px]", k.muted)}>{tr(u.role)}</div>
              </div>
            </div>
          </div>
        </header>
        <main id="main" className={cn("mx-auto min-w-0 max-w-[1360px] px-4 pt-5 md:px-10 md:pt-7", area === "agency" ? "pb-[calc(6.5rem+env(safe-area-inset-bottom))] lg:pb-16" : "pb-16")}>{children}</main>
      </div>
    </div>
  );
}

const menuRow = "flex w-full items-center gap-3 rounded-lg px-4 py-2 text-left text-[13px] text-ivory/80 hover:bg-white/[.06] hover:text-ivory focus-visible:bg-white/[.06]";

/**
 * Sidebar footer: the agency (or user) card is a disclosure button; it opens, upwards, the secondary actions
 * (public site, theme, sign out, demo switch). Escape or a click outside closes it and focus returns to the card.
 */
function SidebarAccount({ locale, card, children }: { locale: Locale; card: React.ReactNode; children: (close: () => void) => React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);
  const close = () => setOpen(false);
  return (
    <div
      ref={root}
      className="relative"
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          e.stopPropagation();
          setOpen(false);
          btn.current?.focus();
        }
      }}
    >
      {open && (
        <div id="np-account-menu" className="np-in absolute inset-x-0 bottom-full z-20 mb-2 space-y-0.5 rounded-np border border-navy-line bg-[#1C2025] p-1 shadow-np">
          {children(close)}
        </div>
      )}
      <button
        ref={btn}
        type="button"
        aria-expanded={open}
        aria-controls="np-account-menu"
        onClick={() => setOpen((o) => !o)}
        className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-np hover:bg-white/[.07]", open ? "bg-white/[.07]" : "bg-white/[.04]")}
      >
        {card}
        <span className="sr-only">{tx(locale, ": opciones de cuenta", ": account options")}</span>
        <ChevronUp size={16} strokeWidth={1.7} aria-hidden className={cn("shrink-0 text-ivory/60 transition-transform duration-np", open && "rotate-180")} />
      </button>
    </div>
  );
}

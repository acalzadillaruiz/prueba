"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  Bot,
  Building2,
  Calendar,
  Camera,
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
import { AGENCY_PAGE_PATH, AGENCY_PAGE_ROLES } from "@/lib/agency-pages";
import { api } from "@/lib/api";
import { tx } from "@/lib/i18n";
import { cn } from "@/lib/cn";

type Item = { href: string; icon: React.ElementType; label: string; roles?: Role[] };

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
    ["settings", Settings, "settings"],
  ] as const
).map(([page, icon, label]) => ({ href: AGENCY_PAGE_PATH[page], icon, label, roles: AGENCY_PAGE_ROLES[page] }));

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
export function AdminShell({ locale, area, children, title, actions, eyebrow }: { locale: Locale; area: "agency" | "platform"; children: React.ReactNode; title: string; actions?: React.ReactNode; eyebrow?: string }) {
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
  const themeLabel = theme.dark ? tx(locale, "Modo claro", "Light mode") : tx(locale, "Modo oscuro", "Dark mode");
  const bell = canLeads && (
    // Bell = new leads waiting (real count, polled); opens the inbox.
    <Link
      href={`${base}/leads`}
      className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-navy shadow-[inset_0_0_0_1px_#D9D2C4] hover:bg-white dark:text-ivory dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,.18)] dark:hover:bg-white/5"
      aria-label={`${t("notifications")}: ${nNew}`}
    >
      <Bell size={17} strokeWidth={1.7} />
      {nNew > 0 && <Count className="absolute -right-1 -top-1 bg-navy text-ivory dark:bg-[#E79A7F] dark:text-navy">{nNew}</Count>}
    </Link>
  );
  return (
    <div className={cn("min-h-screen bg-ivory text-navy dark:bg-[#101C2B] dark:text-ivory", k.darkVars)}>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] flex-col bg-navy text-ivory lg:flex">
        <div className="px-7 pb-7 pt-8">
          <Link href={`/${locale}`} aria-label="New Place" className="inline-block rounded-md"><Logo tone="ivory" /></Link>
          <div className="mt-2 pl-[62px] text-[10px] font-semibold uppercase tracking-[.22em] text-[#D9C59C]/80">{area === "agency" ? tx(locale, "Agencia", "Agency") : tx(locale, "Plataforma", "Platform")}</div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-4" aria-label={area === "agency" ? tx(locale, "Panel de agencia", "Agency dashboard") : tx(locale, "Consola de plataforma", "Platform console")}>
          {items.map((i) => {
            const active = isActive(i);
            return (
              <Link
                key={i.href}
                href={base + i.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3.5 rounded-xl px-4 py-2.5 text-[15px] transition-colors duration-np",
                  active ? "bg-[#1E3048] text-ivory shadow-[inset_3px_0_0_#D9C59C]" : "text-ivory/75 hover:bg-white/[.04] hover:text-ivory",
                )}
              >
                <i.icon size={18} strokeWidth={1.6} className={active ? "text-ivory" : "text-ivory/70"} />
                <span className="flex-1">{t(i.label)}</span>
                {(badges[i.href] ?? 0) > 0 && <Count>{badges[i.href]}</Count>}
              </Link>
            );
          })}
        </nav>
        <div className="space-y-0.5 px-4 pb-5 pt-4">
          {area === "agency" && agency && (
            <div className="mb-3 flex items-center gap-3 rounded-xl bg-white/[.04] px-3 py-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-display text-[12px] font-bold text-navy" style={{ background: agency.color }}>{agency.initials}</span>
              <div className="min-w-0 leading-tight">
                <div className="truncate text-[13px] font-semibold">{agency.name}</div>
                <div className="text-[11px] text-mist">Plan {agency.plan} · {agency.city}</div>
              </div>
            </div>
          )}
          <Link href={`/${locale}`} className="flex items-center gap-3 rounded-lg px-4 py-2 text-[13px] text-ivory/65 hover:bg-white/[.04] hover:text-ivory"><ExternalLink size={15} strokeWidth={1.6} /> {t("publicSite")}</Link>
          {area === "agency" && u.role === "SUPERADMIN" && (
            <Link href={`/${locale}/platform`} className="flex items-center gap-3 rounded-lg px-4 py-2 text-[13px] text-ivory/65 hover:bg-white/[.04] hover:text-ivory"><ClipboardList size={15} strokeWidth={1.6} /> Platform</Link>
          )}
          <button type="button" onClick={theme.toggle} className="flex w-full items-center gap-3 rounded-lg px-4 py-2 text-[13px] text-ivory/65 hover:bg-white/[.04] hover:text-ivory">
            {theme.dark ? <Sun size={15} strokeWidth={1.6} /> : <Moon size={15} strokeWidth={1.6} />} {themeLabel}
          </button>
          <button type="button" onClick={() => logout(locale)} className="flex w-full items-center gap-3 rounded-lg px-4 py-2 text-[13px] text-ivory/65 hover:bg-white/[.04] hover:text-ivory">
            <LogOut size={15} strokeWidth={1.6} /> {tx(locale, "Cerrar sesión", "Sign out")}
          </button>
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
          <nav className="no-scrollbar flex gap-1 overflow-x-auto px-3 pb-2.5" aria-label={tx(locale, "Secciones", "Sections")}>
            {items.map((i) => {
              const active = isActive(i);
              return (
                <Link
                  key={i.href}
                  href={base + i.href}
                  aria-current={active ? "page" : undefined}
                  className={cn("flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[14px]", active ? "bg-[#1E3048] text-ivory shadow-[inset_0_-2px_0_#D9C59C]" : "text-ivory/70")}
                >
                  <i.icon size={15} strokeWidth={1.6} /> {t(i.label)}
                  {(badges[i.href] ?? 0) > 0 && <Count>{badges[i.href]}</Count>}
                </Link>
              );
            })}
            <Link href={`/${locale}`} className="flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[14px] text-ivory/60"><ExternalLink size={15} strokeWidth={1.6} /> {t("publicSite")}</Link>
            <button type="button" onClick={() => logout(locale)} className="flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[14px] text-ivory/60"><LogOut size={15} strokeWidth={1.6} /> {tx(locale, "Salir", "Sign out")}</button>
          </nav>
        </div>

        {area === "agency" && u.role === "SUPERADMIN" && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-[#E9D2C6] bg-rosa/60 px-4 py-2.5 text-sm text-navy md:px-10 dark:border-white/10 dark:bg-[#1E3048] dark:text-ivory">
            {agency ? tx(locale, `Viendo como superadmin: ${agency.name}`, `Viewing as superadmin: ${agency.name}`) : tx(locale, "Elige una agencia en Platform → Agencias para impersonarla.", "Pick an agency in Platform → Agencies to impersonate it.")}
            <Link href={`/${locale}/platform/agencies`} className={cn("ml-auto", k.link)}>Platform →</Link>
          </div>
        )}

        <header className="mx-auto flex max-w-[1360px] flex-wrap items-end gap-x-4 gap-y-3 px-4 pb-2 pt-6 md:px-10 md:pt-10">
          <div className="min-w-0 flex-1 basis-64">
            <div className={cn(k.eyebrow, "truncate")}>{kicker}</div>
            <h1 className="mt-1.5 font-serif text-[34px] font-medium leading-[1.05] text-navy md:text-[44px] dark:text-ivory" suppressHydrationWarning>{title}</h1>
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
        <main id="main" className="mx-auto min-w-0 max-w-[1360px] px-4 pb-16 pt-5 md:px-10 md:pt-7">{children}</main>
      </div>
    </div>
  );
}

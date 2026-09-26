"use client";

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
  Gauge,
  Home,
  Inbox,
  LayoutGrid,
  Search,
  Settings,
  ShieldAlert,
  Target,
  Users,
} from "lucide-react";
import type { Role } from "@newplace/config";
import type { Locale } from "@/types/domain";
import { Logo } from "@/components/brand/Logo";
import { Avatar } from "@/components/ui";
import { useQuery } from "@tanstack/react-query";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { useTranslations } from "next-intl";
import { useApp } from "@/lib/store";
import { api } from "@/lib/api";
import { tx } from "@/lib/i18n";
import { cn } from "@/lib/cn";

type Item = { href: string; icon: React.ElementType; label: string; roles?: Role[] };

const AGENCY_NAV: Item[] = [
  { href: "", icon: Gauge, label: "dashboard", roles: ["AGENCY_OWNER", "AGENT", "BACKOFFICE", "SUPERADMIN"] },
  { href: "/leads", icon: Inbox, label: "leads", roles: ["AGENCY_OWNER", "AGENT", "BACKOFFICE", "SUPERADMIN"] },
  { href: "/listings", icon: LayoutGrid, label: "listings" },
  { href: "/calendar", icon: Calendar, label: "calendar", roles: ["AGENCY_OWNER", "AGENT", "BACKOFFICE", "PHOTOGRAPHER", "SUPERADMIN"] },
  { href: "/capture", icon: Target, label: "capture", roles: ["AGENCY_OWNER", "CAPTOR", "BACKOFFICE", "SUPERADMIN"] },
  { href: "/media", icon: Camera, label: "media", roles: ["AGENCY_OWNER", "PHOTOGRAPHER", "BACKOFFICE", "SUPERADMIN"] },
  { href: "/team", icon: Users, label: "team", roles: ["AGENCY_OWNER", "BACKOFFICE", "SUPERADMIN"] },
  { href: "/reports", icon: BarChart3, label: "reports", roles: ["AGENCY_OWNER", "BACKOFFICE", "SUPERADMIN"] },
  { href: "/settings", icon: Settings, label: "settings", roles: ["AGENCY_OWNER", "SUPERADMIN"] },
];

const PLATFORM_NAV: Item[] = [
  { href: "", icon: Gauge, label: "globalMetrics" },
  { href: "/agencies", icon: Building2, label: "agencies" },
  { href: "/users", icon: Users, label: "users" },
  { href: "/moderation", icon: ShieldAlert, label: "moderation" },
  { href: "/ai", icon: Bot, label: "ai" },
];

export function AdminShell({ locale, area, children, title, actions }: { locale: Locale; area: "agency" | "platform"; children: React.ReactNode; title: string; actions?: React.ReactNode }) {
  const pathname = usePathname();
  const { user, agency } = useApp();
  const t = useTranslations("admin");
  const tr = useTranslations("roles");
  const u = user ?? { id: "", name: "—", email: "", role: "SEEKER" as Role, agencyId: null, hue: 200, initials: "?" };
  const canLeads = area === "agency" && ["AGENCY_OWNER", "AGENT", "BACKOFFICE", "SUPERADMIN"].includes(u.role) && !!u.agencyId;
  const newLeads = useQuery({
    queryKey: ["leads", "NEW"],
    queryFn: () => api<{ items: unknown[] }>("leads?stage=NEW"),
    enabled: canLeads,
    refetchInterval: 15_000,
  });
  const badges: Record<string, number | undefined> = { "/leads": newLeads.data?.items.length };
  const base = `/${locale}/${area}`;
  const items = (area === "agency" ? AGENCY_NAV : PLATFORM_NAV).filter((i) => !i.roles || i.roles.includes(u.role));
  return (
    <div className="dark min-h-screen bg-navy-2 text-ivory">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-navy-line bg-navy lg:flex">
        <div className="flex h-16 items-center px-5">
          <Link href={`/${locale}`}><Logo tone="ivory" size="sm" /></Link>
          <span className="ml-2 rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-mist">{area === "agency" ? "Agency" : "Platform"}</span>
        </div>
        {area === "agency" && agency && (
          <div className="mx-3 mb-3 flex items-center gap-2.5 rounded-np border border-navy-line bg-navy-card p-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg font-display text-sm font-bold text-navy" style={{ background: agency.color }}>{agency.initials}</span>
            <div className="min-w-0">
              <div className="truncate font-display text-sm font-semibold">{agency.name}</div>
              <div className="text-xs text-mist">Plan {agency.plan} · {agency.city}</div>
            </div>
          </div>
        )}
        <nav className="flex-1 space-y-0.5 px-3">
          {items.map((i) => {
            const href = base + i.href;
            const active = i.href === "" ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={i.href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-[15px] transition-colors duration-np",
                  active ? "bg-coral/15 bg-[#F26B4D26] text-ivory" : "text-ivory/70 hover:bg-white/5 hover:text-ivory",
                )}
              >
                <i.icon size={17} className={active ? "text-coral" : ""} />
                <span className="flex-1">{t(i.label)}</span>
                {(badges[i.href] ?? 0) > 0 && <span className="rounded-full bg-coral px-1.5 text-[11px] font-bold text-white">{badges[i.href]}</span>}
              </Link>
            );
          })}
        </nav>
        <div className="space-y-1 border-t border-navy-line p-3">
          <Link href={`/${locale}`} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-ivory/60 hover:bg-white/5"><Home size={16} /> {t("publicSite")}</Link>
          {area === "agency" && u.role === "SUPERADMIN" && (
            <Link href={`/${locale}/platform`} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-ivory/60 hover:bg-white/5"><ClipboardList size={16} /> Platform</Link>
          )}
          <button onClick={async () => { await signOut({ redirect: false }); window.location.href = `/${locale}`; }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-ivory/60 hover:bg-white/5">
            <LogOut size={16} /> {tx(locale, "Cerrar sesión", "Sign out")}
          </button>
        </div>
      </aside>
      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-navy-line bg-navy-2/90 px-4 backdrop-blur md:px-6">
          <h1 className="font-display text-lg font-semibold md:text-xl">{title}</h1>
          <div className="relative ml-auto hidden w-72 md:block">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-mist" />
            <input className="h-9 w-full rounded-lg border border-navy-line bg-navy pl-9 pr-3 text-sm placeholder:text-mist/60 focus:border-coral focus:outline-none" placeholder={t("search")} aria-label={t("search")} />
          </div>
          {actions}
          <button className="relative rounded-lg p-2 text-ivory/80 hover:bg-white/5" aria-label={t("notifications")}>
            <Bell size={18} />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-coral" />
          </button>
          <div className="flex items-center gap-2.5">
            <Avatar initials={u.initials} hue={u.hue} size={32} />
            <div className="hidden leading-tight xl:block">
              <div className="text-sm font-semibold">{u.name}</div>
              <div className="text-xs text-mist">{tr(u.role)}</div>
            </div>
          </div>
        </header>
        <nav className="no-scrollbar sticky top-16 z-20 flex gap-1 overflow-x-auto border-b border-navy-line bg-navy px-3 py-2 lg:hidden">
          {items.map((i) => {
            const href = base + i.href;
            const active = i.href === "" ? pathname === href : pathname.startsWith(href);
            return (
              <Link key={i.href} href={href} className={cn("flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm", active ? "bg-coral text-white" : "text-ivory/75")}>
                <i.icon size={15} /> {t(i.label)}
              </Link>
            );
          })}
        </nav>
        {area === "agency" && u.role === "SUPERADMIN" && (
          <div className="flex items-center gap-3 border-b border-coral/40 bg-[#F26B4D1a] px-4 py-2 text-sm md:px-6">
            {agency ? tx(locale, `Viendo como superadmin: ${agency.name}`, `Viewing as superadmin: ${agency.name}`) : tx(locale, "Elige una agencia en Platform → Agencias para impersonarla.", "Pick an agency in Platform → Agencies to impersonate it.")}
            <Link href={`/${locale}/platform/agencies`} className="ml-auto font-semibold text-coral">Platform →</Link>
          </div>
        )}
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

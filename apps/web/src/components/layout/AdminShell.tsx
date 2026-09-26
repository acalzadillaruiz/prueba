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
import { useDemo } from "@/lib/store";
import { agencyById, userById } from "@/mock/people";
import { tx } from "@/lib/i18n";
import { cn } from "@/lib/cn";

type Item = { href: string; icon: React.ElementType; label: [string, string]; roles?: Role[]; badge?: string };

const AGENCY_NAV: Item[] = [
  { href: "", icon: Gauge, label: ["Panel", "Dashboard"], roles: ["AGENCY_OWNER", "AGENT", "BACKOFFICE", "SUPERADMIN"] },
  { href: "/leads", icon: Inbox, label: ["Leads", "Leads"], roles: ["AGENCY_OWNER", "AGENT", "BACKOFFICE", "SUPERADMIN"], badge: "4" },
  { href: "/listings", icon: LayoutGrid, label: ["Inmuebles", "Listings"] },
  { href: "/calendar", icon: Calendar, label: ["Calendario", "Calendar"], roles: ["AGENCY_OWNER", "AGENT", "BACKOFFICE", "PHOTOGRAPHER", "SUPERADMIN"] },
  { href: "/capture", icon: Target, label: ["Captación", "Capture"], roles: ["AGENCY_OWNER", "CAPTOR", "BACKOFFICE", "SUPERADMIN"] },
  { href: "/media", icon: Camera, label: ["Fotografía", "Media"], roles: ["AGENCY_OWNER", "PHOTOGRAPHER", "BACKOFFICE", "SUPERADMIN"] },
  { href: "/team", icon: Users, label: ["Equipo", "Team"], roles: ["AGENCY_OWNER", "BACKOFFICE", "SUPERADMIN"] },
  { href: "/reports", icon: BarChart3, label: ["Informes", "Reports"], roles: ["AGENCY_OWNER", "BACKOFFICE", "SUPERADMIN"] },
  { href: "/settings", icon: Settings, label: ["Ajustes", "Settings"], roles: ["AGENCY_OWNER", "SUPERADMIN"] },
];

const PLATFORM_NAV: Item[] = [
  { href: "", icon: Gauge, label: ["Métricas globales", "Global metrics"] },
  { href: "/agencies", icon: Building2, label: ["Agencias", "Agencies"] },
  { href: "/users", icon: Users, label: ["Usuarios", "Users"] },
  { href: "/moderation", icon: ShieldAlert, label: ["Moderación", "Moderation"], badge: "3" },
  { href: "/ai", icon: Bot, label: ["IA · FX · Seed", "AI · FX · Seed"] },
];

export function AdminShell({ locale, area, children, title, actions }: { locale: Locale; area: "agency" | "platform"; children: React.ReactNode; title: string; actions?: React.ReactNode }) {
  const pathname = usePathname();
  const { userId } = useDemo();
  const raw = userById(userId ?? undefined);
  const valid = raw && (raw.role === "SUPERADMIN" || (area === "agency" && !!raw.agencyId));
  const u = valid ? raw : userById(area === "platform" ? "u-super" : "u-owner")!;
  const agency = agencyById(u.agencyId) ?? agencyById("ag-andes")!;
  const base = `/${locale}/${area}`;
  const items = (area === "agency" ? AGENCY_NAV : PLATFORM_NAV).filter((i) => !i.roles || i.roles.includes(u.role));
  const roleLabel: Record<Role, [string, string]> = {
    SUPERADMIN: ["Superadmin", "Superadmin"],
    AGENCY_OWNER: ["Dueño de agencia", "Agency owner"],
    AGENT: ["Agente", "Agent"],
    CAPTOR: ["Captador", "Captor"],
    PHOTOGRAPHER: ["Fotógrafo", "Photographer"],
    BACKOFFICE: ["Backoffice", "Backoffice"],
    OWNER_PRIVATE: ["Propietario", "Owner"],
    SEEKER: ["Buscador", "Seeker"],
  };
  return (
    <div className="dark min-h-screen bg-navy-2 text-ivory">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-navy-line bg-navy lg:flex">
        <div className="flex h-16 items-center px-5">
          <Link href={`/${locale}`}><Logo tone="ivory" size="sm" /></Link>
          <span className="ml-2 rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-mist">{area === "agency" ? "Agency" : "Platform"}</span>
        </div>
        {area === "agency" && (
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
                <span className="flex-1">{tx(locale, i.label[0], i.label[1])}</span>
                {i.badge && <span className="rounded-full bg-coral px-1.5 text-[11px] font-bold text-white">{i.badge}</span>}
              </Link>
            );
          })}
        </nav>
        <div className="space-y-1 border-t border-navy-line p-3">
          <Link href={`/${locale}`} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-ivory/60 hover:bg-white/5"><Home size={16} /> {tx(locale, "Ver sitio público", "View public site")}</Link>
          {area === "agency" && u.role === "SUPERADMIN" && (
            <Link href={`/${locale}/platform`} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-ivory/60 hover:bg-white/5"><ClipboardList size={16} /> Platform</Link>
          )}
        </div>
      </aside>
      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-navy-line bg-navy-2/90 px-4 backdrop-blur md:px-6">
          <h1 className="font-display text-lg font-semibold md:text-xl">{title}</h1>
          <div className="relative ml-auto hidden w-72 md:block">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-mist" />
            <input className="h-9 w-full rounded-lg border border-navy-line bg-navy pl-9 pr-3 text-sm placeholder:text-mist/60 focus:border-coral focus:outline-none" placeholder={tx(locale, "Buscar lead, inmueble, persona…", "Search lead, listing, person…")} />
          </div>
          {actions}
          <button className="relative rounded-lg p-2 text-ivory/80 hover:bg-white/5" aria-label="Notificaciones">
            <Bell size={18} />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-coral" />
          </button>
          <div className="flex items-center gap-2.5">
            <Avatar initials={u.initials} hue={u.hue} size={32} />
            <div className="hidden leading-tight xl:block">
              <div className="text-sm font-semibold">{u.name}</div>
              <div className="text-xs text-mist">{tx(locale, roleLabel[u.role][0], roleLabel[u.role][1])}</div>
            </div>
          </div>
        </header>
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, ExternalLink, LogOut, Menu, X } from "lucide-react";
import type { Locale } from "@/types/domain";
import { tx } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { Count, k } from "./kit";
import { DemoSheetSlot } from "@/components/layout/DemoBarSlot";

export type MobileNavItem = { href: string; icon: React.ElementType; label: string; active: boolean; badge?: number };

const FOCUSABLE = 'a[href], button:not([disabled]), select:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Phone/tablet navigation for the agency cockpit (below lg, where the sidebar is hidden):
 * a fixed bottom bar with the role's 4 main sections + "Más", which opens a bottom sheet with the rest
 * (same role filtering as the sidebar: the caller passes the already-filtered items).
 */
export function AgencyMobileNav({
  locale,
  primary,
  more,
  agency,
  superadmin,
  onLogout,
}: {
  locale: Locale;
  primary: MobileNavItem[];
  more: MobileNavItem[];
  agency?: { name: string; city: string; plan: string; initials: string; color: string } | null;
  superadmin: boolean;
  onLogout: () => void;
}) {
  const pathname = usePathname();
  // Open "at" a path: navigating from the sheet closes it (focus then lands on the new page, not on "Más").
  const [openAt, setOpenAt] = useState<string | null>(null);
  const open = openAt !== null && openAt === pathname;
  const trigger = useRef<HTMLButtonElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const sheetId = useId();
  const moreActive = more.find((i) => i.active);
  const moreBadge = more.reduce((n, i) => n + (i.badge ?? 0), 0);

  const close = useCallback(() => {
    setOpenAt(null);
    requestAnimationFrame(() => trigger.current?.focus());
  }, []);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    sheet.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== "Tab" || !sheet.current) return;
      const nodes = Array.from(sheet.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((n) => n.offsetParent !== null);
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && (document.activeElement === first || !sheet.current.contains(document.activeElement))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (document.activeElement === last || !sheet.current.contains(document.activeElement))) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, close]);

  const barItem = "relative flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 pb-1.5 pt-2 text-[11px] font-semibold leading-none transition-colors duration-np focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy dark:focus-visible:ring-[#9CC3CC]";
  const on = "text-navy dark:text-ivory";
  const off = "text-muted hover:text-navy dark:text-mist dark:hover:text-ivory";
  const indicator = <span aria-hidden className="absolute inset-x-[22%] top-0 h-[3px] rounded-b-full bg-gold-text dark:bg-[#B79D83]" />;
  const sheetRow = "flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left text-[15px] text-navy transition-colors duration-np hover:bg-[#F4EFE7] dark:text-ivory dark:hover:bg-white/[.05]";

  return (
    <>
      <nav
        aria-label={tx(locale, "Secciones", "Sections")}
        data-agency-tabbar
        className="fixed inset-x-0 bottom-0 z-30 border-t border-[#E6DFD3] bg-white/95 shadow-[0_-8px_24px_rgba(28,29,29,.08)] backdrop-blur lg:hidden dark:border-white/10 dark:bg-[#1C1D1D]/95"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="mx-auto flex max-w-xl items-stretch gap-1 px-2">
          {primary.map((i) => (
            <li key={i.href} className="flex flex-1">
              <Link href={i.href} aria-current={i.active ? "page" : undefined} className={cn(barItem, i.active ? on : off)}>
                {i.active && indicator}
                <span className="relative">
                  <i.icon size={21} strokeWidth={i.active ? 2 : 1.6} aria-hidden />
                  {(i.badge ?? 0) > 0 && <Count className="absolute -right-3 -top-2 h-[18px] min-w-[18px] bg-navy px-1 text-[10px] text-ivory dark:bg-[#9CC3CC] dark:text-navy">{i.badge}</Count>}
                </span>
                <span className="max-w-full truncate">{i.label}</span>
              </Link>
            </li>
          ))}
          <li className="flex flex-1">
            <button
              ref={trigger}
              type="button"
              onClick={() => setOpenAt(pathname)}
              aria-haspopup="dialog"
              aria-expanded={open}
              aria-controls={open ? sheetId : undefined}
              className={cn(barItem, moreActive ? on : off)}
            >
              {moreActive && indicator}
              <span className="relative">
                <Menu size={21} strokeWidth={moreActive ? 2 : 1.6} aria-hidden />
                {moreBadge > 0 && <Count className="absolute -right-3 -top-2 h-[18px] min-w-[18px] bg-navy px-1 text-[10px] text-ivory dark:bg-[#9CC3CC] dark:text-navy">{moreBadge}</Count>}
              </span>
              <span>{tx(locale, "Más", "More")}</span>
              {moreActive && <span className="sr-only">{tx(locale, ` (estás en ${moreActive.label})`, ` (you are in ${moreActive.label})`)}</span>}
            </button>
          </li>
        </ul>
      </nav>

      {open && (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <button type="button" tabIndex={-1} aria-hidden className="absolute inset-0 h-full w-full cursor-default bg-navy/50 backdrop-blur-[2px]" onClick={() => close()} />
          <div
            ref={sheet}
            id={sheetId}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="np-in absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-[4px] bg-ivory pb-4 shadow-[0_-12px_32px_rgba(28,29,29,.18)] dark:bg-[#1C1D1D]"
            style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
          >
            <div className="sticky top-0 z-10 bg-ivory px-5 pb-2 pt-2.5 dark:bg-[#1C1D1D]">
              <div aria-hidden className="mx-auto h-1 w-10 rounded-full bg-[#CDBFAC] dark:bg-white/20" />
              <div className="mt-3 flex items-center justify-between gap-3">
                <h2 id={titleId} className={k.titleSm}>{tx(locale, "Más secciones", "More sections")}</h2>
                <button
                  type="button"
                  data-autofocus
                  onClick={() => close()}
                  className="flex h-11 w-11 items-center justify-center rounded-full text-navy hover:bg-[#DED5C7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy dark:text-ivory dark:hover:bg-white/[.06] dark:focus-visible:ring-[#9CC3CC]"
                  aria-label={tx(locale, "Cerrar", "Close")}
                >
                  <X size={20} aria-hidden />
                </button>
              </div>
            </div>

            <div className="px-4">
              {agency && (
                <div className={cn("mb-3 flex items-center gap-3 rounded-2xl px-3.5 py-3", k.soft)}>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-display text-[12px] font-bold text-navy" style={{ background: agency.color }} aria-hidden>{agency.initials}</span>
                  <div className="min-w-0 leading-tight">
                    <div className="truncate text-[14px] font-semibold">{agency.name}</div>
                    <div className={cn("text-[12px]", k.muted)}>Plan {agency.plan} · {agency.city}</div>
                  </div>
                </div>
              )}

              {more.length > 0 && (
                <ul className="grid grid-cols-2 gap-2" aria-label={tx(locale, "Secciones", "Sections")}>
                  {more.map((i) => (
                    <li key={i.href}>
                      <Link
                        href={i.href}
                        aria-current={i.active ? "page" : undefined}
                        onClick={() => (i.active ? close() : setOpenAt(null))}
                        className={cn(
                          "flex min-h-[64px] items-center gap-3 rounded-2xl bg-white px-3.5 py-3 text-[15px] font-medium text-navy shadow-[inset_0_0_0_1px_#E6DFD3] transition-colors duration-np hover:bg-[#F6F2EA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy dark:bg-white/[.04] dark:text-ivory dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,.1)] dark:focus-visible:ring-[#9CC3CC]",
                          i.active && "bg-[#DED5C7] shadow-[inset_0_0_0_2px_#1C1D1D] dark:bg-white/10 dark:shadow-[inset_0_0_0_2px_#9CC3CC]",
                        )}
                      >
                        <i.icon size={19} strokeWidth={1.6} aria-hidden className="shrink-0" />
                        <span className="min-w-0 flex-1 leading-tight">{i.label}</span>
                        {(i.badge ?? 0) > 0 && <Count>{i.badge}</Count>}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}

              <div className={cn("mt-4 border-t pt-2", k.line)}>
                <Link href={`/${locale}`} onClick={() => setOpenAt(null)} className={sheetRow}><ExternalLink size={18} strokeWidth={1.6} aria-hidden /> {tx(locale, "Ver sitio público", "View public site")}</Link>
                {superadmin && <Link href={`/${locale}/platform`} onClick={() => setOpenAt(null)} className={sheetRow}><ClipboardList size={18} strokeWidth={1.6} aria-hidden /> Platform</Link>}
                <DemoSheetSlot locale={locale} rowClass={sheetRow} onDone={() => setOpenAt(null)} />
                <button type="button" onClick={onLogout} className={sheetRow}><LogOut size={18} strokeWidth={1.6} aria-hidden /> {tx(locale, "Cerrar sesión", "Sign out")}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

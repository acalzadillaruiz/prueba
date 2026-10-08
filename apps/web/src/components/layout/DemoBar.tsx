"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { FlaskConical, LogIn } from "lucide-react";
import type { Locale } from "@/types/domain";
import { useApp } from "@/lib/store";
import { Avatar } from "@/components/ui";
import { tx } from "@/lib/i18n";
import { useDemoVisible } from "./useDemoVisible";
import { DemoLoginList } from "./DemoLoginList";

/**
 * Floating demo pill for the pages without the public header (back-office, offline…). On public pages the demo
 * switch lives inside the header (menu drawer on phones, a small header button on desktop) and globals.css hides
 * this pill (`body:has([data-public-header]) [data-demobar]`), so it never sits over content.
 */
export function DemoBar({ locale }: { locale: Locale }) {
  const { user } = useApp();
  const [open, setOpen] = useState(false);
  const visible = useDemoVisible();
  // In the back-office the sidebar (sign out, public site) sits bottom-left on desktop; phones have its bottom bar.
  const path = usePathname();
  const admin = /^\/(es|en)\/(agency|platform)(\/|$)/.test(path);
  // The gate page can't use the demo login (the API needs the preview cookie first), so the pill is pointless there.
  const gate = /^\/(es|en)\/acceso\/?$/.test(path);
  if (!visible || gate) return null;
  // Back-office below lg: its own bottom bar (Panel · Inmuebles · Leads · Calendario · Más) owns the screen's foot, so
  // the demo switch is a slim tab on the LEFT edge just above that bar: it covers only the page gutter (the lists'
  // badges and actions sit on the right, their checkboxes start past the gutter), never the bar. From lg: the pill,
  // bottom-left, clear of the sidebar.
  if (admin)
    return (
      <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-0 z-50 print:hidden lg:bottom-4 lg:left-64 lg:mb-[env(safe-area-inset-bottom)]" data-demobar data-demobar-admin>
        {open && (
          <div className="absolute bottom-full left-2 mb-2 lg:static lg:mb-0">
            <div className="np-in max-h-[70svh] w-64 overflow-y-auto rounded-np border border-navy-line bg-navy py-1 text-ivory shadow-np lg:mb-2">
              <div className="border-b border-navy-line px-3 py-2 text-xs font-semibold uppercase tracking-wide text-mist">{tx(locale, "Entrar como… (modo demo)", "Sign in as… (demo mode)")}</div>
              <DemoLoginList locale={locale} onDone={() => setOpen(false)} className="p-1" />
            </div>
          </div>
        )}
        <button onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={tx(locale, "Modo demo: entrar como…", "Demo mode: sign in as…")} className="relative flex h-10 w-6 items-center justify-center rounded-r-full border border-l-0 border-navy-line bg-navy/90 text-sm text-ivory opacity-75 shadow-np backdrop-blur transition-opacity after:absolute after:-inset-y-1 after:-right-2 after:left-0 after:content-[''] hover:opacity-100 lg:h-auto lg:min-h-11 lg:w-auto lg:min-w-11 lg:gap-2 lg:rounded-full lg:border-l lg:p-1.5 lg:pr-3.5 lg:opacity-100 lg:after:hidden">
          <span className="hidden lg:contents">{user ? <Avatar initials={user.initials} hue={user.hue} size={26} /> : <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-white/10"><LogIn size={14} /></span>}</span>
          <FlaskConical size={13} className="text-[#C9A574] lg:h-[15px] lg:w-[15px]" aria-hidden />
          <span className="hidden font-display lg:inline">Demo</span>
        </button>
      </div>
    );
  return (
    // Phones: a slim tab on the right edge, mid-height. From sm up: the pill, bottom-left.
    <div className="fixed right-0 top-[42%] z-50 print:hidden sm:bottom-4 sm:left-4 sm:right-auto sm:top-auto sm:mb-[env(safe-area-inset-bottom)]" data-demobar>
      {open && (
        <div className="absolute right-full top-1/2 mr-2 -translate-y-1/2 sm:static sm:mr-0 sm:translate-y-0">
          <div className="np-in max-h-[85svh] w-64 overflow-y-auto rounded-np border border-navy-line bg-navy py-1 text-ivory shadow-np sm:mb-2">
            <div className="border-b border-navy-line px-3 py-2 text-xs font-semibold uppercase tracking-wide text-mist">{tx(locale, "Entrar como… (modo demo)", "Sign in as… (demo mode)")}</div>
            <DemoLoginList locale={locale} onDone={() => setOpen(false)} className="p-1" />
          </div>
        </div>
      )}
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={tx(locale, "Modo demo: entrar como…", "Demo mode: sign in as…")} className="flex h-11 w-7 items-center justify-center rounded-l-full border border-r-0 border-navy-line bg-navy/90 text-sm text-ivory opacity-75 shadow-np backdrop-blur transition-opacity hover:opacity-100 sm:h-auto sm:min-h-11 sm:w-auto sm:min-w-11 sm:gap-2 sm:rounded-full sm:border-r sm:p-1.5 sm:pr-3.5 sm:opacity-100">
        <span className="hidden sm:contents">{user ? <Avatar initials={user.initials} hue={user.hue} size={26} /> : <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-white/10"><LogIn size={14} /></span>}</span>
        <FlaskConical size={14} className="text-[#C9A574]" />
        <span className="hidden font-display sm:inline">Demo</span>
      </button>
    </div>
  );
}

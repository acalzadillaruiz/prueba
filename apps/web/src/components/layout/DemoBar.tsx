"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { FlaskConical, LogIn } from "lucide-react";
import type { Locale } from "@/types/domain";
import { useApp } from "@/lib/store";
import { Avatar } from "@/components/ui";
import { tx } from "@/lib/i18n";
import { cn } from "@/lib/cn";
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
  // In the back-office the sidebar (sign out, public site) sits bottom-left: keep the pill clear of it.
  const path = usePathname();
  const admin = /^\/(es|en)\/(agency|platform)(\/|$)/.test(path);
  // The gate page can't use the demo login (the API needs the preview cookie first), so the pill is pointless there.
  const gate = /^\/(es|en)\/acceso\/?$/.test(path);
  if (!visible || gate) return null;
  return (
    // Phones: a slim tab on the right edge, mid-height. From sm up: the pill, bottom-left.
    <div className={cn("fixed right-0 top-[42%] z-50 print:hidden sm:bottom-4 sm:left-4 sm:right-auto sm:top-auto sm:mb-[env(safe-area-inset-bottom)]", admin && "lg:left-64")} data-demobar>
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

"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { FlaskConical, Loader2, LogIn, LogOut } from "lucide-react";
import type { Locale } from "@/types/domain";
import { useApp } from "@/lib/store";
import { DEMO_ENABLED, DEMO_LOGINS } from "@/lib/demo";
import { Avatar } from "@/components/ui";
import { tx } from "@/lib/i18n";
import { cn } from "@/lib/cn";

/** DEMO_AUTH=true — "Entrar como…" for QA without Google console. Uses the real Auth.js "demo" provider. */
export function DemoBar({ locale }: { locale: Locale }) {
  const { user, refresh } = useApp();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);
  const router = useRouter();
  // In the back-office the sidebar (sign out, public site) sits bottom-left: keep the pill clear of it.
  const path = usePathname();
  const admin = /^\/(es|en)\/(agency|platform)(\/|$)/.test(path);
  // The gate page can't use the demo login (the API needs the preview cookie first), so the pill is pointless there.
  const gate = /^\/(es|en)\/acceso\/?$/.test(path);
  useEffect(() => setHidden(new URLSearchParams(window.location.search).has("shot")), []);
  if (!DEMO_ENABLED || hidden || gate) return null;
  const go = async (email: string, home: string) => {
    setBusy(email);
    // Loaded on demand: next-auth/react stays out of every public page bundle.
    const { signIn } = await import("next-auth/react");
    await signIn("demo", { email, redirect: false });
    await refresh();
    setOpen(false);
    setBusy(null);
    router.push(`/${locale}${home}`);
    router.refresh();
  };
  return (
    // Phones: a slim tab on the right edge, mid-height, clear of the tab bar, the sticky contact bar, the results sheet
    // and the CTAs. From sm up: the pill, bottom-left (globals.css lifts it above the sticky bars on tablets).
    <div className={cn("fixed right-0 top-[42%] z-50 print:hidden sm:bottom-4 sm:left-4 sm:right-auto sm:top-auto sm:mb-[env(safe-area-inset-bottom)]", admin && "lg:left-64")} data-demobar>
      {open && (
        // Outer box positions (phones: to the left of the tab, vertically centred), inner box animates: np-in's
        // `transform` would otherwise cancel the centring translate.
        <div className="absolute right-full top-1/2 mr-2 -translate-y-1/2 sm:static sm:mr-0 sm:translate-y-0">
        <div className="np-in max-h-[85svh] w-64 overflow-y-auto rounded-np border border-navy-line bg-navy text-ivory shadow-np sm:mb-2 sm:max-h-none sm:overflow-hidden">
          <div className="border-b border-navy-line px-3 py-2 text-xs font-semibold uppercase tracking-wide text-mist">{tx(locale, "Entrar como… (modo demo)", "Sign in as… (demo mode)")}</div>
          {DEMO_LOGINS.map((d) => (
            <button key={d.email} className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-white/5" onClick={() => go(d.email, d.home)} disabled={!!busy}>
              <Avatar initials={d.initials} hue={d.hue} size={26} />
              <span className="flex-1">
                <span className="block font-semibold leading-tight">{tx(locale, d.label.es, d.label.en)}</span>
                <span className="block text-xs text-mist">{d.email}</span>
              </span>
              {busy === d.email ? <Loader2 size={14} className="animate-spin" /> : user?.email === d.email && <span className="h-2 w-2 rounded-full bg-[#C9A574]" />}
            </button>
          ))}
          {user && (
            <button className="flex w-full items-center gap-2.5 border-t border-navy-line px-3 py-2 text-left text-sm text-mist hover:bg-white/5" onClick={() => import("@/lib/logout").then((m) => m.logout(locale))}>
              <LogOut size={15} /> {tx(locale, "Cerrar sesión", "Sign out")}
            </button>
          )}
        </div>
        </div>
      )}
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={tx(locale, "Modo demo: entrar como…", "Demo mode: sign in as…")} className="flex h-11 w-7 items-center justify-center rounded-l-full border border-r-0 border-navy-line bg-navy/90 text-sm text-ivory opacity-75 shadow-np backdrop-blur transition-opacity hover:opacity-100 sm:h-auto sm:min-h-11 sm:w-auto sm:min-w-11 sm:gap-2 sm:rounded-full sm:border-r sm:p-1.5 sm:pr-3.5 sm:opacity-100">
        <span className="hidden sm:contents">{user ? <Avatar initials={user.initials} hue={user.hue} size={26} /> : <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-white/10"><LogIn size={14} /></span>}</span>
        {/* phones: icon-only edge tab (never covers content); larger screens: avatar + "Demo" */}
        <FlaskConical size={14} className="text-[#C9A574]" />
        <span className="hidden font-display sm:inline">Demo</span>
      </button>
    </div>
  );
}

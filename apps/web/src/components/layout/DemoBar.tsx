"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, signOut } from "next-auth/react";
import { FlaskConical, Loader2, LogIn, LogOut } from "lucide-react";
import type { Locale } from "@/types/domain";
import { useApp } from "@/lib/store";
import { DEMO_ENABLED, DEMO_LOGINS } from "@/lib/demo";
import { Avatar } from "@/components/ui";
import { tx } from "@/lib/i18n";

/** DEMO_AUTH=true — "Entrar como…" for QA without Google console. Uses the real Auth.js "demo" provider. */
export function DemoBar({ locale }: { locale: Locale }) {
  const { user } = useApp();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);
  const router = useRouter();
  useEffect(() => setHidden(new URLSearchParams(window.location.search).has("shot")), []);
  if (!DEMO_ENABLED || hidden) return null;
  const go = async (email: string, home: string) => {
    setBusy(email);
    await signIn("demo", { email, redirect: false });
    setOpen(false);
    setBusy(null);
    router.push(`/${locale}${home}`);
    router.refresh();
  };
  return (
    <div className="fixed bottom-4 left-4 z-50 print:hidden" data-demobar>
      {open && (
        <div className="np-in mb-2 w-64 overflow-hidden rounded-np border border-navy-line bg-navy text-ivory shadow-np">
          <div className="border-b border-navy-line px-3 py-2 text-xs font-semibold uppercase tracking-wide text-mist">{tx(locale, "Entrar como… (modo demo)", "Sign in as… (demo mode)")}</div>
          {DEMO_LOGINS.map((d) => (
            <button key={d.email} className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-white/5" onClick={() => go(d.email, d.home)} disabled={!!busy}>
              <Avatar initials={d.initials} hue={d.hue} size={26} />
              <span className="flex-1">
                <span className="block font-semibold leading-tight">{tx(locale, d.label.es, d.label.en)}</span>
                <span className="block text-xs text-mist">{d.email}</span>
              </span>
              {busy === d.email ? <Loader2 size={14} className="animate-spin" /> : user?.email === d.email && <span className="h-2 w-2 rounded-full bg-coral" />}
            </button>
          ))}
          {user && (
            <button className="flex w-full items-center gap-2.5 border-t border-navy-line px-3 py-2 text-left text-sm text-mist hover:bg-white/5" onClick={async () => { await signOut({ redirect: false }); setOpen(false); router.push(`/${locale}`); router.refresh(); }}>
              <LogOut size={15} /> {tx(locale, "Cerrar sesión", "Sign out")}
            </button>
          )}
        </div>
      )}
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 rounded-full border border-navy-line bg-navy/95 py-1.5 pl-1.5 pr-3.5 text-sm text-ivory shadow-np backdrop-blur">
        {user ? <Avatar initials={user.initials} hue={user.hue} size={26} /> : <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-white/10"><LogIn size={14} /></span>}
        <FlaskConical size={14} className="text-coral" />
        <span className="font-display">Demo</span>
      </button>
    </div>
  );
}

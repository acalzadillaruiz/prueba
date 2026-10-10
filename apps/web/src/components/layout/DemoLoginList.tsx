"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogOut } from "lucide-react";
import type { Locale } from "@/types/domain";
import { useApp } from "@/lib/store";
import { DEMO_LOGINS } from "@/lib/demo";
import { Avatar } from "@/components/ui";
import { tx } from "@/lib/i18n";

/**
 * DEMO_AUTH=true — "Entrar como…" list (real Auth.js "demo" provider) on a navy surface. Used inside the public
 * menu drawer / header popover, and in the back-office pill below.
 */
export function DemoLoginList({ locale, onDone, className }: { locale: Locale; onDone?: () => void; className?: string }) {
  const { user, refresh } = useApp();
  const [busy, setBusy] = useState<string | null>(null);
  const router = useRouter();
  const go = async (email: string, home: string) => {
    setBusy(email);
    // Loaded on demand: next-auth/react stays out of every public page bundle.
    const { signIn } = await import("next-auth/react");
    await signIn("demo", { email, redirect: false });
    await refresh();
    setBusy(null);
    onDone?.();
    router.push(`/${locale}${home}`);
    router.refresh();
  };
  return (
    <div className={className}>
      {DEMO_LOGINS.map((d) => (
        <button key={d.email} type="button" className="flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 py-1.5 text-left text-sm text-ivory hover:bg-white/5" onClick={() => go(d.email, d.home)} disabled={!!busy}>
          <Avatar initials={d.initials} hue={d.hue} size={26} />
          <span className="min-w-0 flex-1">
            <span className="block font-semibold leading-tight">{tx(locale, d.label.es, d.label.en)}</span>
            <span className="block truncate text-xs text-mist">{d.email}</span>
          </span>
          {busy === d.email ? <Loader2 size={14} className="animate-spin" aria-hidden /> : user?.email === d.email && <span className="h-2 w-2 rounded-full bg-[#9CC3CC]" aria-label={tx(locale, "Sesión actual", "Current session")} />}
        </button>
      ))}
      {user && (
        <button type="button" className="mt-1 flex min-h-11 w-full items-center gap-2.5 rounded-lg border-t border-navy-line px-3 py-2 text-left text-sm text-mist hover:bg-white/5" onClick={() => import("@/lib/logout").then((m) => m.logout(locale))}>
          <LogOut size={15} aria-hidden /> {tx(locale, "Cerrar sesión", "Sign out")}
        </button>
      )}
    </div>
  );
}

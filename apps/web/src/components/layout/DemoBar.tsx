"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FlaskConical, LogIn } from "lucide-react";
import type { Locale } from "@/types/domain";
import { DEMO_LOGINS, userById } from "@/mock/people";
import { useDemo } from "@/lib/store";
import { Avatar } from "@/components/ui";
import { tx } from "@/lib/i18n";

/** DEMO_AUTH=true — "Entrar como…" for QA without Google console. */
export function DemoBar({ locale }: { locale: Locale }) {
  const { userId, login } = useDemo();
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const u = userById(userId ?? undefined);
  const [hidden, setHidden] = useState(false);
  useEffect(() => setHidden(new URLSearchParams(window.location.search).has("shot")), []);
  if (hidden) return null;
  return (
    <div className="fixed bottom-4 left-4 z-50 print:hidden" data-demobar>
      {open && (
        <div className="np-in mb-2 w-64 overflow-hidden rounded-np border border-navy-line bg-navy text-ivory shadow-np">
          <div className="border-b border-navy-line px-3 py-2 text-xs font-semibold uppercase tracking-wide text-mist">
            {tx(locale, "Entrar como… (modo demo)", "Sign in as… (demo mode)")}
          </div>
          {DEMO_LOGINS.map((d) => {
            const du = userById(d.userId)!;
            return (
              <button
                key={d.userId}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-white/5"
                onClick={() => {
                  login(d.userId);
                  setOpen(false);
                  router.push(`/${locale}${d.home}`);
                }}
              >
                <Avatar initials={du.initials} hue={du.hue} size={26} />
                <span className="flex-1">
                  <span className="block font-semibold leading-tight">{tx(locale, d.label.es, d.label.en)}</span>
                  <span className="block text-xs text-mist">{du.email}</span>
                </span>
                {userId === d.userId && <span className="h-2 w-2 rounded-full bg-coral" />}
              </button>
            );
          })}
        </div>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full border border-navy-line bg-navy/95 py-1.5 pl-1.5 pr-3.5 text-sm text-ivory shadow-np backdrop-blur"
      >
        {u ? <Avatar initials={u.initials} hue={u.hue} size={26} /> : <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-white/10"><LogIn size={14} /></span>}
        <FlaskConical size={14} className="text-coral" />
        <span className="font-display">{tx(locale, "Demo", "Demo")}</span>
      </button>
    </div>
  );
}

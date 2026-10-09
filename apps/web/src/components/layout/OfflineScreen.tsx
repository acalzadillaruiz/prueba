"use client";

import { useEffect, useState } from "react";
import { Heart, RotateCw, WifiOff } from "lucide-react";
import { readSavedOffline, type OfflineCard } from "@/lib/offline-saved";
import type { Locale } from "@/types/domain";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui";
import { tx } from "@/lib/i18n";

/** Static offline fallback (no user data, so the service worker can precache it safely). */
export function OfflineScreen({ locale }: { locale: Locale }) {
  const [saved, setSaved] = useState<OfflineCard[]>([]);
  useEffect(() => setSaved(readSavedOffline()), []);
  return (
    <main id="main" lang={locale} className="flex min-h-screen flex-col items-center justify-center gap-4 bg-navy px-6 py-16 text-center text-ivory">
      <Logo tone="ivory" size="lg" animate />
      <WifiOff className="mt-10 text-[#C9A574]" size={30} aria-hidden />
      <h1 className="text-[36px] leading-tight md:text-[44px]">{tx(locale, "Estás sin conexión", "You’re offline")}</h1>
      <p className="max-w-sm text-[16px] text-ivory/70">
        {tx(locale, "Las páginas que ya visitaste siguen aquí. Cuando vuelva la señal, inténtalo otra vez.", "Pages you’ve already visited are still here. Try again once you’re back online.")}
      </p>
      <div className="mt-2 flex gap-3">
        <Button variant="light" onClick={() => window.location.reload()}>
          <RotateCw size={16} aria-hidden /> {tx(locale, "Intentar de nuevo", "Try again")}
        </Button>
        <Button href={`/${locale}`} variant="dark-outline">{tx(locale, "Inicio", "Home")}</Button>
      </div>
      {saved.length > 0 && (
        <section className="mt-6 w-full max-w-md text-left" aria-labelledby="offline-saved">
          <h2 id="offline-saved" className="mb-3 flex items-center gap-2 text-[24px]">
            <Heart size={16} className="text-[#C9A574]" aria-hidden /> {tx(locale, "Tus guardados", "Your saved homes")}
          </h2>
          <ul className="divide-y divide-navy-line rounded-2xl border border-navy-line bg-navy-card">
            {saved.map((c) => (
              <li key={c.slug}>
                <a href={`/${locale}/listing/${c.slug}`} className="flex min-h-12 items-center justify-between gap-3 px-4 py-2 hover:bg-white/5">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{locale === "en" ? c.title_en || c.title_es : c.title_es}</span>
                    <span className="block text-sm text-mist">{c.zone}, {c.city}</span>
                  </span>
                  <span className="shrink-0 font-serif text-[17px] font-semibold">{locale === "en" && c.price_en ? c.price_en : c.price}</span>
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-sm text-mist">{tx(locale, "Las casas que abriste con conexión también te esperan.", "Homes you opened while online will still load.")}</p>
        </section>
      )}
    </main>
  );
}

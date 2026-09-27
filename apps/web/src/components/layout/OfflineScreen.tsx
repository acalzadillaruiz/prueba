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
    <main id="main" lang={locale} className="flex min-h-screen flex-col items-center justify-center gap-4 bg-navy px-6 text-center text-ivory">
      <Logo tone="ivory" size="lg" />
      <WifiOff className="text-coral" size={36} aria-hidden />
      <h1 className="font-display text-2xl font-semibold">{tx(locale, "Estás sin conexión", "You’re offline")}</h1>
      <p className="max-w-sm text-mist">
        {tx(locale, "Las páginas públicas que ya visitaste siguen disponibles. Reintenta cuando vuelva la señal.", "Public pages you already visited are still available. Retry when you’re back online.")}
      </p>
      <div className="flex gap-3">
        <Button onClick={() => window.location.reload()}>
          <RotateCw size={16} aria-hidden /> {tx(locale, "Reintentar", "Retry")}
        </Button>
        <Button href={`/${locale}`} variant="dark-outline">{tx(locale, "Inicio", "Home")}</Button>
      </div>
      {saved.length > 0 && (
        <section className="mt-6 w-full max-w-md text-left" aria-labelledby="offline-saved">
          <h2 id="offline-saved" className="mb-2 flex items-center gap-2 font-display text-lg font-semibold">
            <Heart size={16} className="text-coral" aria-hidden /> {tx(locale, "Tus guardados", "Your saved homes")}
          </h2>
          <ul className="divide-y divide-navy-line rounded-np border border-navy-line bg-navy-card">
            {saved.map((c) => (
              <li key={c.slug}>
                <a href={`/${locale}/listing/${c.slug}`} className="flex min-h-12 items-center justify-between gap-3 px-4 py-2 hover:bg-white/5">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{locale === "en" ? c.title_en || c.title_es : c.title_es}</span>
                    <span className="block text-xs text-mist">{c.zone}, {c.city}</span>
                  </span>
                  <span className="shrink-0 font-display text-sm">{c.price}</span>
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-mist">{tx(locale, "Se abren las fichas que ya visitaste con conexión.", "Listings you already opened online will load.")}</p>
        </section>
      )}
    </main>
  );
}

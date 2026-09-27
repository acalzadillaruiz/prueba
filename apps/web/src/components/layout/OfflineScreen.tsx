"use client";

import { RotateCw, WifiOff } from "lucide-react";
import type { Locale } from "@/types/domain";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui";
import { tx } from "@/lib/i18n";

/** Static offline fallback (no user data, so the service worker can precache it safely). */
export function OfflineScreen({ locale }: { locale: Locale }) {
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
    </main>
  );
}

"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import type { Listing, Locale } from "@/types/domain";
import { ListingCard } from "@/components/listing/ListingCard";
import { Button } from "@/components/ui";
import { useApp } from "@/lib/store";
import { Empty, k } from "@/components/agency/kit";
import { money, priceSuffix, tx } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { storeSavedOffline } from "@/lib/offline-saved";
import { useListingsByIds } from "@/components/compare/useListingsByIds";
import { authHrefs } from "./SignupPrompt";

/**
 * Saved homes. Signed in: the account's list (server-rendered in `all`). Without an account: the hearts kept on this
 * device, fetched from the public API, with a gentle nudge to create an account. Comparing happens in the tray and
 * on /compare (the side-by-side table no longer lives here).
 */
export function SavedView({ locale, all }: { locale: Locale; all: Listing[] }) {
  const { saved, user } = useApp();
  const { items, loading } = useListingsByIds(saved, all);
  // Keep a light copy on the device so "Guardados" works offline (the offline screen lists them).
  useEffect(() => {
    if (loading) return;
    storeSavedOffline(items.map((l) => ({ slug: l.slug, title_es: l.title_es, title_en: l.title_en, price: `${money(l.priceAmount, "es")}${priceSuffix(l, "es")}`, price_en: `${money(l.priceAmount, "en")}${priceSuffix(l, "en")}`, zone: l.zone, city: l.city })));
  }, [items, loading]);
  const auth = authHrefs(locale, "save", `/${locale}/saved`);
  return (
    <div className="mx-auto max-w-[1280px] px-4 pb-32 pt-10 md:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className={k.eyebrow}>{user ? tx(locale, "Tu colección privada", "Your private collection") : tx(locale, "Guardadas en este dispositivo", "Saved on this device")}</div>
          <h1 className="mt-1 font-serif text-[40px] font-medium leading-[1.05] md:text-[48px]">{tx(locale, "Guardados", "Saved homes")}</h1>
          <p className="mt-1 text-muted">{tx(locale, `${items.length} ${items.length === 1 ? "casa" : "casas"} · elige hasta 3 para compararlas`, `${items.length} ${items.length === 1 ? "home" : "homes"} · pick up to 3 to compare`)}</p>
        </div>
        {user && <Button href={`/${locale}/alerts`} variant="outline" className={k.outline}>{tx(locale, "Mis alertas", "My alerts")}</Button>}
      </div>

      {!user && saved.length > 0 && (
        <div className={cn("np-in mt-6 flex flex-col gap-4 p-5 sm:flex-row sm:items-center", k.card)} role="note">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#8E3B22]/10 text-[#8E3B22]">
            <Heart size={20} strokeWidth={1.7} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-[16px] font-semibold text-navy dark:text-ivory">{tx(locale, "Crea tu cuenta para no perderlas y recibir avisos", "Create your account so you don’t lose them and get alerts")}</p>
            <p className="mt-0.5 text-sm text-muted">{tx(locale, "Ahora viven solo en este dispositivo. Con tu cuenta te esperan en cualquier lugar y te avisamos si bajan de precio.", "Right now they live only on this device. With an account they follow you anywhere, and we’ll tell you if their price drops.")}</p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-3">
            <Button href={auth.register} variant="primary">{tx(locale, "Crear cuenta", "Create account")}</Button>
            <Link href={auth.login} className="text-sm font-semibold text-navy underline underline-offset-4 dark:text-ivory">{tx(locale, "Ya tengo cuenta", "I have an account")}</Link>
          </div>
        </div>
      )}

      {loading && items.length === 0 && (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-label={tx(locale, "Un momento…", "One moment…")}>
          {saved.slice(0, 4).map((id) => <div key={id} className="np-skeleton aspect-[4/5] rounded-[18px]" />)}
        </div>
      )}
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((l) => (
          <ListingCard key={l.id} l={l} locale={locale} showCompare />
        ))}
      </div>
      {!loading && items.length === 0 && (
        <Empty title={tx(locale, "Todavía no guardas ninguna casa", "No saved homes yet")} body={tx(locale, "Toca el corazón en las que te gusten y aparecerán aquí, incluso sin conexión.", "Tap the heart on the ones you love and they’ll wait for you here, even offline.")} cta={<Button href={`/${locale}/search`} variant="outline" className={k.outline}>{tx(locale, "Explorar casas", "Explore homes")}</Button>} />
      )}
    </div>
  );
}

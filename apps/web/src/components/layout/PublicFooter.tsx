import Link from "next/link";
import type { Locale } from "@/types/domain";
import { Logo } from "@/components/brand/Logo";
import { tx } from "@/lib/i18n";

export function PublicFooter({ locale }: { locale: Locale }) {
  const col = (title: string, links: [string, string][]) => (
    <div>
      <div className="mb-3 font-display text-sm font-semibold text-ivory">{title}</div>
      <ul className="space-y-2 text-sm text-mist">
        {links.map(([t, h]) => (
          <li key={t}><Link href={h} className="hover:text-ivory">{t}</Link></li>
        ))}
      </ul>
    </div>
  );
  return (
    <footer className="mt-20 bg-navy text-ivory">
      <div className="mx-auto grid max-w-[1400px] gap-10 px-4 py-14 md:grid-cols-5 md:px-6">
        <div className="md:col-span-2">
          <Logo tone="ivory" />
          <p className="mt-3 max-w-xs font-display text-2xl text-ivory/90">{tx(locale, "Un nuevo lugar.", "Real estate. Redefined.")}</p>
          <p className="mt-3 max-w-sm text-sm text-mist">{tx(locale, "Marketplace y sistema operativo para inmobiliarias. Hecho en Caracas, pensado para el mundo.", "Marketplace and operating system for real-estate agencies. Made in Caracas, built for the world.")}</p>
        </div>
        {col(tx(locale, "Buscar", "Search"), [[tx(locale, "Comprar", "Buy"), `/${locale}/search?type=SALE`], [tx(locale, "Alquilar", "Rent"), `/${locale}/search?type=LONG_RENT`], [tx(locale, "Vacacional", "Vacation"), `/${locale}/search?type=SHORT_RENT`], ["Luxury", `/${locale}/luxury`]])}
        {col(tx(locale, "Propietarios", "Owners"), [[tx(locale, "Publicar gratis", "List for free"), `/${locale}/owner/new`], [tx(locale, "Encargar a agencia", "Hire an agency"), `/${locale}/owner/new`], [tx(locale, "Mis inmuebles", "My properties"), `/${locale}/owner/listings`]])}
        {col(tx(locale, "Agencias", "Agencies"), [[tx(locale, "New Place para agencias", "New Place for agencies"), `/${locale}/agency`], [tx(locale, "Entrar", "Sign in"), `/${locale}/login`]])}
      </div>
      <div className="border-t border-navy-line">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-mist md:px-6">
          <span>© 2026 New Place · {tx(locale, "Precios en USD. Conversión a VES/EUR solo referencial.", "Prices in USD. VES/EUR conversion for reference only.")}</span>
          <span>Listed on New Place</span>
        </div>
      </div>
    </footer>
  );
}

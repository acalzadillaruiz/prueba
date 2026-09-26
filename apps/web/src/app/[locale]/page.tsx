import Link from "next/link";
import { ArrowRight, Building2, LineChart, ShieldCheck, Sparkles } from "lucide-react";
import type { Locale } from "@/types/domain";
import { PublicPage } from "@/components/layout/PublicPage";
import { HeroSearch } from "@/components/search/HeroSearch";
import { HomeMap } from "@/components/search/HomeMap";
import { ListingCard } from "@/components/listing/ListingCard";
import { listingPhoto } from "@/lib/photos";
import { PropertyArt } from "@/components/art/PropertyArt";
import { Button, SectionTitle } from "@/components/ui";
import { publicListings } from "@/mock/listings";
import { ZONES } from "@/mock/zones";
import { money, num, tx } from "@/lib/i18n";

export default async function Home({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const all = publicListings();
  const fresh = [...all].filter((l) => l.status === "ACTIVE" || l.status === "COMING_SOON").sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, 8);
  const lux = all.filter((l) => l.luxury).slice(0, 3);
  const caracas = all.filter((l) => l.city === "Caracas");
  const zones = ZONES.filter((z) => z.city === "Caracas").slice(0, 8);
  return (
    <PublicPage locale={locale} header="dark">
      {/* HERO */}
      <section className="relative overflow-hidden bg-navy text-ivory">
        <div className="mx-auto grid max-w-[1400px] gap-8 px-4 pb-12 pt-10 md:px-6 lg:grid-cols-[1fr_1.1fr] lg:pb-16 lg:pt-16">
          <div className="flex flex-col justify-center">
            <span className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-white/15 px-3 py-1 text-xs font-semibold text-mist">
              <span className="h-1.5 w-1.5 rounded-full bg-coral" /> {num(all.length, locale)} {tx(locale, "inmuebles verificados en Venezuela", "verified listings in Venezuela")}
            </span>
            <h1 className="font-display text-5xl font-bold leading-[1.02] md:text-7xl">
              {tx(locale, "Un nuevo", "Real estate.")}
              <br />
              <span className="text-coral">{tx(locale, "lugar.", "Redefined.")}</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg text-ivory/75">
              {tx(locale, "Busca en el mapa, ve cuánto vale de verdad y agenda la visita con un agente verificado. Sin vueltas.", "Search the map, see what it’s really worth and book a viewing with a verified agent. No runaround.")}
            </p>
            <div className="mt-8">
              <HeroSearch locale={locale} />
            </div>
          </div>
          <HomeMap listings={caracas} locale={locale} />
        </div>
      </section>

      {/* NUEVOS HOY */}
      <section className="mx-auto max-w-[1400px] px-4 pt-14 md:px-6">
        <SectionTitle action={<Link href={`/${locale}/search?pub=24h`} className="inline-flex items-center gap-1 font-display text-sm text-coral">{tx(locale, "Ver todos", "See all")} <ArrowRight size={15} /></Link>}>
          {tx(locale, "Nuevos hoy", "New today")}
          <span className="ml-3 align-middle text-sm font-normal text-ink/50">{tx(locale, "ordenados por publicación", "sorted by published date")}</span>
        </SectionTitle>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {fresh.map((l) => (
            <ListingCard key={l.id} l={l} locale={locale} />
          ))}
        </div>
      </section>

      {/* ZONAS */}
      <section className="mx-auto max-w-[1400px] px-4 pt-16 md:px-6">
        <SectionTitle>{tx(locale, "Informes de zona · Caracas", "Area reports · Caracas")}</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {zones.map((z) => (
            <Link key={z.slug} href={`/${locale}/search?type=SALE&zone=${encodeURIComponent(z.name)}`} className="rounded-np border border-line bg-white p-4 transition-shadow duration-np hover:shadow-np">
              <div className="flex items-center justify-between">
                <span className="font-display font-semibold">{z.name}</span>
                <span className={z.trend12m > 5 ? "text-xs font-semibold text-ok" : "text-xs font-semibold text-ink/50"}>+{z.trend12m}% 12m</span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div><div className="font-display text-lg font-semibold">{money(z.salePpm, locale)}</div><div className="text-[11px] text-ink/50">USD/m²</div></div>
                <div><div className="font-display text-lg font-semibold">{z.activeListings}</div><div className="text-[11px] text-ink/50">{tx(locale, "activos", "active")}</div></div>
                <div><div className="font-display text-lg font-semibold">{z.daysOnMarket}</div><div className="text-[11px] text-ink/50">{tx(locale, "días", "days")}</div></div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* LUXURY */}
      <section className="mt-16 bg-navy py-16 text-ivory">
        <div className="mx-auto max-w-[1400px] px-4 md:px-6">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="font-display text-sm font-semibold uppercase tracking-[0.25em] text-gold">New Place Luxury</div>
              <h2 className="mt-2 font-display text-3xl font-semibold md:text-4xl">{tx(locale, "Más foto. Menos ruido.", "More photo. Less noise.")}</h2>
            </div>
            <Button href={`/${locale}/luxury`} variant="gold">{tx(locale, "Ver colección", "View collection")} <ArrowRight size={16} /></Button>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {lux.map((l) => (
              <Link key={l.id} href={`/${locale}/listing/${l.slug}`} className="group">
                <div className="overflow-hidden rounded-np border border-gold/60 p-1.5">
                  <PropertyArt scene={l.scenes[0]} seed={l.id} photo={listingPhoto(l, 0)} className="aspect-[4/3] w-full rounded-[10px] transition-transform duration-500 group-hover:scale-[1.02]" />
                </div>
                <div className="mt-3 flex items-baseline justify-between">
                  <span className="font-display text-lg">{tx(locale, l.title_es, l.title_en)}</span>
                </div>
                <div className="text-sm text-mist">{l.zone} · {money(l.priceAmount, locale)}</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* PROPIETARIOS + AGENCIAS */}
      <section className="mx-auto grid max-w-[1400px] gap-6 px-4 pt-16 md:grid-cols-2 md:px-6">
        <div className="rounded-2xl border border-line bg-white p-8">
          <LineChart className="text-coral" />
          <h3 className="mt-4 font-display text-2xl font-semibold">{tx(locale, "¿Cuánto vale tu inmueble?", "What’s your place worth?")}</h3>
          <p className="mt-2 text-ink/65">{tx(locale, "PlaceEstimate calcula un rango con comparables reales de la zona. Luego decide: publicar tú mismo o encargarlo a una agencia verificada.", "PlaceEstimate gives you a range based on real comparables. Then choose: list it yourself or hire a verified agency.")}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button href={`/${locale}/owner/new`}>{tx(locale, "Publicar gratis", "List for free")}</Button>
            <Button href={`/${locale}/owner/new`} variant="outline">{tx(locale, "Encargar a agencia", "Hire an agency")}</Button>
          </div>
        </div>
        <div className="rounded-2xl bg-navy-2 p-8 text-ivory">
          <Building2 className="text-coral" />
          <h3 className="mt-4 font-display text-2xl font-semibold">{tx(locale, "El sistema operativo de tu inmobiliaria", "Your agency’s operating system")}</h3>
          <ul className="mt-3 space-y-2 text-ivory/75">
            {[
              tx(locale, "Leads con score IA y SLA de 15 min", "AI-scored leads with a 15-min SLA"),
              tx(locale, "Captación con anti-duplicados", "Capture queue with duplicate detection"),
              tx(locale, "Agenda de visitas, fotografía y comisiones", "Tours, media jobs and commissions"),
            ].map((t) => (
              <li key={t} className="flex items-center gap-2"><ShieldCheck size={16} className="text-coral" /> {t}</li>
            ))}
          </ul>
          <div className="mt-6"><Button href={`/${locale}/agency`}>{tx(locale, "Conocer New Place para agencias", "New Place for agencies")} <Sparkles size={15} /></Button></div>
        </div>
      </section>
    </PublicPage>
  );
}

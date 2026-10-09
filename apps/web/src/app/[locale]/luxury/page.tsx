import Image from "next/image";
import Link from "next/link";
import type { Locale } from "@/types/domain";
import { PublicPage } from "@/components/layout/PublicPage";
import { listingPhoto } from "@/lib/photos";
import { PropertyArt } from "@/components/art/PropertyArt";
import { RoofGlyph } from "@/components/brand/Logo";
import { Badge, Button, EmptyState } from "@/components/ui";
import { factsLine } from "@/components/listing/ListingCard";
import { SaveButton } from "@/components/listing/bits";
import { publicListings } from "@/server/listings";
import { prisma } from "@newplace/db";
import { money, tx } from "@/lib/i18n";
import { pageMeta } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  return pageMeta(locale, tx(locale, "Colección Privada", "Private Collection"), "/luxury", {
    description: tx(locale, "Casas excepcionales, revisadas una a una, en Lechería, El Morro, Margarita y Caracas.", "Exceptional homes, each one checked by hand, in Lechería, El Morro, Margarita and Caracas."),
  });
}

// Static and cached (ISR): no session is read on public pages; data refreshes every 300 s and on listing changes.
export const revalidate = 300;

/** Colección Privada (/luxury): the exclusive listings, presented editorially, plus the private-access request. */
export default async function LuxuryPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const lux = (await publicListings()).filter((l) => l.luxury);
  const privateCount = await prisma.listing.count({ where: { luxury: true, privateListing: true, status: "ACTIVE" } });
  const [hero] = lux;
  return (
    <PublicPage locale={locale} header="transparent" tabbar contact={{ href: "#acceso", label: tx(locale, "Hablar con una persona", "Talk to a person") }}>
      <section className="np-grain relative overflow-hidden bg-ivory pt-[104px] lg:pt-[120px]">
        <div className="np-aura" aria-hidden>
          <i />
          <i />
          <i />
        </div>
        <div className="relative mx-auto grid max-w-[1320px] grid-cols-1 items-end gap-10 px-4 pb-14 md:px-8 lg:grid-cols-[1fr_1.1fr] lg:pb-20">
          <div>
            <p className="np-kicker text-gold-text">{tx(locale, "Colección Privada", "Private Collection")}</p>
            <h1 className="mt-5 max-w-[620px] text-[44px] leading-[1.02] tracking-[-0.02em] sm:text-[58px] lg:text-[72px]">
              {tx(locale, "Casas que no salen", "Homes that never make")} <span className="text-ink/45">{tx(locale, "en ningún portal.", "it to the portals.")}</span>
            </h1>
            <p className="mt-6 max-w-[520px] text-[17px] leading-relaxed text-ink/70">
              {tx(
                locale,
                `${lux.length} ${lux.length === 1 ? "casa elegida" : "casas elegidas"} una a una, revisadas y valoradas con datos reales. Algunas solo las enseñamos en privado: pide acceso y te las mostramos con calma.`,
                `${lux.length} ${lux.length === 1 ? "home" : "homes"} chosen one by one, checked and valued with real data. Some we only show in private: ask for access and we'll take you through them, calmly.`,
              )}
            </p>
          </div>
          <div className="relative aspect-[16/11] w-full overflow-hidden rounded-[36px] bg-arena shadow-[0_40px_90px_-30px_rgba(31,35,40,.45)]">
            <Image src="/brand/villa-arcos.jpg" alt={tx(locale, "Patio con arcos de una villa", "A villa's arched courtyard")} fill priority sizes="(max-width: 1024px) 92vw, 680px" quality={80} className="object-cover" />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1320px] px-4 py-20 md:px-8 lg:py-28">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
          <h2 className="text-[36px] leading-tight tracking-[-0.02em] md:text-[52px]">{tx(locale, "Una a una.", "One by one.")}</h2>
          <p className="max-w-md text-[15px] text-muted">{tx(locale, "Cada una con su asesor de confianza y lo que vale de verdad, según ventas reales.", "Each with a trusted advisor and what it\u2019s really worth, from real sales.")}</p>
        </div>
        {!hero ? (
          <EmptyState monogram title={tx(locale, "Estamos renovando la colección", "We’re refreshing the collection")} body={tx(locale, "Pide acceso y te contamos en privado cuando lleguen casas nuevas.", "Ask for access and we’ll tell you privately when new homes arrive.")} />
        ) : (
          <div className="grid gap-x-8 gap-y-16 md:grid-cols-2">
            {lux.map((l, i) => {
              // First one wide; then pairs; an odd one out at the end goes wide too.
              const wide = i === 0 || (i === lux.length - 1 && (lux.length - 1) % 2 === 1);
              return (
              <Link key={l.id} href={`/${locale}/listing/${l.slug}`} className={wide ? "group md:col-span-2" : "group"}>
                <div className={(wide ? "aspect-[4/3] md:aspect-[21/9]" : "aspect-[4/3]") + " relative overflow-hidden rounded-[32px] bg-arena"} data-spotlight>
                  <PropertyArt scene={l.scenes[0]} seed={l.id} photo={listingPhoto(l, 0)} className="h-full w-full transition-transform duration-700 group-hover:scale-[1.02]" />
                  <div className="absolute left-4 top-4"><Badge tone="exclusive">{tx(locale, "Exclusiva New Place", "New Place exclusive")}</Badge></div>
                  <SaveButton id={l.id} locale={locale} className="absolute right-3 top-3" />
                </div>
                <div className="mt-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <span className="font-serif text-[28px] leading-tight md:text-[32px]">{tx(locale, l.title_es, l.title_en)}</span>
                  <span className="font-serif text-[26px] font-semibold text-ink">{money(l.priceAmount, locale)}</span>
                </div>
                <div className="mt-1 text-[15px] text-muted">{l.zone}, {l.city} · {factsLine(l, locale).join(" · ")}</div>
              </Link>
              );
            })}
          </div>
        )}
      </section>

      <section id="acceso" data-hide-fab className="np-navy-panel scroll-mt-24 bg-navy text-ivory">
        <div className="mx-auto grid max-w-[1320px] items-center gap-10 px-4 py-20 md:px-8 lg:grid-cols-[1.2fr_1fr] lg:py-24">
          <div>
            <p className="np-eyebrow text-[#A8B0B8]">{tx(locale, "Acceso privado", "Private access")}</p>
            <h2 className="mt-3 text-[36px] leading-tight md:text-[48px]">
              {tx(locale, `${privateCount} ${privateCount === 1 ? "casa privada disponible" : "casas privadas disponibles"}`, `${privateCount} private home${privateCount === 1 ? "" : "s"} available`)}
            </h2>
            <ul className="mt-6 space-y-3 text-[15px] text-ivory/80">
              {[
                tx(locale, "Solo por enlace, después de una breve charla para conocerte", "By link only, after a short chat to get to know you"),
                tx(locale, "Visitas privadas, con la agenda real de tu asesor", "Private viewings, on your advisor’s real calendar"),
                tx(locale, "Videovisita si compras desde fuera del país", "Video tours if you’re buying from abroad"),
              ].map((x) => (
                <li key={x} className="flex items-center gap-3"><RoofGlyph className="text-[#C3C8CD]" /> {x}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-[24px] border border-[#9A9DA1]/40 p-8 text-center">
            <p className="mx-auto max-w-sm text-[15px] text-ivory/80">{tx(locale, "Escríbele a un asesor de la colección. Tras una breve charla, te enviamos el enlace.", "Write to a collection advisor. After a short chat, we’ll send you the link.")}</p>
            {hero && (
              <Button href={`/${locale}/listing/${hero.slug}#contact`} variant="primary" size="lg" className="mt-6">
                {tx(locale, "Pedir acceso", "Ask for access")}
              </Button>
            )}
          </div>
        </div>
      </section>
    </PublicPage>
  );
}

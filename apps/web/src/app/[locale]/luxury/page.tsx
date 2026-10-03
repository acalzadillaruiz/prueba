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
    description: tx(locale, "Residencias exclusivas verificadas en Lechería, El Morro, Margarita y Caracas.", "Verified exclusive residences in Lechería, El Morro, Margarita and Caracas."),
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
    <PublicPage locale={locale} header="transparent" tabbar contact={{ href: "#acceso", label: tx(locale, "Hablar con un asesor", "Talk to an advisor") }}>
      <section className="relative isolate overflow-hidden bg-navy text-ivory">
        <Image src="/brand/villa-arcos.jpg" alt="" fill priority sizes="100vw" quality={80} className="-z-10 object-cover object-center" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(22,38,56,.7)_0%,rgba(22,38,56,.25)_40%,rgba(22,38,56,.9)_100%)]" aria-hidden />
        <div className="mx-auto flex min-h-[560px] max-w-[1320px] flex-col justify-end px-4 pb-14 pt-[132px] md:px-8 lg:min-h-[680px] lg:pb-20">
          <p className="np-eyebrow text-ivory/90">{tx(locale, "New Place · Colección Privada", "New Place · Private Collection")}</p>
          <h1 className="np-hero-title mt-4 max-w-[860px] text-[44px] leading-[1.04] sm:text-[58px] lg:text-[76px]">
            {tx(locale, "Colección Privada.", "Private Collection.")}
            <br />
            <em>{tx(locale, "Lo extraordinario, en privado.", "The extraordinary, in private.")}</em>
          </h1>
          <p className="mt-5 max-w-[560px] text-[17px] leading-relaxed text-ivory/85">
            {tx(
              locale,
              `${lux.length} ${lux.length === 1 ? "propiedad seleccionada" : "propiedades seleccionadas"}, verificadas y valoradas con datos reales. Algunas solo se muestran en privado, con enlace.`,
              `${lux.length} selected ${lux.length === 1 ? "property" : "properties"}, verified and valued with real data. Some are shown privately only, by link.`,
            )}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[1320px] px-4 py-20 md:px-8 lg:py-28">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
          <h2 className="text-[36px] leading-tight md:text-[48px]">{tx(locale, "La colección", "The collection")}</h2>
          <p className="max-w-md text-[15px] text-muted">{tx(locale, "Cada residencia, con su asesor verificado y su valoración PlaceEstimate.", "Every residence comes with its verified advisor and its PlaceEstimate valuation.")}</p>
        </div>
        {!hero ? (
          <EmptyState monogram title={tx(locale, "La colección se está renovando", "The collection is being renewed")} body={tx(locale, "Pida acceso y le avisaremos de las nuevas residencias en privado.", "Request access and we’ll tell you privately about new residences.")} />
        ) : (
          <div className="grid gap-x-8 gap-y-16 md:grid-cols-2">
            {lux.map((l, i) => {
              // First one wide; then pairs; an odd one out at the end goes wide too.
              const wide = i === 0 || (i === lux.length - 1 && (lux.length - 1) % 2 === 1);
              return (
              <Link key={l.id} href={`/${locale}/listing/${l.slug}`} className={wide ? "group md:col-span-2" : "group"}>
                <div className={(wide ? "aspect-[4/3] md:aspect-[21/9]" : "aspect-[4/3]") + " relative overflow-hidden rounded-[20px] bg-arena"}>
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
            <p className="np-eyebrow text-[#D9C59C]">{tx(locale, "Acceso privado", "Private access")}</p>
            <h2 className="mt-3 text-[36px] leading-tight md:text-[48px]">
              {tx(locale, `${privateCount} ${privateCount === 1 ? "residencia privada disponible" : "residencias privadas disponibles"}`, `${privateCount} private residence${privateCount === 1 ? "" : "s"} available`)}
            </h2>
            <ul className="mt-6 space-y-3 text-[15px] text-ivory/80">
              {[
                tx(locale, "Se comparten solo con enlace, tras una precalificación breve", "Shared by link only, after a short pre-qualification"),
                tx(locale, "Visitas privadas en la agenda real del asesor", "Private viewings on the advisor’s real calendar"),
                tx(locale, "Videovisita si compra desde el exterior", "Video tour if you buy from abroad"),
              ].map((x) => (
                <li key={x} className="flex items-center gap-3"><RoofGlyph className="text-[#E79A7F]" /> {x}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-[24px] border border-[#B4935A]/40 p-8 text-center">
            <p className="mx-auto max-w-sm text-[15px] text-ivory/80">{tx(locale, "Escriba a un asesor de la colección: le enviamos el enlace tras una precalificación breve.", "Write to a collection advisor: we’ll send the link after a short pre-qualification.")}</p>
            {hero && (
              <Button href={`/${locale}/listing/${hero.slug}#contact`} variant="primary" size="lg" className="mt-6">
                {tx(locale, "Solicitar acceso", "Request access")}
              </Button>
            )}
          </div>
        </div>
      </section>
    </PublicPage>
  );
}

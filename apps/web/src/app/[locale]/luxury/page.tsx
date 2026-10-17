import Image from "next/image";
import Link from "next/link";
import type { Locale } from "@/types/domain";
import { PhotoBand } from "@/components/home/PhotoBand";
import { PHOTOS } from "@/lib/media";
import { PublicPage } from "@/components/layout/PublicPage";
import { listingPhoto } from "@/lib/photos";
import { PropertyArt } from "@/components/art/PropertyArt";
import { Badge, Button, EmptyState } from "@/components/ui";
import { factsLine } from "@/components/listing/ListingCard";
import { SaveButton } from "@/components/listing/bits";
import { publicListings } from "@/server/listings";
import { prisma } from "@newplace/db";
import { tx, moneyUi } from "@/lib/i18n";
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
    <PublicPage locale={locale} header="transparent" tabbar contact={{ href: "#acceso", label: tx(locale, "Hablar con un asesor", "Talk to an advisor") }}>
      {/* Cinema hero (AMALI): the collection's first home edge to edge, white title over a soft shade. */}
      <section className="relative isolate flex min-h-[100svh] items-end overflow-hidden bg-[#3A6A92] text-white md:min-h-[78svh]">
        <Image
          src={(hero && listingPhoto(hero, 0)) || "/brand/hero-costa-atardecer.jpg"}
          alt={hero ? tx(locale, hero.title_es, hero.title_en) : tx(locale, "Villa frente al mar al atardecer", "A villa by the sea at sunset")}
          fill
          priority
          sizes="100vw"
          quality={80}
          className="-z-20 object-cover"
        />
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[rgb(14_26_43/.55)]" />
        <div data-reveal="stagger" className="np-gutter relative mx-auto w-full max-w-[1280px] box-content pb-[clamp(56px,8vw,120px)] pt-[140px]">
          <h1 className="np-t-band max-w-[900px] text-ivory">
            {tx(locale, "Casas exclusivas", "Exclusive homes")} <span className="text-mist">{tx(locale, "que ves en privado.", "you see in private.")}</span>
          </h1>

          <p className="np-t-lead mt-7 max-w-[560px] text-ivory">
            {tx(
              locale,
              `${lux.length} ${lux.length === 1 ? "casa elegida" : "casas elegidas"} una a una y valoradas con ventas reales. Algunas solo se ven en privado: pide acceso.`,
              `${lux.length} ${lux.length === 1 ? "home" : "homes"} chosen one by one and valued from real sales. Some are only shown in private: ask for access.`,
            )}
          </p>
        </div>
      </section>

      <section className="np-gutter mx-auto max-w-[1280px] box-content py-[var(--np-section)]">
        <div data-reveal className="mb-12 flex flex-wrap items-end justify-between gap-6">
          <h2 className="np-t-band">{tx(locale, "Un asesor y un precio claro", "An advisor and a clear price")}</h2>
          <p className="np-t-body max-w-md text-ink">{tx(locale, "Cada casa tiene su asesor y un valor calculado con ventas reales de la zona.", "Each home has its own advisor and a value worked out from real sales nearby.")}</p>
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
                <div className={(wide ? "aspect-[4/3] md:aspect-[21/9]" : "aspect-[4/3]") + " relative overflow-hidden bg-arena"}>
                  <PropertyArt scene={l.scenes[0]} seed={l.id} photo={listingPhoto(l, 0)} className="h-full w-full transition-transform duration-700 group-hover:scale-[1.02]" />
                  <div className="absolute left-4 top-4"><Badge tone="exclusive">{tx(locale, "Exclusiva New Place", "New Place exclusive")}</Badge></div>
                  <SaveButton id={l.id} locale={locale} className="absolute right-3 top-3" />
                </div>
                <div className="mt-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <span className="font-display text-[17px] font-medium">{tx(locale, l.title_es, l.title_en)}</span>
                  <span className="font-title text-[28px] text-ink [font-variant-numeric:lining-nums_tabular-nums]">{moneyUi(l.priceAmount, locale)}</span>
                </div>
                <div className="mt-1 text-[16px] text-muted">{l.zone}, {l.city} · {factsLine(l, locale).join(" · ")}</div>
              </Link>
              );
            })}
          </div>
        )}
      </section>

      <PhotoBand
        photo={PHOTOS.salonMar}
        locale={locale}
        title={tx(locale, "Algunas casas solo se ven en privado.", "Some homes are only shown in private.")}
        body={tx(locale, "Sin fotos públicas ni dirección en el mapa: te las enseña tu asesor, con cita.", "No public photos or map address: your advisor shows them to you, by appointment.")}
      />

      <section id="acceso" data-hide-fab className="np-band scroll-mt-24 bg-arena text-ink">
        <div data-reveal="stagger" className="np-gutter mx-auto grid max-w-[1280px] box-content items-center gap-12 py-[var(--np-section)] lg:grid-cols-[1.2fr_1fr]">
          <div>
            <h2 className="np-t-band">
              {tx(locale, `${privateCount} ${privateCount === 1 ? "casa privada disponible" : "casas privadas disponibles"}`, `${privateCount} private home${privateCount === 1 ? "" : "s"} available`)}
            </h2>
            <ul className="mt-8 space-y-3 text-[17px] text-ink">
              {[
                tx(locale, "Solo por enlace, después de una breve charla para conocerte", "By link only, after a short chat to get to know you"),
                tx(locale, "Visitas privadas, con la agenda real de tu asesor", "Private viewings, on your advisor’s real calendar"),
                tx(locale, "Videovisita si compras desde fuera del país", "Video tours if you’re buying from abroad"),
              ].map((x) => (
                <li key={x} className="flex items-center gap-3"> {x}</li>
              ))}
            </ul>
          </div>
          <div className="bg-ivory p-8 text-center md:p-10">
            <p className="np-t-body mx-auto max-w-sm text-ink">{tx(locale, "Escríbele a un asesor de la colección. Tras una breve charla, te enviamos el enlace.", "Write to a collection advisor. After a short chat, we’ll send you the link.")}</p>
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

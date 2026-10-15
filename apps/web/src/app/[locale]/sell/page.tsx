import Image from "next/image";
import { ArrowRight } from "lucide-react";
import type { Locale } from "@/types/domain";
import { PublicPage } from "@/components/layout/PublicPage";
import { SellQuickEstimate } from "@/components/owner/SellQuickEstimate";
import { Button } from "@/components/ui";
import { getZones } from "@/server/data";
import { platformDaysOnMarket } from "@/server/zone-stats";
import { pageMeta } from "@/lib/seo";
import { plural, tx } from "@/lib/i18n";
import sellPhoto from "../../../../public/brand/patio.jpg";
import { PhotoBand } from "@/components/home/PhotoBand";
import { PHOTOS } from "@/lib/media";

// Public, cacheable landing for owners ("Vender con nosotros"); the wizard itself lives at /owner/new.
export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  return pageMeta(locale, tx(locale, "Vender con nosotros", "Sell with us"), "/sell", {
    description: tx(locale, "Te decimos gratis cuánto vale tu casa, la mostramos bien y tú decides quién la visita. Sin letra pequeña.", "We tell you for free what your home is worth, show it well, and you decide who visits. No small print."),
  });
}

export default async function SellPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  // Same figure (and definition) as the listing pages and agency reports: median days since publication of the homes
  // available today. The static zone reference figures (getZones) are not what any other page shows.
  const [zones, dom] = await Promise.all([getZones(), platformDaysOnMarket()]);
  const start = `/${locale}/owner/new`;
  const values = [
    {
      t: tx(locale, "Sabes cuánto vale, gratis", "Know what it’s worth, free"),
      d: tx(locale, "Calculamos su valor con casas reales de tu zona y te decimos cuánto fiarte de la cifra.", "We work out its value from real homes in your area and tell you how far to trust the figure."),
    },
    {
      t: tx(locale, "Llega a más compradores", "Reach more buyers"),
      d: tx(locale, "Tu anuncio en español e inglés, en el mapa, con compradores que dejan sus datos antes de visitar.", "Your listing in Spanish and English, on the map, with buyers who leave their details before visiting."),
    },
    {
      t: tx(locale, "Tú pones el horario", "You set the schedule"),
      d: dom != null && dom > 0
        ? tx(locale, `Publicas en minutos y eliges cuándo enseñarla. Hoy las casas llevan una mediana de ${plural(dom, locale, ["día", "días"], ["day", "days"])} publicadas.`, `List in minutes and choose when to show it. Today homes have been listed a median of ${plural(dom, locale, ["día", "días"], ["day", "days"])}.`)
        : tx(locale, "Publicas en minutos y tú eliges los días y las horas de visita.", "List in minutes, and you choose the days and times for visits."),
    },
    {
      t: tx(locale, "Publicar es gratis", "Listing is free"),
      d: tx(locale, "Si prefieres una agencia verificada, ves su comisión antes de elegirla. Sin letra pequeña.", "If you’d rather use a verified agency, you see its commission before you choose. No small print."),
    },
  ];
  const steps = [
    [tx(locale, "Cuéntanos de tu casa", "Tell us about your home"), tx(locale, "Dirección, metros y lo que la hace especial. Tu borrador se guarda solo.", "Address, size and what makes it special. Your draft saves itself.")],
    [tx(locale, "Fotos y precio", "Photos and price"), tx(locale, "Con la estimación al lado, para que pongas un precio con sentido.", "With the estimate alongside, so your price makes sense.")],
    [tx(locale, "Publica y recibe visitas", "Go live and get visits"), tx(locale, "Tú atiendes en tu horario, o una agencia verificada lo hace por ti.", "You host them on your schedule, or a verified agency does it for you.")],
  ];
  return (
    <PublicPage locale={locale} tabbar>
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-[1320px] items-start gap-10 px-4 pb-16 pt-10 md:px-8 lg:grid-cols-[1.1fr_480px] lg:gap-16 lg:pb-24 lg:pt-20">
          <div className="lg:pt-6">
            <h1 className="np-t-h1 max-w-[640px]">
              {tx(locale, "Vende tu casa", "Sell your home")} <span className="text-muted">{tx(locale, "al precio justo.", "at the right price.")}</span>
            </h1>
            <p className="np-t-lead mt-5 max-w-[520px] text-ink">
              {tx(locale, "Te decimos cuánto vale, la mostramos bien y tú decides quién la visita y cuándo.", "We tell you what it’s worth, show it well, and you decide who visits and when.")}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button href={start} size="lg">
                {tx(locale, "Publicar mi casa", "List my home")} <ArrowRight size={17} aria-hidden />
              </Button>
              <a href="#como-funciona" className="inline-flex min-h-12 items-center px-2 font-display text-[16px] font-medium text-navy underline-offset-4 hover:underline">
                {tx(locale, "Cómo funciona", "How it works")}
              </a>
            </div>
          </div>
          <div id="estimar" className="scroll-mt-24"><SellQuickEstimate locale={locale} zones={zones.map((z) => ({ name: z.name, city: z.city }))} /></div>
        </div>
      </section>

      {/* 043-C · night band, full-bleed photo. */}
      <PhotoBand
        photo={PHOTOS.salonMar}
        locale={locale}
        title={tx(locale, "Tu casa, bien mostrada.", "Your home, shown well.")}
        body={tx(locale, "Fotos que la hacen justicia, un precio con sentido y compradores que ya saben lo que buscan.", "Photos that do it justice, a price that makes sense and buyers who already know what they want.")}
      />

      {/* 043 · bone band: one large photo beside the three steps, an ordered list (no row of equal icon cards). */}
      <section id="como-funciona" className="scroll-mt-24 bg-ivory text-ink" aria-labelledby="sell-steps">
        <div className="mx-auto grid max-w-[1280px] items-center gap-10 px-[clamp(16px,4vw,40px)] py-[clamp(64px,10vw,128px)] lg:grid-cols-[1.1fr_1fr] lg:gap-16">
          <div className="relative aspect-[4/3] w-full overflow-hidden bg-arena lg:aspect-[4/5]">
            <Image src={sellPhoto} alt={tx(locale, "Entrada de una casa blanca con jardín, lista para enseñar", "Entrance of a white house with a garden, ready to show")} fill placeholder="blur" sizes="(max-width: 1024px) 92vw, 620px" className="object-cover" />
          </div>
          <div>
            <h2 id="sell-steps" className="np-t-band">{tx(locale, "Publica en tres pasos", "List in three steps")}</h2>
            <ol className="mt-8 space-y-7">
              {steps.map(([t, d], i) => (
                <li key={t} className="grid grid-cols-[2.5rem_1fr] gap-x-4">
                  <span aria-hidden className="font-title text-[36px] leading-none text-muted">{i + 1}</span>
                  <div>
                    <h3 className="font-display text-[20px] font-medium text-ink">{t}</h3>
                    <p className="np-t-body mt-1 text-ink">{d}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-10">
              <Button href={start} size="lg">
                {tx(locale, "Publicar mi casa", "List my home")} <ArrowRight size={17} aria-hidden />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Sand band: what you get, as plain text (term + detail), no boxes. */}
      <section className="bg-arena" aria-labelledby="sell-why">
        <div className="mx-auto max-w-[1280px] px-[clamp(16px,4vw,40px)] py-[clamp(64px,10vw,128px)]">
          <h2 id="sell-why" className="np-t-h1 max-w-[720px]">
            {tx(locale, "Sabes qué recibes y qué pagas.", "You know what you get and what you pay.")}
          </h2>
          <dl className="mt-10 grid gap-x-12 gap-y-8 md:grid-cols-2">
            {values.map(({ t, d }) => (
              <div key={t}>
                <dt className="font-display text-[20px] font-medium text-ink">{t}</dt>
                <dd className="np-t-body mt-1.5 text-ink">{d}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </PublicPage>
  );
}

import { ArrowRight, CalendarClock, Camera, HandCoins, LineChart } from "lucide-react";
import type { Locale } from "@/types/domain";
import { PublicPage } from "@/components/layout/PublicPage";
import { SellQuickEstimate } from "@/components/owner/SellQuickEstimate";
import { Button } from "@/components/ui";
import { getZones } from "@/server/data";
import { platformDaysOnMarket } from "@/server/zone-stats";
import { pageMeta } from "@/lib/seo";
import { plural, tx } from "@/lib/i18n";

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
      Icon: LineChart,
      t: tx(locale, "Sabes cuánto vale, gratis", "Know what it’s worth, free"),
      d: tx(locale, "Calculamos su valor con casas reales de tu zona y te decimos cuánto fiarte de la cifra.", "We work out its value from real homes in your area and tell you how far to trust the figure."),
    },
    {
      Icon: Camera,
      t: tx(locale, "Llega a más compradores", "Reach more buyers"),
      d: tx(locale, "Tu anuncio en español e inglés, en el mapa, con compradores que dejan sus datos antes de visitar.", "Your listing in Spanish and English, on the map, with buyers who leave their details before visiting."),
    },
    {
      Icon: CalendarClock,
      t: tx(locale, "Tú pones el horario", "You set the schedule"),
      d: dom != null && dom > 0
        ? tx(locale, `Publicas en minutos y eliges cuándo enseñarla. Hoy las casas llevan una mediana de ${plural(dom, locale, ["día", "días"], ["day", "days"])} publicadas.`, `List in minutes and choose when to show it. Today homes have been listed a median of ${plural(dom, locale, ["día", "días"], ["day", "days"])}.`)
        : tx(locale, "Publicas en minutos y tú eliges los días y las horas de visita.", "List in minutes, and you choose the days and times for visits."),
    },
    {
      Icon: HandCoins,
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
      <section className="np-grain relative overflow-hidden">
        <div className="mx-auto grid max-w-[1320px] items-start gap-10 px-4 pb-16 pt-10 md:px-8 lg:grid-cols-[1.1fr_480px] lg:gap-16 lg:pb-24 lg:pt-20">
          <div className="lg:pt-6">
            <p className="np-kicker text-gold-text">{tx(locale, "Vender con nosotros", "Sell with us")}</p>
            <h1 className="mt-3 max-w-[640px] text-[40px] leading-[1.04] tracking-[-0.02em] md:text-[60px]">
              {tx(locale, "Vende tu casa", "Sell your home")} <span className="text-gold-text">{tx(locale, "al precio justo.", "at the right price.")}</span>
            </h1>
            <p className="mt-5 max-w-[520px] text-[17px] leading-relaxed text-ink/75">
              {tx(locale, "Te decimos cuánto vale, la mostramos bien y tú decides quién la visita y cuándo.", "We tell you what it’s worth, show it well, and you decide who visits and when.")}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button href={start} size="lg">
                {tx(locale, "Publicar mi casa", "List my home")} <ArrowRight size={17} aria-hidden />
              </Button>
              <a href="#como-funciona" className="inline-flex min-h-11 items-center px-2 font-display text-[15px] font-semibold text-navy underline-offset-4 hover:underline">
                {tx(locale, "Cómo funciona", "How it works")}
              </a>
            </div>
          </div>
          <div id="estimar" className="scroll-mt-24"><SellQuickEstimate locale={locale} zones={zones.map((z) => ({ name: z.name, city: z.city }))} /></div>
        </div>
      </section>

      <section className="mx-auto max-w-[1320px] px-4 py-14 md:px-8 lg:py-20" aria-labelledby="sell-why">
        <p className="np-kicker text-gold-text">{tx(locale, "Lo que te damos", "What you get")}</p>
        <h2 id="sell-why" className="mt-3 max-w-[720px] text-[32px] leading-[1.08] tracking-[-0.02em] md:text-[44px]">
          {tx(locale, "Sabes qué recibes y qué pagas.", "You know what you get and what you pay.")}
        </h2>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {values.map(({ Icon, t, d }) => (
            <li key={t} className="rounded-[4px] bg-white/70 p-6 ring-1 ring-black/[.04]">
              <Icon size={22} strokeWidth={1.5} className="text-[#1F4E5A]" aria-hidden />
              <h3 className="mt-4 font-serif text-[24px] leading-tight">{t}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-muted">{d}</p>
            </li>
          ))}
        </ul>
      </section>

      <section id="como-funciona" className="scroll-mt-24 border-t border-line" aria-labelledby="sell-steps">
        <div className="mx-auto max-w-[1320px] px-4 py-14 md:px-8 lg:py-20">
          <p className="np-kicker text-gold-text">{tx(locale, "Cómo funciona", "How it works")}</p>
          <h2 id="sell-steps" className="mt-3 text-[32px] leading-[1.08] tracking-[-0.02em] md:text-[44px]">{tx(locale, "Publica en tres pasos", "List in three steps")}</h2>
          <ol className="mt-10 grid gap-8 md:grid-cols-3">
            {steps.map(([t, d], i) => (
              <li key={t} className="border-t border-ink/15 pt-5">
                <span className="font-serif text-[44px] leading-none text-[#C9B49C] [font-feature-settings:'lnum']">{i + 1}</span>
                <h3 className="mt-3 font-display text-[18px] font-semibold text-ink">{t}</h3>
                <p className="mt-1.5 text-[15px] leading-relaxed text-muted">{d}</p>
              </li>
            ))}
          </ol>
          <div className="mt-12">
            <Button href={start} size="lg" variant="navy">
              {tx(locale, "Publicar mi casa", "List my home")} <ArrowRight size={17} aria-hidden />
            </Button>
          </div>
        </div>
      </section>
    </PublicPage>
  );
}

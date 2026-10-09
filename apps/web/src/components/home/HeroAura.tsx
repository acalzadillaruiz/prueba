import { ArrowRight } from "lucide-react";
import type { Locale } from "@/types/domain";
import { num, tx } from "@/lib/i18n";
import { AskBar } from "@/components/search/AskBar";
import { OnCallButton } from "@/components/brand/PublicChrome";
import { Building4D, type Hotspot } from "./Building4D";

/**
 * Hero "Titanio 2035" (entries 018 §c, 021, 022): cool fog, graphite Geist Light headline with the word "verificado."
 * in terracotta, the full search (mode tabs, field, "Buscar casas", essentials chips) on the first screen, a link to
 * the on-call advisor and a trust row with real figures. The living model (Building4D) sits on the right on desktop
 * and peeks below the search on phones.
 */
export function HeroAura({
  locale,
  verified,
  advisorShare,
  model,
}: {
  locale: Locale;
  /** Homes on show today whose agency or advisor is verified (computed when the page renders). */
  verified: number;
  /** Share (0–100) of those homes that show their advisor. Only printed as a claim when it is really 100. */
  advisorShare: number;
  model: { caption?: { label: string; href: string }; hotspots: Hotspot[] };
}) {
  const trust = [
    verified > 0 && { n: num(verified, locale), label: tx(locale, "casas verificadas", "verified homes") },
    { n: "24/7", label: tx(locale, "guardia de cada agencia", "on call at every agency") },
    advisorShare > 0 && { n: `${advisorShare} %`, label: tx(locale, "asesor visible en cada ficha", "advisor shown on every listing") },
  ].filter(Boolean) as { n: string; label: string }[];

  return (
    <section data-hide-fab className="relative overflow-hidden bg-ivory pt-[calc(env(safe-area-inset-top)+76px)] sm:pt-[100px] lg:pt-[112px]" aria-labelledby="hero-title">
      {/* Studio light: one cool radial highlight behind the model, a barely visible cool noise over everything. */}
      <div aria-hidden className="pointer-events-none absolute -right-[10%] top-[8%] h-[80%] w-[70%] rounded-full bg-[radial-gradient(closest-side,#F9FAFB,transparent)] [html.dark_&]:bg-[radial-gradient(closest-side,#16191D,transparent)]" />
      <div className="relative mx-auto grid max-w-[1440px] grid-cols-1 items-center gap-6 px-5 pb-10 md:px-10 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)] lg:gap-6 lg:px-12 lg:pb-16 min-[1440px]:px-24">
        <div className="relative z-10 min-w-0">
          {verified > 0 && (
            <p className="np-label flex items-center gap-2 text-gold-text">
              <span className="np-live" aria-hidden />
              {tx(locale, `${num(verified, locale)} casas verificadas · guardia activa`, `${num(verified, locale)} verified homes · on call now`)}
            </p>
          )}
          <h1 id="hero-title" className="np-hero-title mt-4 text-[44px] text-ink sm:text-[64px] lg:mt-6 lg:text-[58px] xl:text-[68px] min-[1440px]:text-[80px]">
            {tx(locale, "Tu próximo lugar,", "Your next place,")}
            <br />
            <em>{tx(locale, "verificado.", "verified.")}</em>
          </h1>
          <p className="mt-4 max-w-[540px] text-[16px] leading-[1.55] text-muted sm:text-[17px] lg:mt-6">
            <span className="sm:hidden">{tx(locale, "Precio en USD, papeles revisados y un asesor de guardia 24/7.", "Prices in USD, paperwork checked and an advisor on call 24/7.")}</span>
            <span className="hidden sm:inline">
              {tx(
                locale,
                "Casas y apartamentos verificados en Caracas, Lechería, El Morro y Puerto La Cruz. Precio en USD, papeles revisados y un asesor de guardia 24/7.",
                "Verified houses and flats in Caracas, Lechería, El Morro and Puerto La Cruz. Prices in USD, paperwork checked and an advisor on call 24/7.",
              )}
            </span>
          </p>
          <div className="mt-5 lg:mt-8">
            <AskBar locale={locale} sticky />
          </div>
          <OnCallButton
            locale={locale}
            className="group mt-4 inline-flex min-h-11 items-center gap-2 font-display text-[15px] font-medium text-ink underline decoration-[#9A9DA1] decoration-1 underline-offset-[6px] transition-colors hover:decoration-ink"
          >
            {tx(locale, "Hablar con el asesor de guardia", "Talk to the on-call advisor")}
            <ArrowRight size={16} aria-hidden className="transition-transform duration-200 group-hover:translate-x-0.5" />
          </OnCallButton>
          {/* Trust row (desktop here; on phones it follows the model). */}
          <dl className="mt-8 hidden max-w-[620px] grid-cols-3 gap-6 border-t border-line pt-6 lg:grid">
            {trust.map((t) => (
              <div key={t.label}>
                <dt className="sr-only">{t.label}</dt>
                <dd className="np-num text-[34px] leading-none text-ink">{t.n}</dd>
                <dd className="np-label mt-2 text-muted">{t.label}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="relative -mx-5 min-w-0 md:mx-0">
          <Building4D locale={locale} caption={model.caption} hotspots={model.hotspots} className="px-3 md:px-0" />
        </div>

        <dl className="grid grid-cols-3 gap-3 border-t border-line pt-5 lg:hidden">
          {trust.map((t) => (
            <div key={t.label}>
              <dt className="sr-only">{t.label}</dt>
              <dd className="np-num text-[26px] leading-none text-ink">{t.n}</dd>
              <dd className="np-label mt-1.5 text-[10px] text-muted">{t.label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

import Link from "next/link";
import { getImageProps } from "next/image";
import type { Locale } from "@/types/domain";
import { tx } from "@/lib/i18n";
import { AskBar } from "@/components/search/AskBar";
import { OnCallButton } from "@/components/brand/PublicChrome";
import { HERO_MEDIA } from "@/lib/media";
import { HeroVideo } from "./HeroVideo";

/**
 * Hero (043 · D2, DESIGN.md): the coast at sunset edge to edge under the night scrim, «ENTRE EL ÁVILA Y EL MAR» in
 * Cormorant Garamond 300 capitals (two lines at most on a 390 px phone), a lead that carries the live count, the
 * primary «Ver casas» (bone on night) beside «Habla con un asesor», and the search. No kicker, no text-shadow: the
 * night scrim rgba(14,26,43,.55) alone keeps every line readable.
 */
export function HeroAura({ locale, available }: { locale: Locale; available: number }) {
  // The poster is the LCP: priority + fetchpriority high, art-directed (16:9 desktop, 4:5 phone). The loop (HeroVideo)
  // is laid over it after load and only when motion and data allow (043-C).
  const { poster } = HERO_MEDIA;
  const common = { alt: tx(locale, "Torre frente al mar al atardecer en Lechería", "Seafront tower at sunset in Lechería"), sizes: "100vw", quality: 60, priority: true, fetchPriority: "high" as const };
  const desktop = getImageProps({ ...common, src: poster.desktop, width: poster.width, height: poster.height }).props.srcSet;
  const mobileImg = getImageProps({ ...common, src: poster.mobile, width: poster.mobileWidth, height: poster.mobileHeight }).props;
  return (
    <section data-hide-fab className="relative isolate flex min-h-[100svh] flex-col overflow-hidden bg-navy text-ivory" aria-labelledby="hero-title">
      {/* Art direction: the coast at sunset on wide screens, the tower over the marina on phones. One <img> (the LCP), two sources. */}
      <picture>
        <source media="(min-width: 640px)" srcSet={desktop} sizes="100vw" />
        {/* eslint-disable-next-line jsx-a11y/alt-text -- next/image props via getImageProps (alt included) */}
        <img {...mobileImg} className="absolute inset-0 -z-30 h-full w-full object-cover object-[50%_40%] sm:object-[60%_50%]" />
      </picture>
      <HeroVideo locale={locale} />
      {/* The night scrim: the one veil over the photo (DESIGN.md §2.4), flat, no gradient. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[rgb(14_26_43/.55)]" />

      <div className="relative mx-auto flex w-full max-w-[1280px] flex-1 flex-col px-[clamp(16px,4vw,40px)] pb-5 pt-[calc(env(safe-area-inset-top)+104px)] md:pb-10 lg:pt-[148px]">
        <div className="max-w-[1200px]">
          <h1 id="hero-title" className="np-t-hero text-ivory">
            {tx(locale, "Entre el Ávila y el mar", "Between the Ávila and the sea")}
          </h1>
          <p className="mt-5 max-w-[540px] text-[18px] font-light leading-[1.5] text-ivory sm:text-[20px] lg:mt-7">
            {tx(
              locale,
              `${available} casas revisadas hoy en Caracas, Lechería y El Morro. Un asesor te atiende a cualquier hora.`,
              `${available} checked homes today in Caracas, Lechería and El Morro. An advisor answers at any hour.`,
            )}
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3 lg:mt-9">
            <Link
              href={`/${locale}/search`}
              className="inline-flex min-h-12 items-center rounded-[2px] bg-[#F6F2EC] px-6 font-display text-[16px] font-medium text-[#0E1A2B] transition-colors duration-np ease-np hover:bg-[#E9E1D3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ivory"
            >
              {tx(locale, "Ver casas", "See homes")}
            </Link>
            <OnCallButton
              locale={locale}
              className="inline-flex min-h-12 items-center rounded-[2px] border border-current px-6 font-display text-[16px] font-medium text-ivory transition-colors duration-np ease-np hover:bg-ivory/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ivory"
            >
              {tx(locale, "Habla con un asesor", "Talk to an advisor")}
            </OnCallButton>
          </div>
        </div>

        <div className="mt-auto pt-10">
          <AskBar locale={locale} sticky />
        </div>
      </div>
    </section>
  );
}

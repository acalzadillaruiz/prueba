import Link from "next/link";
import { getImageProps } from "next/image";
import { preload } from "react-dom";
import type { Locale } from "@/types/domain";
import { tx } from "@/lib/i18n";
import { AskBar } from "@/components/search/AskBar";
import { OnCallButton } from "@/components/brand/PublicChrome";
import { HERO_MEDIA } from "@/lib/media";

/**
 * Hero (048 · Brisa): the coast at sunset edge to edge, full screen, with lots of air. «Entre el Ávila y el mar» in
 * large light Jost (sentence case) sits low over a soft bottom gradient, with a lead that carries the live count, the
 * primary «Ver casas» (mar profundo) beside «Habla con un asesor», and the search. No text-shadow.
 */
export function HeroAura({ locale, available }: { locale: Locale; available: number }) {
  // The poster is the LCP: priority + fetchpriority high, art-directed (16:9 desktop, 4:5 phone). The loop (HeroVideo)
  // is laid over it after load and only when motion and data allow (043-C).
  const { poster } = HERO_MEDIA;
  const common = { alt: tx(locale, "Playa del Caribe al atardecer", "Caribbean beach at sunset"), sizes: "100vw", quality: 70, priority: true, fetchPriority: "high" as const };
  const desktop = getImageProps({ ...common, src: poster.desktop, width: poster.width, height: poster.height }).props.srcSet;
  const mobileImg = getImageProps({ ...common, src: poster.mobile, width: poster.mobileWidth, height: poster.mobileHeight }).props;
  // 048-Q (LCP): the art-directed hero is preloaded from the head, each source only for its own screen size.
  preload(mobileImg.src, { as: "image", imageSrcSet: mobileImg.srcSet, imageSizes: "100vw", fetchPriority: "high", media: "(max-width: 639px)" } as Parameters<typeof preload>[1]);
  if (desktop) preload(desktop.split(" ")[0], { as: "image", imageSrcSet: desktop, imageSizes: "100vw", fetchPriority: "high", media: "(min-width: 640px)" } as Parameters<typeof preload>[1]);
  return (
    <section data-hide-fab className="relative isolate flex min-h-[100svh] flex-col overflow-hidden bg-[#1F3A4D] text-ivory" aria-labelledby="hero-title">
      {/* Art direction: the beach at sunset, 16:9 on wide screens and 4:5 on phones with the sea in frame. One <img> (the LCP). */}
      <picture>
        <source media="(min-width: 640px)" srcSet={desktop} sizes="100vw" />
        {/* eslint-disable-next-line jsx-a11y/alt-text -- next/image props via getImageProps (alt included) */}
        <img {...mobileImg} className="absolute inset-0 -z-30 h-full w-full object-cover object-[50%_55%]" />
      </picture>
      {/* 048: the tower loop is retired (it repeated the tower and was a render); the beach still is the hero. */}
      {/* 048 · Brisa: no heavy veil. A light petróleo wash at the top for the header, clear sky and sea in the middle,
          and a soft gradient at the bottom where the title, lead and search sit. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgb(31_58_77/.38)_0%,rgb(31_58_77/0)_26%,rgb(31_58_77/0)_42%,rgb(31_58_77/.42)_68%,rgb(31_58_77/.72)_100%)]" />

      <div className="relative mx-auto flex w-full max-w-[1280px] flex-1 flex-col px-[clamp(16px,4vw,40px)] pb-5 pt-[calc(env(safe-area-inset-top)+104px)] md:pb-10 lg:pt-[148px]">
        <div className="mt-auto max-w-[1100px]">
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
              className="inline-flex min-h-12 items-center rounded-[12px] bg-[#3A6A92] px-6 font-display text-[16px] font-medium text-white transition-colors duration-np ease-np hover:bg-[#2F5A7E] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ivory"
            >
              {tx(locale, "Ver casas", "See homes")}
            </Link>
            <OnCallButton
              locale={locale}
              className="inline-flex min-h-12 items-center rounded-[12px] border border-current px-6 font-display text-[16px] font-medium text-ivory transition-colors duration-np ease-np hover:bg-ivory/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ivory"
            >
              {tx(locale, "Habla con un asesor", "Talk to an advisor")}
            </OnCallButton>
          </div>
        </div>

        <div className="pt-8 lg:pt-10">
          <AskBar locale={locale} sticky />
        </div>
      </div>
    </section>
  );
}

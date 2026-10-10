import { getImageProps } from "next/image";
import type { Locale } from "@/types/domain";
import { tx } from "@/lib/i18n";
import { AskBar } from "@/components/search/AskBar";
import { OnCallButton } from "@/components/brand/PublicChrome";

/**
 * Cinema hero (030/032 · estilo AMALI): a realistic photo (illustrative, AI), edge to edge and full screen, with the title in white
 * Lexend Zetta, a Barlow Light line under it and the search as a translucent capsule. Phones keep the whole search
 * on the first screen (title above it, no scrolling). A soft shade behind the text keeps it readable; the rest of the
 * photo is not darkened.
 */
export function HeroAura({ locale, available }: { locale: Locale; available: number }) {
  const common = { alt: tx(locale, "Imagen ilustrativa", "Illustrative image"), sizes: "100vw", quality: 80, priority: true, width: 1280, height: 720 };
  const desktop = getImageProps({ ...common, src: "/brand/hero-costa-atardecer.jpg" }).props.srcSet;
  const mobileImg = getImageProps({ ...common, src: "/brand/hero-torre-marina.jpg" }).props;
  return (
    <section data-hide-fab className="relative isolate flex min-h-[100svh] flex-col overflow-hidden bg-[#1C1D1D] text-white" aria-labelledby="hero-title">
      {/* Art direction: the coast at sunset on wide screens, the tower over the marina on phones (portrait crop on the
          tower). One <img> (the LCP), two sources. Illustrative images (AI), as the alt says. */}
      <picture>
        <source media="(min-width: 640px)" srcSet={desktop} sizes="100vw" />
        {/* eslint-disable-next-line jsx-a11y/alt-text -- next/image props via getImageProps (alt included) */}
        <img {...mobileImg} className="np-hero-photo absolute inset-x-0 top-0 -z-20 h-[76%] w-full object-cover object-[35%_50%] [mask-image:linear-gradient(180deg,#000_80%,transparent)] sm:inset-0 sm:h-full sm:object-[50%_50%] sm:[mask-image:none]" />
      </picture>
      {/* Shade only behind the text block (034a: the rest of the photo keeps its golden light). Measured line by line with
          the text hidden: every hero line ≥ 4.5:1 at 390, subtitle and small line ≥ 4.5:1 at 1440. On phones the tower
          photo ends above the search (034b), fading into the dark base, so the water stays in view. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgb(28_29_29/.68)_0%,rgb(28_29_29/.58)_36%,rgb(28_29_29/.2)_46%,rgb(28_29_29/0)_54%)] sm:bg-[radial-gradient(ellipse_75%_58%_at_26%_26%,rgb(28_29_29/.74)_0%,rgb(28_29_29/.64)_30%,rgb(28_29_29/.36)_60%,rgb(28_29_29/.12)_80%,rgb(28_29_29/0)_100%),linear-gradient(180deg,rgb(28_29_29/0)_70%,rgb(28_29_29/.3)_100%)]" />

      <div className="relative mx-auto flex w-full max-w-[1320px] flex-1 flex-col px-4 pb-5 pt-[calc(env(safe-area-inset-top)+96px)] md:px-8 md:pb-10 lg:pt-[140px]">
        <div data-reveal="stagger" className="max-w-[920px]">
          <p className="flex items-center gap-2.5 font-display text-[12px] font-medium uppercase tracking-[.2em] text-white/90">
            <span className="np-live" aria-hidden />
            {/* The real figure from the first frame (no count-up: a climbing number reads as "still loading"). */}
            <span>
              {available} {tx(locale, "casas disponibles hoy", "homes available today")}
            </span>
          </p>
          <h1 id="hero-title" className="mt-4 max-w-[920px] text-[clamp(28px,3.2vw,48px)] font-extralight text-white [text-shadow:0_1px_14px_rgb(0_0_0/.35)] lg:mt-6">
            {tx(locale, "Tu próximo lugar,", "Your next place,")} <span className="whitespace-nowrap">{tx(locale, "verificado", "verified")}</span>
          </h1>
          <span aria-hidden className="mt-5 block h-px w-[min(300px,70%)] bg-white/70 lg:mt-7" />
          <p className="mt-4 max-w-[520px] text-[16px] font-light leading-relaxed text-white [text-shadow:0_1px_10px_rgb(0_0_0/.45)] sm:text-[18px] lg:mt-6">
            {tx(
              locale,
              "Casas revisadas en Caracas, Lechería y El Morro. Un asesor te atiende a cualquier hora.",
              "Checked homes in Caracas, Lechería and El Morro. An advisor answers at any hour.",
            )}
          </p>
        </div>

        <div className="mt-auto flex flex-col items-center gap-3 pt-8 md:gap-4">
          <AskBar locale={locale} sticky className="mx-auto" />
          <OnCallButton
            locale={locale}
            className="flex min-h-11 items-center gap-2 rounded-full border border-white/30 bg-white/15 px-4 font-display text-[14px] text-white backdrop-blur-md transition-colors hover:bg-white/25"
          >
            <span className="h-2 w-2 rounded-full bg-[#3BB273]" aria-hidden />
            {tx(locale, "Guardia 24/7", "On call 24/7")}
            <span className="sr-only">{tx(locale, ": habla con un asesor ahora", ": talk to an advisor now")}</span>
          </OnCallButton>
        </div>
      </div>
    </section>
  );
}

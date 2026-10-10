import Image from "next/image";
import type { Locale } from "@/types/domain";
import { tx } from "@/lib/i18n";
import { AskBar } from "@/components/search/AskBar";
import { OnCallButton } from "@/components/brand/PublicChrome";

/**
 * Cinema hero (030 · estilo AMALI): the coast at sunset, edge to edge and full screen, with the title in white
 * Lexend Zetta, a Barlow Light line under it and the search as a translucent capsule. Phones keep the whole search
 * on the first screen (title above it, no scrolling). A soft shade at the top and bottom keeps white text readable;
 * the photo itself is not darkened.
 */
export function HeroAura({ locale, available }: { locale: Locale; available: number }) {
  return (
    <section data-hide-fab className="relative isolate flex min-h-[100svh] flex-col overflow-hidden bg-[#1C1D1D] text-white" aria-labelledby="hero-title">
      <Image
        src="/brand/hero-costa.jpg"
        alt={tx(locale, "Ilustración 3D: villa frente al mar turquesa al atardecer, con muelle y yate", "3D illustration: a villa on a turquoise sea at sunset, with a pier and a yacht")}
        fill
        priority
        fetchPriority="high"
        sizes="100vw"
        quality={80}
        className="np-hero-photo -z-20 object-cover object-[66%_50%] sm:object-[60%_50%]"
      />
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgb(28_29_29/.5)_0%,rgb(28_29_29/.28)_38%,rgb(28_29_29/0)_56%,rgb(28_29_29/.45)_100%)] sm:bg-[linear-gradient(180deg,rgb(28_29_29/.42)_0%,rgb(28_29_29/0)_26%,rgb(28_29_29/0)_48%,rgb(28_29_29/.5)_100%)]" />

      <div className="relative mx-auto flex w-full max-w-[1320px] flex-1 flex-col px-4 pb-5 pt-[calc(env(safe-area-inset-top)+96px)] md:px-8 md:pb-10 lg:pt-[140px]">
        <div data-reveal="stagger" className="max-w-[760px]">
          <p className="flex items-center gap-2.5 font-display text-[12px] font-medium uppercase tracking-[.2em] text-white/90">
            <span className="np-live" aria-hidden />
            {/* The real figure from the first frame (no count-up: a climbing number reads as "still loading"). */}
            <span>
              {available} {tx(locale, "casas disponibles hoy", "homes available today")}
            </span>
          </p>
          <h1 id="hero-title" className="mt-4 text-[34px] leading-[1.3] text-white [text-shadow:0_1px_18px_rgb(0_0_0/.25)] sm:text-[48px] lg:mt-6 lg:text-[60px]">
            {tx(locale, "Tu próximo lugar,", "Your next place,")} <span className="whitespace-nowrap">{tx(locale, "verificado", "verified")}</span>
          </h1>
          <span aria-hidden className="mt-5 block h-px w-[min(300px,70%)] bg-white/70 lg:mt-7" />
          <p className="mt-4 max-w-[520px] text-[16px] font-light leading-relaxed text-white/90 sm:text-[18px] lg:mt-6">
            {tx(
              locale,
              "Casas verificadas en Caracas, Lechería y El Morro, con asesor de guardia 24/7.",
              "Verified homes in Caracas, Lechería and El Morro, with an advisor on call 24/7.",
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

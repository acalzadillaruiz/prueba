import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, PhoneCall, ShieldCheck } from "lucide-react";
import type { Locale } from "@/types/domain";
import { tx } from "@/lib/i18n";
import { AskBar } from "@/components/search/AskBar";
import { OnCallButton } from "@/components/brand/PublicChrome";

/**
 * 2035 hero: light Lino with a slow aurora, a quiet editorial headline, the conversational search, and an arched
 * photograph that leans toward the pointer with two frosted cards floating over it (a real residence and the
 * advisors on call). No dark overlay: the photo is framed, not darkened.
 */
export function HeroAura({
  locale,
  available,
  featured,
}: {
  locale: Locale;
  available: number;
  featured?: { href: string; title: string; zone: string; price: string; photo?: string };
}) {
  return (
    <section data-hide-fab className="np-grain relative overflow-hidden bg-ivory pt-[calc(env(safe-area-inset-top)+80px)] sm:pt-[104px] lg:pt-[120px]" aria-labelledby="hero-title">
      <div className="np-aura" aria-hidden>
        <i />
        <i />
        <i />
      </div>
      <div className="relative mx-auto grid max-w-[1320px] grid-cols-1 items-center gap-7 px-4 pb-10 sm:gap-12 sm:pb-16 md:px-8 lg:grid-cols-[1.08fr_.92fr] lg:gap-10 lg:pb-24">
        <div data-reveal="stagger" className="relative z-10 min-w-0">
          <p className="np-glass inline-flex items-center gap-2.5 rounded-full px-3.5 py-1 font-display text-[13px] text-ink/80 sm:py-1.5">
            <span className="np-live" aria-hidden />
            <span>
              {/* The real figure from the first frame (no count-up here: a climbing number reads as "still loading"). */}
              {available} {tx(locale, "casas disponibles hoy", "homes available today")}
            </span>
          </p>
          <h1 id="hero-title" className="mt-4 max-w-[680px] text-[31px] leading-[1.06] tracking-[-0.02em] text-ink sm:mt-7 sm:text-[60px] sm:leading-[1.04] lg:text-[76px]">
            {tx(locale, "Hay casas que se visitan.", "Some homes you visit.")}{" "}
            {/* Second line in Bronce text (6.6:1 on Lino, AA in dark too): quieter than the first, never faint. */}
            <span className="text-gold-text">{tx(locale, "Y otras que se quedan contigo.", "Others stay with you.")}</span>
          </h1>
          <p className="mt-3 max-w-[540px] text-[15px] leading-normal text-ink/75 sm:mt-6 sm:text-[17px] sm:leading-relaxed">
            <span className="sm:hidden">
              {tx(
                locale,
                "Pocas casas, bien elegidas. Te acompañamos hasta las llaves.",
                "A few homes, well chosen. With you until the keys.",
              )}
            </span>
            <span className="hidden sm:inline">
              {tx(
                locale,
                "Elegimos pocas casas en Lechería, El Morro, Margarita y Caracas. Las conocemos por dentro, sabemos lo que valen y te acompañamos hasta que tengas las llaves en la mano, estés donde estés.",
                "We choose a few homes in Lechería, El Morro, Margarita and Caracas. We know them inside out, we know what they're worth, and we stay with you until the keys are in your hand, wherever you are.",
              )}
            </span>
          </p>
          <div className="mt-5 sm:mt-9">
            <AskBar locale={locale} sticky />
          </div>
        </div>

        {/* Phones: the search comes first (whole bar visible on first paint, clear of the tab bar); the arch follows
            as a calmer band right below it. */}
        <div className="relative mx-auto w-full max-w-[360px] sm:max-w-[520px] lg:mr-0" data-tilt="5" style={{ transformStyle: "preserve-3d" }}>
          <div className="np-arch relative aspect-[6/5] w-full bg-arena shadow-[0_40px_90px_-30px_rgba(30,26,24,.45)] sm:aspect-[4/5]">
            <Image
              src="/brand/hero-arco.jpg"
              alt={tx(locale, "Arco abierto a una terraza frente al mar", "An arch opening onto a terrace by the sea")}
              fill
              priority
              fetchPriority="high"
              sizes="(max-width: 640px) 360px, (max-width: 1024px) 90vw, 520px"
              className="object-cover"
            />
          </div>
          {/* Advisors on call: opens today's rota. */}
          <OnCallButton
            locale={locale}
            className="np-glass absolute -right-2 top-[14%] hidden items-center sm:flex gap-3 rounded-2xl px-4 py-3 text-left transition-transform duration-300 hover:-translate-y-0.5 sm:-right-8"
          >
            <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-ink text-ivory">
              <PhoneCall size={17} aria-hidden />
              <span className="np-live absolute -right-0.5 -top-0.5 ring-2 ring-white" aria-hidden />
            </span>
            <span>
              <span className="block font-display text-[14px] font-semibold text-ink">{tx(locale, "Un asesor te atiende ya", "An advisor is here now")}</span>
              <span className="block font-display text-[12.5px] text-ink/60">{tx(locale, "De guardia los 7 días", "On call 7 days a week")}</span>
            </span>
          </OnCallButton>
          {featured && (
            <Link
              href={featured.href}
              data-spotlight
              className="np-glass group absolute -left-2 bottom-[8%] flex w-[min(320px,92%)] items-center gap-3 rounded-2xl p-2 pr-3 sm:p-2.5 sm:pr-4 transition-transform duration-300 hover:-translate-y-0.5 sm:-left-10"
            >
              <span className="relative h-12 w-12 shrink-0 sm:h-16 sm:w-16 overflow-hidden rounded-xl bg-arena">
                {featured.photo && <Image src={featured.photo} alt="" fill sizes="64px" className="object-cover transition-transform duration-700 group-hover:scale-110" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1 font-display text-[11.5px] font-medium uppercase tracking-[.14em] text-gold-text">
                  <ShieldCheck size={13} aria-hidden /> {tx(locale, "Precio verificado", "Verified price")}
                </span>
                <span className="mt-0.5 block truncate font-display text-[14px] font-semibold text-ink">{featured.title}</span>
                <span className="block truncate font-display text-[12.5px] text-ink/60">{featured.zone}</span>
                {/* The price gets its own line and is never cut ("USD 890.…" read as a different number). */}
                <span className="mt-0.5 block whitespace-nowrap font-display text-[15px] font-semibold text-ink [font-feature-settings:'lnum']">{featured.price}</span>
              </span>
              <ArrowUpRight size={18} aria-hidden className="shrink-0 text-ink/50 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ink" />
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

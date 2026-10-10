import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Check } from "lucide-react";
import type { Listing, Locale } from "@/types/domain";
import { PublicPage } from "@/components/layout/PublicPage";
import { HomeMap } from "@/components/search/HomeMap";
import { mapListing } from "@/components/map/mapListing";
import { factsLine } from "@/components/listing/ListingCard";
import { HomeMotion } from "@/components/home/HomeMotion";
import { HeroAura } from "@/components/home/HeroAura";
import { BuildingScroll } from "@/components/home/BuildingScroll";
import { CollectionRail } from "@/components/home/CollectionRail";
import { RemoteRoute } from "@/components/home/RemoteRoute";
import { listingHref } from "@/lib/listing-href";
import { listingPhoto } from "@/lib/photos";
import { Button } from "@/components/ui";
import { cn } from "@/lib/cn";
import { publicListings } from "@/server/listings";
import { zoneStats } from "@/server/zone-stats";
import { money, plural, priceSuffix, tx } from "@/lib/i18n";

// Static and cached (ISR): no session is read on public pages; data refreshes every 60 s and on listing changes.
export const revalidate = 60;

/** Zones featured next to the map (the brand's coast first), with a brand photo each. Figures come from zoneStats. */
const FEATURED_ZONES: { zone: string; photo: string }[] = [
  { zone: "Lechería", photo: "/brand/marina.jpg" },
  { zone: "Playa El Agua", photo: "/brand/terraza.jpg" },
  { zone: "Country Club", photo: "/brand/villa.jpg" },
  { zone: "Altamira", photo: "/brand/salon.jpg" },
];

const AVAILABLE = ["ACTIVE", "COMING_SOON", "UNDER_OFFER"];

/** What a rentals-only zone offers, shown in its own group under the sale zones (es, en). */
const RENT_LABEL: Record<string, [string, string]> = {
  SHORT_RENT: ["Vacacional", "Holiday rentals"],
  LONG_RENT: ["Alquiler", "Long-term rent"],
  COMMERCIAL: ["Comercial", "Commercial"],
};

/**
 * The search tab where a zone's listings live (Lechería today is vacation rentals only, for example), and the figure
 * shown on its card for that same tab: the sale price per m² for SALE, otherwise the lowest price of that type
 * ("desde $220/noche"). Card figure and link always speak about the same kind of home.
 */
function zoneCard(locale: Locale, zone: string, all: Listing[]) {
  const counts = new Map<string, number>();
  const kindOf = (l: Listing) => (l.listingType.startsWith("COMMERCIAL") ? "COMMERCIAL" : l.listingType);
  for (const l of all) if (l.zone === zone) counts.set(kindOf(l), (counts.get(kindOf(l)) ?? 0) + 1);
  const type = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "SALE";
  const href = `/${locale}/search?type=${type}&zone=${encodeURIComponent(zone)}`;
  if (type === "SALE") return { href, type, from: null };
  const cheapest = all.filter((l) => l.zone === zone && kindOf(l) === type).sort((a, b) => a.priceAmount - b.priceAmount)[0];
  return { href, type, from: cheapest ? { price: money(cheapest.priceAmount, locale), suffix: priceSuffix(cheapest, locale) } : null };
}

export default async function Home({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const all = await publicListings();
  const available = all.filter((l) => AVAILABLE.includes(l.status));
  // "Pocas propiedades": the exclusive (luxury) ones first, then the newest. Six glide in the collection rail,
  // the first three are the lit floors of the 3D building.
  const ranked = [...available.filter((l) => l.luxury), ...available.filter((l) => !l.luxury)];
  const price = (l: Listing) => money(l.priceAmount, locale) + priceSuffix(l, locale);
  const rail = ranked.slice(0, 6).map((l) => ({
    href: listingHref(locale, l),
    title: tx(locale, l.title_es, l.title_en),
    zone: l.zone,
    price: price(l),
    facts: factsLine(l, locale).join(" · "),
    photo: listingPhoto(l, 0),
    badge: l.luxury ? tx(locale, "Colección Privada", "Private Collection") : undefined,
  }));
  const floors = ranked.slice(0, 3).map((l) => ({ href: listingHref(locale, l), title: tx(locale, l.title_es, l.title_en), meta: `${l.zone} · ${factsLine(l, locale).join(" · ")}`, price: price(l) }));
  const pins = available.map(mapListing);
  // Each zone shows one of its own homes when it has one (the brand photos are the fallback).
  const zonePhoto = (zone: string, fallback: string) => {
    const l = available.find((x) => x.zone === zone && x.photos?.length);
    return (l && listingPhoto(l, 0)) || fallback;
  };
  const zones = await Promise.all(FEATURED_ZONES.map(async (z) => ({ ...z, photo: zonePhoto(z.zone, z.photo), stats: await zoneStats(z.zone), ...zoneCard(locale, z.zone, available) })));
  const saleZones = zones.filter((z) => z.type === "SALE");
  const otherZones = zones.filter((z) => z.type !== "SALE");
  const zoneCount = (n: number) => (n > 0 ? plural(n, locale, ["propiedad", "propiedades"], ["property", "properties"]) : tx(locale, "Próximamente", "Coming soon"));

  const chapters = [
    { eyebrow: tx(locale, "01 · Antes de firmar", "01 · Before you sign"), title: tx(locale, "Papeles en regla, sin sorpresas.", "Paperwork in order, no surprises."), body: tx(locale, "Nuestro equipo legal revisa títulos, solvencias y gravámenes antes de que pongas un dólar. Si algo no cuadra, te lo decimos primero.", "Our legal team checks titles, tax clearances and liens before you put down a dollar. If something doesn't add up, you hear it from us first.") },
    { eyebrow: tx(locale, "02 · El precio justo", "02 · A fair price"), title: tx(locale, "Sabes lo que vale. De verdad.", "You'll know what it's worth. Really."), body: tx(locale, "Cada casa trae su valor estimado New Place, hecho con ventas reales de la zona. Nada de precios inflados.", "Every home comes with a PlaceEstimate valuation built from real sales nearby. No inflated prices.") },
    { eyebrow: tx(locale, "03 · A tu ritmo", "03 · At your pace"), title: tx(locale, "Visitas cuando a ti te venga bien.", "Viewings when it suits you."), body: tx(locale, "En persona o por videollamada, con tu asesor de siempre. Su agenda es real: reservas y listo.", "In person or by video call, with the same advisor every time. Their calendar is real: book and you're set.") },
    { eyebrow: tx(locale, "04 · Tu casa", "04 · Your home"), title: tx(locale, "La luz encendida es para ti.", "The light that's on is for you."), body: tx(locale, "Las plantas iluminadas son casas disponibles hoy. Toca una y entra.", "The lit floors are homes available today. Tap one and step inside.") },
  ];
  const steps = [
    [tx(locale, "La recorremos contigo, en vivo", "We walk you through it, live"), tx(locale, "Por videollamada, con calma, mirando lo que tú quieras ver.", "By video call, calmly, looking at whatever you want to see.")],
    [tx(locale, "Revisamos cada papel", "We check every document"), tx(locale, "Títulos, solvencias y gravámenes, antes de firmar nada.", "Titles, tax clearances and liens, before you sign anything.")],
    [tx(locale, "Firmamos por ti, si hace falta", "We sign for you, if needed"), tx(locale, "Con un poder notarial, te representamos en el registro.", "With a power of attorney, we represent you at the registry.")],
    [tx(locale, "Pagas en dólares, con seguridad", "You pay in dollars, safely"), tx(locale, "Y con un comprobante en cada paso.", "With a receipt at every step.")],
    [tx(locale, "Te damos las llaves", "We hand you the keys"), tx(locale, "Y, si quieres, la alquilamos por ti mientras no estás.", "And, if you like, we rent it out for you while you're away.")],
  ];
  const owner = [
    tx(locale, "Te decimos cuánto vale, con datos reales", "We tell you what it's worth, with real data"),
    tx(locale, "Fotos profesionales y solo compradores serios", "Professional photos and only serious buyers"),
    tx(locale, "Tú decides quién la ve y cuándo", "You decide who sees it, and when"),
  ];
  const marquee = ["Lechería", "El Morro", "Playa El Agua", "Pampatar", "Country Club", "Altamira", "La Castellana", "Los Palos Grandes", "Higuerote", "Tucacas"];

  return (
    <PublicPage locale={locale} header="transparent" tabbar contact={{ href: `/${locale}/luxury#acceso`, label: tx(locale, "Hablar con una persona", "Talk to a person") }}>
      <HomeMotion />
      {/* HERO — cinema, full screen: the coast at sunset with the search on it. */}
      <HeroAura locale={locale} available={available.length} />

      {/* ZONES — they glide by, endlessly. */}
      <div className="relative overflow-hidden border-y border-egeo/40 bg-ivory py-5 md:py-7" aria-label={tx(locale, "Dónde estamos", "Where we are")}>
        <div className="np-marquee gap-12 pr-12">
          {[...marquee, ...marquee].map((z, i) => (
            <span key={i} aria-hidden={i >= marquee.length || undefined} className="flex shrink-0 items-center gap-12 font-title text-[15px] font-extralight uppercase tracking-[.12em] text-ink/80 md:text-[22px]">
              {z}
              <span className="h-px w-8 bg-egeo" aria-hidden />
            </span>
          ))}
        </div>
      </div>

      {/* COLECCIÓN PRIVADA — real homes right after the hero: horizontal gallery */}
      <CollectionRail
        eyebrow={tx(locale, "Colección Privada", "Private Collection")}
        title={tx(locale, "Las que no se olvidan.", "The ones you don't forget.")}
        items={rail}
        more={{ href: `/${locale}/luxury`, label: tx(locale, "Ver toda la colección", "See the whole collection") }}
      />

      {/* EXPLORE EN EL MAPA */}
      <section id="explorar" className="mx-auto max-w-[1320px] px-4 pt-6 md:px-8 md:pt-20 lg:pt-24">
        <div data-reveal className="mb-5 grid items-end gap-2 md:mb-8 md:grid-cols-[1fr_auto] md:gap-4 lg:mb-10">
          <div><p className="np-kicker text-gold-text">{tx(locale, "El mapa", "The map")}</p><h2 className="mt-2 text-[30px] leading-[1.05] tracking-[-0.02em] md:mt-3 md:text-[52px]">{tx(locale, "Elige primero el lugar.", "Choose the place first.")}</h2></div>
          <p className="max-w-[380px] text-[15px] leading-relaxed text-muted md:text-right">
            {tx(locale, "Lo que cuesta el metro cuadrado en cada zona, con casas reales.", "What a square metre costs in each area, from real homes.")}
            <span className="hidden md:inline">{tx(locale, " Dibuja la tuya y te avisamos cuando aparezca algo.", " Draw yours and we\u2019ll tell you when something turns up.")}</span>
          </p>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
          {/* Framed on the coast from Los Roques / Caracas to Margarita, with room for the edge clusters and price pills. */}
          <HomeMap listings={pins} locale={locale} focus={{ lat: 10.95, lng: -65.45 }} initialScale={2.9} phoneScale={2.15} className="h-[340px] sm:h-[420px]" />
          <div className="flex min-w-0 flex-col gap-3">
            {/* One metric per list: the sale zones show the price per m²; zones that today only have rentals (Lechería:
                vacation homes) go in their own small group, with their "from" price per night / month. */}
            {saleZones.length > 0 && <p className="font-display text-[13px] font-semibold uppercase tracking-[.16em] text-muted">{tx(locale, "En venta · precio por m²", "For sale · price per m²")}</p>}
            {/* Phones: a sideways rail (one row, swipe) instead of a tall stack; md+: the stacked list. */}
            {/* Tablets (md, map above): two columns, so the list isn't four tall rows; lg: the stack beside the map. */}
            <ul data-reveal="stagger" data-zone-rail className="no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 md:mx-0 md:grid md:snap-none md:grid-cols-2 md:overflow-visible md:px-0 lg:flex lg:flex-col">
              {saleZones.map((z) => (
                <li key={z.zone} className="w-[78%] shrink-0 snap-start sm:w-[46%] md:w-auto">
                  <Link href={z.href} data-spotlight className="np-glass group flex h-full min-h-[88px] items-stretch overflow-hidden rounded-[4px] transition-transform duration-500 hover:-translate-y-0.5 md:min-h-[104px]">
                    <span className="relative m-2 w-[56px] shrink-0 overflow-hidden rounded-[4px] sm:w-[84px] lg:w-[100px]">
                      <Image src={z.photo} alt="" fill sizes="112px" className="object-cover transition-transform duration-700 group-hover:scale-105" />
                    </span>
                    <span className="flex min-w-0 flex-1 items-center justify-between gap-2.5 px-2.5 py-3 sm:gap-3 sm:px-4 sm:py-4 lg:px-5">
                      <span className="min-w-0">
                        {/* Up to two balanced lines: "Playa El Agua", "Country Club" read whole on a 390 px rail card and in the 768 px two-column grid. */}
                        <span className="line-clamp-2 break-words font-serif text-[19px] leading-[1.12] [text-wrap:balance] sm:text-[22px] lg:text-[25px]">{z.zone}</span>
                        <span className="block text-sm text-muted">{zoneCount(z.stats.activeListings)}</span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block font-display text-[15px] font-semibold text-ink">{money(z.stats.salePpm, locale)}</span>
                        <span className="block text-sm text-muted">{tx(locale, "por m²", "per m²")}</span>
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            {otherZones.length > 0 && (
              <>
                <p className={cn("font-display text-[13px] font-semibold uppercase tracking-[.16em] text-muted", saleZones.length > 0 && "mt-1 md:mt-3")}>{tx(locale, "Solo en alquiler · desde", "Rentals only · from")}</p>
                <ul className="flex flex-col gap-2">
                  {otherZones.map((z) => (
                    <li key={z.zone}>
                      <Link href={z.href} className="np-glass group flex min-h-[64px] items-center gap-3 rounded-[4px] p-1.5 pr-4 transition-transform duration-500 hover:-translate-y-0.5">
                        <span className="relative h-[52px] w-[52px] shrink-0 overflow-hidden rounded-[4px]">
                          <Image src={z.photo} alt="" fill sizes="56px" className="object-cover" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-serif text-[19px] leading-tight">{z.zone}</span>
                          <span className="block truncate text-[13px] text-muted">
                            {RENT_LABEL[z.type] ? tx(locale, RENT_LABEL[z.type][0], RENT_LABEL[z.type][1]) : ""}
                            {RENT_LABEL[z.type] ? " · " : ""}
                            {zoneCount(z.stats.activeListings)}
                          </span>
                        </span>
                        {z.from && (
                          <span className="shrink-0 font-display text-[15px] font-semibold text-ink">
                            <span className="sr-only">{tx(locale, "desde ", "from ")}</span>
                            {z.from.price}
                            <span className="font-normal text-muted">{z.from.suffix}</span>
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
            <div className="pt-1">
              <Button href={`/${locale}/search?type=SALE`} variant="outline" className="w-full">
                {tx(locale, "Abrir el mapa", "Open the map")} <ArrowRight size={16} aria-hidden />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* THE BUILDING — how we work. Plays by itself when it comes into view (pause / step bars, no scroll pinning):
          3D on capable desktops, a light CSS tower on phones and modest devices, a plain list under reduced motion. */}
      <div className="mt-10 md:mt-14 lg:mt-24">
        <BuildingScroll locale={locale} chapters={chapters} picks={floors} heading={tx(locale, "Así trabajamos", "How we work")} cta={tx(locale, "Ver casa", "See home")} />
      </div>

      {/* COMPRA A DISTANCIA — the diaspora's routes draw in to Lechería as the steps light up. */}
      <div className="lg:pt-8">
        <RemoteRoute
          eyebrow={tx(locale, "Si vives fuera", "If you live abroad")}
          title={tx(locale, "Tu casa en Venezuela, sin subirte a un avión.", "Your home in Venezuela, without boarding a plane.")}
          steps={steps as [string, string][]}
        >
          <Button href={`/${locale}/search?type=SALE`} variant="outline" className="mt-6 md:mt-8">
            {tx(locale, "Ver casas disponibles", "See available homes")}
          </Button>
        </RemoteRoute>
      </div>

      {/* THE PROMISE — a solid Taupe block with light text (AMALI's quote blocks). */}
      <section className="mt-10 bg-[#6B5D52] text-[#EDE6DA] lg:mt-20" aria-label={tx(locale, "Nuestra promesa", "Our promise")}>
        <div data-reveal className="mx-auto max-w-[1100px] px-6 py-16 text-center md:px-10 md:py-24">
          <p className="font-display text-[12px] font-medium uppercase tracking-[.22em] text-[#EDE6DA]/80">New Place</p>
          <blockquote className="mx-auto mt-6 max-w-[880px] font-title text-[17px] font-extralight uppercase leading-[1.7] tracking-[.08em] md:text-[26px]">
            {tx(
              locale,
              "Pocas casas, bien elegidas. Las conocemos por dentro, sabemos lo que valen y te acompañamos hasta las llaves.",
              "A few homes, well chosen. We know them inside out, we know what they're worth, and we stay with you until the keys.",
            )}
          </blockquote>
          <span aria-hidden className="mx-auto mt-8 block h-px w-24 bg-[#EDE6DA]/50" />
          <p className="mt-6 font-display text-[13px] font-light tracking-[.14em] text-[#EDE6DA]/85">{tx(locale, "Verificada. De guardia. De aquí.", "Verified. On call. From here.")}</p>
        </div>
      </section>

      {/* VENDA EN PRIVADO */}
      <section className="relative overflow-hidden bg-ivory">
        <div className="relative mx-auto grid max-w-[1320px] items-center gap-6 px-5 pt-12 md:gap-10 md:px-10 md:pt-16 lg:grid-cols-2 lg:gap-16 lg:pt-16">
          <div data-reveal className="pb-0 md:pb-4 lg:pb-12">
            <p className="np-kicker text-gold-text">{tx(locale, "Si vas a vender", "If you\u2019re selling")}</p>
            <h2 className="mt-3 text-[32px] leading-[1.05] md:text-[52px]">
              {tx(locale, "Tu casa merece", "Your home deserves")}
              <br />
              <span className="text-gold-text">{tx(locale, "que la cuenten bien.", "to be told well.")}</span>
            </h2>
            <ul className="mt-5 space-y-2.5 md:mt-7 md:space-y-3">
              {owner.map((o) => (
                <li key={o} className="flex items-center gap-3 text-[15px] text-ink/80">
                  <Check size={16} strokeWidth={2.4} className="shrink-0 text-gold-text" aria-hidden /> {o}
                </li>
              ))}
            </ul>
            <span data-magnetic className="mt-6 inline-block md:mt-9">
              <Button href={`/${locale}/sell`} variant="navy" size="lg">
                {tx(locale, "¿Cuánto vale mi casa?", "What\u2019s my home worth?")} <ArrowUpRight size={18} aria-hidden />
              </Button>
            </span>
          </div>
          {/* Portrait only beside the copy (lg); stacked below it (phones, tablets) a landscape band. */}
          <div data-unveil className="relative mx-auto mb-10 aspect-[16/10] w-full max-w-[520px] overflow-hidden rounded-[2px] bg-[#D9CDB8] md:mb-12 lg:mb-16 lg:mr-0 lg:aspect-[4/3]">
            <div data-parallax="40" className="absolute -inset-y-[8%] inset-x-0">
              <Image src="/brand/terraza.jpg" alt={tx(locale, "Terraza con vista a la ciudad al atardecer", "A terrace over the city at dusk")} fill sizes="(max-width: 1024px) 90vw, 520px" className="object-cover" />
            </div>
          </div>
        </div>
      </section>
    </PublicPage>
  );
}

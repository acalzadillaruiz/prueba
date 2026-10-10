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
import { HowWeWork } from "@/components/home/HowWeWork";
import salonMar from "../../../public/brand/salon-mar.jpg";
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
  // "Pocas propiedades": the exclusive (luxury) ones first, then the newest. Six glide in the collection rail.
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

  // "Así trabajamos": what the buyer gets, then how (035: short, concrete, at most two lines on a phone).
  const chapters = [
    { eyebrow: tx(locale, "01 · Antes de firmar", "01 · Before you sign"), title: tx(locale, "Papeles en regla, sin sorpresas", "Paperwork in order, no surprises"), body: tx(locale, "Revisamos títulos, deudas y gravámenes antes de que pagues nada.", "We check titles, debts and liens before you pay anything.") },
    { eyebrow: tx(locale, "02 · El precio", "02 · The price"), title: tx(locale, "Sabes lo que vale", "You know what it's worth"), body: tx(locale, "Cada casa trae su precio verificado con ventas reales de la zona.", "Every home comes with a price checked against real sales nearby.") },
    { eyebrow: tx(locale, "03 · Las visitas", "03 · Viewings"), title: tx(locale, "Visitas cuando te venga bien", "Viewings when it suits you"), body: tx(locale, "En persona o por video, con el mismo asesor y su agenda real.", "In person or by video, with the same advisor and their real calendar.") },
    { eyebrow: tx(locale, "04 · Las llaves", "04 · The keys"), title: tx(locale, "Te acompañamos hasta el final", "With you to the end"), body: tx(locale, "Firmas, pagas y recibes tu casa con un asesor a tu lado.", "You sign, pay and get your keys with an advisor beside you.") },
  ];
  const steps = [
    [tx(locale, "Visita en video", "Video viewing"), tx(locale, "Recorremos la casa contigo, en vivo.", "We walk you through the home, live.")],
    [tx(locale, "Revisamos los papeles", "We check the papers"), tx(locale, "Títulos, deudas y gravámenes, antes de firmar.", "Titles, debts and liens, before you sign.")],
    [tx(locale, "Firmamos por ti", "We sign for you"), tx(locale, "Con un poder notarial, te representamos.", "With a power of attorney, we represent you.")],
    [tx(locale, "Pagas en dólares", "You pay in dollars"), tx(locale, "De forma segura y con comprobante en cada paso.", "Safely, with a receipt at every step.")],
    [tx(locale, "Recibes las llaves", "You get the keys"), tx(locale, "Y si quieres, la alquilamos por ti.", "And if you like, we rent it out for you.")],
  ];
  const owner = [
    tx(locale, "Te decimos cuánto vale, con ventas reales", "We tell you what it's worth, from real sales"),
    tx(locale, "Fotos profesionales y compradores serios", "Professional photos and serious buyers"),
    tx(locale, "Tú decides quién la visita y cuándo", "You decide who visits, and when"),
  ];
  const marquee = ["Lechería", "El Morro", "Playa El Agua", "Pampatar", "Country Club", "Altamira", "La Castellana", "Los Palos Grandes", "Higuerote", "Tucacas"];

  return (
    <PublicPage locale={locale} header="transparent" tabbar contact={{ href: `/${locale}/luxury#acceso`, label: tx(locale, "Hablar con un asesor", "Talk to an advisor") }}>
      <HomeMotion />
      {/* HERO — cinema, full screen: the coast at sunset with the search on it. */}
      <HeroAura locale={locale} available={available.length} />

      {/* ZONES — they glide by, endlessly. */}
      <div className="relative overflow-hidden border-y border-egeo/40 bg-ivory py-5 md:py-7" aria-label={tx(locale, "Dónde estamos", "Where we are")}>
        <div className="np-marquee gap-12 pr-12">
          {[...marquee, ...marquee].map((z, i) => (
            <span key={i} aria-hidden={i >= marquee.length || undefined} className="flex shrink-0 items-center gap-12 font-title text-[24px] font-light tracking-[.01em] text-ink/80 md:text-[36px]">
              {z}
              <span className="h-px w-8 bg-egeo" aria-hidden />
            </span>
          ))}
        </div>
      </div>

      {/* COLECCIÓN PRIVADA — real homes right after the hero: horizontal gallery */}
      <CollectionRail
        eyebrow={tx(locale, "Colección Privada", "Private Collection")}
        title={tx(locale, "Casas elegidas una a una", "Homes chosen one by one")}
        items={rail}
        more={{ href: `/${locale}/luxury`, label: tx(locale, "Ver toda la colección", "See the whole collection") }}
      />

      {/* EXPLORE EN EL MAPA */}
      <section id="explorar" className="mx-auto max-w-[1320px] px-4 pb-14 pt-14 md:px-8 md:pb-20 md:pt-20 lg:pt-24">
        <div data-reveal className="mb-5 grid items-end gap-2 md:mb-8 md:grid-cols-[1fr_auto] md:gap-4 lg:mb-10">
          <div><p className="np-kicker text-gold-text">{tx(locale, "Mapa", "Map")}</p><h2 className="mt-2 text-[30px] md:mt-3 md:text-[48px]">{tx(locale, "Busca por zona", "Search by area")}</h2></div>
          <p className="max-w-[380px] text-[15px] leading-relaxed text-muted md:text-right">
            {tx(locale, "Mira en el mapa dónde está cada casa y cuánto cuesta.", "See on the map where each home is and what it costs.")}
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

      {/* HOW WE WORK — a realistic photo and four short steps (035: no 3D). */}
      <HowWeWork
        heading={tx(locale, "Compra sin sorpresas", "Buy without surprises")}
        intro={tx(locale, "Así trabajamos contigo, de la primera visita a las llaves.", "How we work with you, from the first viewing to the keys.")}
        steps={chapters}
        photoAlt={tx(locale, "Imagen ilustrativa", "Illustrative image")}
      />

      {/* COMPRA A DISTANCIA — the diaspora's routes draw in to Lechería as the steps light up. */}
      <div>
        <RemoteRoute
          eyebrow={tx(locale, "Si vives fuera", "If you live abroad")}
          title={tx(locale, "Compra desde donde vivas", "Buy from wherever you live")}
          subtitle={tx(locale, "Visita en video, firma con poder y paga en dólares de forma segura.", "View by video, sign by power of attorney and pay in dollars, safely.")}
          steps={steps as [string, string][]}
        >
          <Button href={`/${locale}/search?type=SALE`} variant="outline" className="mt-6 md:mt-8">
            {tx(locale, "Ver casas disponibles", "See available homes")}
          </Button>
        </RemoteRoute>
      </div>

      {/* THE PROMISE — a solid Taupe block with light text (AMALI's quote blocks). */}
      <section className="bg-[#6B5D52] text-[#F6F2EC]" aria-label={tx(locale, "Nuestra promesa", "Our promise")}>
        <div className="mx-auto max-w-[1100px] px-6 py-14 text-center md:px-10 md:py-20">
          <p className="font-display text-[12px] font-medium uppercase tracking-[.22em] text-[#F6F2EC]/80">New Place</p>
          <blockquote className="mx-auto mt-5 max-w-[820px] font-title text-[24px] font-light leading-[1.25] tracking-[.01em] md:text-[34px]">
            {tx(
              locale,
              "Pocas casas, bien elegidas. Sabemos lo que valen y te acompañamos hasta las llaves.",
              "A few homes, well chosen. We know what they're worth and we stay with you until the keys.",
            )}
          </blockquote>
          <span aria-hidden className="mx-auto mt-8 block h-px w-24 bg-[#F6F2EC]/50" />
          <p className="mt-6 font-display text-[13px] font-light tracking-[.14em] text-[#F6F2EC]/85">{tx(locale, "Un asesor te atiende a cualquier hora", "An advisor answers at any hour")}</p>
        </div>
      </section>

      {/* VENDA EN PRIVADO */}
      <section className="relative overflow-hidden bg-ivory">
        <div className="relative mx-auto grid max-w-[1320px] items-center gap-6 px-5 pt-14 md:gap-10 md:px-10 md:pt-16 lg:grid-cols-2 lg:gap-16 lg:pt-16">
          <div data-reveal className="pb-0 md:pb-4 lg:pb-12">
            <p className="np-kicker text-gold-text">{tx(locale, "Si vas a vender", "If you\u2019re selling")}</p>
            <h2 className="mt-3 text-[30px] md:text-[48px]">{tx(locale, "Vende tu casa al precio justo", "Sell your home at a fair price")}</h2>
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
              <Image src={salonMar} alt={tx(locale, "Imagen ilustrativa", "Illustrative image")} fill placeholder="blur" sizes="(max-width: 1024px) 90vw, 560px" className="object-cover" />
            </div>
          </div>
        </div>
      </section>
    </PublicPage>
  );
}

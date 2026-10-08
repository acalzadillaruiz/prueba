import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
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
import { RoofGlyph } from "@/components/brand/Logo";
import { Button } from "@/components/ui";
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

/** The search tab where a zone's listings live (Lechería today is vacation rentals only, for example). */
function zoneLink(locale: Locale, zone: string, all: Listing[]) {
  const counts = new Map<string, number>();
  for (const l of all) if (l.zone === zone) {
    const t = l.listingType.startsWith("COMMERCIAL") ? "COMMERCIAL" : l.listingType;
    counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  const type = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "SALE";
  return `/${locale}/search?type=${type}&zone=${encodeURIComponent(zone)}`;
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
  const zones = await Promise.all(FEATURED_ZONES.map(async (z) => ({ ...z, stats: await zoneStats(z.zone), href: zoneLink(locale, z.zone, available) })));

  const chapters = [
    { eyebrow: tx(locale, "01 · Antes de firmar", "01 · Before you sign"), title: tx(locale, "Papeles en regla, sin sorpresas.", "Paperwork in order, no surprises."), body: tx(locale, "Nuestro equipo legal revisa títulos, solvencias y gravámenes antes de que pongas un dólar. Si algo no cuadra, te lo decimos primero.", "Our legal team checks titles, tax clearances and liens before you put down a dollar. If something doesn't add up, you hear it from us first.") },
    { eyebrow: tx(locale, "02 · El precio justo", "02 · A fair price"), title: tx(locale, "Sabes lo que vale. De verdad.", "You'll know what it's worth. Really."), body: tx(locale, "Cada casa trae su valoración PlaceEstimate, hecha con ventas reales de la zona. Nada de precios inflados.", "Every home comes with a PlaceEstimate valuation built from real sales nearby. No inflated prices.") },
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
  const featured = ranked[0] && { href: listingHref(locale, ranked[0]), title: tx(locale, ranked[0].title_es, ranked[0].title_en), zone: ranked[0].zone, price: price(ranked[0]), photo: listingPhoto(ranked[0], 0) };

  return (
    <PublicPage locale={locale} header="transparent" tabbar contact={{ href: `/${locale}/luxury#acceso`, label: tx(locale, "Hablar con una persona", "Talk to a person") }}>
      <HomeMotion />
      {/* HERO — light, editorial, with the conversational search. */}
      <HeroAura locale={locale} available={available.length} featured={featured || undefined} />

      {/* ZONES — they glide by, endlessly. */}
      <div className="relative overflow-hidden border-y border-ink/[.07] bg-ivory py-6" aria-label={tx(locale, "Dónde estamos", "Where we are")}>
        <div className="np-marquee gap-12 pr-12">
          {[...marquee, ...marquee].map((z, i) => (
            <span key={i} aria-hidden={i >= marquee.length || undefined} className="flex shrink-0 items-center gap-12 font-serif text-[30px] text-ink/80 md:text-[40px]">
              {z}
              <span className="h-1.5 w-1.5 rounded-full bg-gold" aria-hidden />
            </span>
          ))}
        </div>
      </div>

      {/* THE BUILDING — 3D, rises floor by floor; the lit floors are the featured residences. */}
      <BuildingScroll chapters={chapters} picks={floors} heading={tx(locale, "Así trabajamos", "How we work")} cta={tx(locale, "Entrar", "Step inside")} />

      {/* COLECCIÓN PRIVADA — horizontal gallery */}
      <CollectionRail
        eyebrow={tx(locale, "Colección Privada", "Private Collection")}
        title={tx(locale, "Las que no se olvidan.", "The ones you don't forget.")}
        items={rail}
        more={{ href: `/${locale}/luxury`, label: tx(locale, "Ver toda la colección", "See the whole collection") }}
      />

      {/* EXPLORE EN EL MAPA */}
      <section id="explorar" className="mx-auto max-w-[1320px] px-4 pt-24 md:px-8 lg:pt-32">
        <div data-reveal className="mb-8 grid items-end gap-4 md:grid-cols-[1fr_auto] lg:mb-10">
          <div><p className="np-kicker text-gold-text">{tx(locale, "El mapa", "The map")}</p><h2 className="mt-3 text-[36px] leading-[1.05] tracking-[-0.02em] md:text-[52px]">{tx(locale, "Elige primero el lugar.", "Choose the place first.")}</h2></div>
          <p className="max-w-[380px] text-[15px] leading-relaxed text-muted md:text-right">
            {tx(locale, "Lo que cuesta el metro cuadrado en cada zona, con casas reales. Dibuja la tuya y te avisamos cuando aparezca algo.", "What a square metre costs in each area, from real homes. Draw yours and we\u2019ll tell you when something turns up.")}
          </p>
        </div>
        <div className="grid gap-6 lg:grid-cols-[1.55fr_1fr]">
          <HomeMap listings={pins} locale={locale} focus={{ lat: 10.62, lng: -65.45 }} initialScale={2.9} />
          <ul data-reveal="stagger" className="flex flex-col gap-3">
            {zones.map((z) => (
              <li key={z.zone}>
                <Link href={z.href} data-spotlight className="np-glass group flex h-full min-h-[104px] items-stretch overflow-hidden rounded-[24px] transition-transform duration-500 hover:-translate-y-0.5">
                  <span className="relative m-2 w-[76px] shrink-0 overflow-hidden rounded-[18px] sm:w-[100px]">
                    <Image src={z.photo} alt="" fill sizes="112px" className="object-cover transition-transform duration-700 group-hover:scale-105" />
                  </span>
                  <span className="flex min-w-0 flex-1 items-center justify-between gap-3 px-4 py-4 sm:px-5">
                    <span className="min-w-0">
                      <span className="block font-serif text-[22px] leading-tight sm:text-[25px]">{z.zone}</span>
                      <span className="block text-sm text-muted">
                        {z.stats.activeListings > 0 ? plural(z.stats.activeListings, locale, ["propiedad", "propiedades"], ["property", "properties"]) : tx(locale, "Próximamente", "Coming soon")}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block font-display text-[15px] font-semibold text-ink">{money(z.stats.salePpm, locale)}</span>
                      <span className="block text-sm text-muted">{tx(locale, "por m²", "per m²")}</span>
                    </span>
                  </span>
                </Link>
              </li>
            ))}
            <li className="pt-1">
              <Button href={`/${locale}/search?type=SALE`} variant="outline" className="w-full">
                {tx(locale, "Abrir el mapa", "Open the map")} <ArrowRight size={16} aria-hidden />
              </Button>
            </li>
          </ul>
        </div>
      </section>

      {/* COMPRA A DISTANCIA — the diaspora's routes draw in to Lechería as the steps light up. */}
      <div className="pt-20 lg:pt-28">
        <RemoteRoute
          eyebrow={tx(locale, "Si vives fuera", "If you live abroad")}
          title={tx(locale, "Tu casa en Venezuela, sin subirte a un avión.", "Your home in Venezuela, without boarding a plane.")}
          steps={steps as [string, string][]}
        >
          <Button href={`/${locale}/search?type=SALE`} variant="outline" className="mt-8">
            {tx(locale, "Ver casas disponibles", "See available homes")}
          </Button>
        </RemoteRoute>
      </div>

      {/* VENDA EN PRIVADO */}
      <section className="np-grain relative mx-3 mt-24 overflow-hidden rounded-[40px] bg-[#E9E0D3] md:mx-6 lg:mt-32">
        <div className="relative mx-auto grid max-w-[1320px] items-center gap-10 px-5 pt-16 md:px-10 lg:grid-cols-2 lg:gap-16 lg:pt-12">
          <div data-reveal className="pb-4 lg:pb-12">
            <p className="np-kicker text-gold-text">{tx(locale, "Si vas a vender", "If you\u2019re selling")}</p>
            <h2 className="mt-3 text-[38px] leading-[1.05] md:text-[52px]">
              {tx(locale, "Tu casa merece", "Your home deserves")}
              <br />
              <span className="text-ink/45">{tx(locale, "que la cuenten bien.", "to be told well.")}</span>
            </h2>
            <ul className="mt-7 space-y-3">
              {owner.map((o) => (
                <li key={o} className="flex items-center gap-3 text-[15px] text-ink/80">
                  <RoofGlyph className="text-ink" /> {o}
                </li>
              ))}
            </ul>
            <span data-magnetic className="mt-9 inline-block">
              <Button href={`/${locale}/owner/new`} variant="navy" size="lg">
                {tx(locale, "¿Cuánto vale mi casa?", "What\u2019s my home worth?")} <ArrowUpRight size={18} aria-hidden />
              </Button>
            </span>
          </div>
          <div data-unveil className="relative mx-auto mb-6 aspect-[5/6] w-full max-w-[520px] overflow-hidden rounded-[32px] bg-[#D9CDB8] lg:mb-12 lg:mr-0">
            <div data-parallax="40" className="absolute -inset-y-[8%] inset-x-0">
              <Image src="/brand/oficina.jpg" alt={tx(locale, "Despacho con ventanal en arco", "Study with an arched window")} fill sizes="(max-width: 1024px) 90vw, 520px" className="object-cover" />
            </div>
          </div>
        </div>
      </section>
    </PublicPage>
  );
}

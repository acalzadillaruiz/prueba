import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Listing, Locale } from "@/types/domain";
import { PublicPage } from "@/components/layout/PublicPage";
import { HeroSearch } from "@/components/search/HeroSearch";
import { HomeMap } from "@/components/search/HomeMap";
import { mapListing } from "@/components/map/mapListing";
import { factsLine } from "@/components/listing/ListingCard";
import { HomeMotion } from "@/components/home/HomeMotion";
import { HeroCinema } from "@/components/home/HeroCinema";
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
    { eyebrow: tx(locale, "01 · Cimientos", "01 · Foundations"), title: tx(locale, "Cimientos legales sólidos.", "Solid legal foundations."), body: tx(locale, "Asesoría legal y notarial: títulos, solvencias y cargas revisados antes de firmar.", "Legal and notarial advice: titles, tax clearances and liens checked before you sign.") },
    { eyebrow: tx(locale, "02 · Planta a planta", "02 · Floor by floor"), title: tx(locale, "Cada propiedad, verificada.", "Every property, verified."), body: tx(locale, "Valoración PlaceEstimate con comparables reales y fotografía profesional de cada planta.", "PlaceEstimate valuation with real comparables and professional photography of every floor.") },
    { eyebrow: tx(locale, "03 · Nuestra firma", "03 · Our signature"), title: tx(locale, "Coronada por New Place.", "Crowned by New Place."), body: tx(locale, "Visitas privadas en la agenda real de su asesor, en persona o por videollamada.", "Private viewings on your advisor’s real calendar, in person or by video call.") },
    { eyebrow: tx(locale, "04 · Su planta", "04 · Your floor"), title: tx(locale, "Su residencia le espera.", "Your residence awaits."), body: tx(locale, "Las plantas iluminadas son residencias disponibles hoy. Pulse una para verla.", "The lit floors are residences available today. Tap one to see it.") },
  ];
  const steps = [
    [tx(locale, "Videovisita privada", "Private video tour"), tx(locale, "Recorremos la propiedad en directo con usted.", "We walk you through the property live.")],
    [tx(locale, "Revisión legal completa", "Full legal review"), tx(locale, "Títulos, solvencias y cargas verificados antes de firmar.", "Titles, tax clearances and liens checked before signing.")],
    [tx(locale, "Firma con poder notarial", "Signing by power of attorney"), tx(locale, "Le representamos ante el registro.", "We represent you at the registry.")],
    [tx(locale, "Pago seguro en USD", "Secure payment in USD"), tx(locale, "Con comprobante en cada paso.", "With a receipt at every step.")],
    [tx(locale, "Entrega de llaves", "Handover of keys"), tx(locale, "Y, si lo desea, gestión de alquiler vacacional.", "And, if you wish, vacation-rental management.")],
  ];
  const owner = [
    tx(locale, "Valoración PlaceEstimate con comparables reales", "PlaceEstimate valuation with real comparables"),
    tx(locale, "Fotografía profesional y difusión selecta", "Professional photography and selective exposure"),
    tx(locale, "Visitas agendadas con compradores interesados", "Viewings booked with genuinely interested buyers"),
  ];

  return (
    <PublicPage locale={locale} header="transparent" tabbar contact={{ href: `/${locale}/luxury#acceso`, label: tx(locale, "Hablar con un asesor", "Talk to an advisor") }}>
      <HomeMotion />
      {/* HERO — a cinematic walk through the arch to the sea, driven by the scroll. */}
      <HeroCinema
        eyebrow={tx(locale, "El Caribe, con alma mediterránea", "The Caribbean, with a Mediterranean soul")}
        title={tx(locale, "Pocas propiedades.", "Few properties.")}
        titleEm={tx(locale, "Todas extraordinarias.", "All extraordinary.")}
        lede={tx(
          locale,
          "Residencias seleccionadas en Lechería, El Morro, Margarita y Caracas, valoradas con datos reales y presentadas en privado por asesores verificados.",
          "Selected residences in Lechería, El Morro, Margarita and Caracas, valued with real data and presented privately by verified advisors.",
        )}
        search={<HeroSearch locale={locale} />}
        arrival={tx(locale, "Bienvenido a casa.", "Welcome home.")}
        arrivalSub="Lechería · El Morro · Margarita · Caracas"
        scrollHint={tx(locale, "Deslice", "Scroll")}
      />

      {/* THE BUILDING — 3D, rises floor by floor; the lit floors are the featured residences. */}
      <BuildingScroll chapters={chapters} picks={floors} heading={tx(locale, "Cómo trabajamos", "How we work")} cta={tx(locale, "Ver", "View")} />

      {/* COLECCIÓN PRIVADA — horizontal gallery */}
      <CollectionRail
        eyebrow={tx(locale, "Selección exclusiva", "Exclusive selection")}
        title={tx(locale, "Colección Privada", "Private Collection")}
        items={rail}
        more={{ href: `/${locale}/luxury`, label: tx(locale, "Ver la colección", "View the collection") }}
      />

      {/* EXPLORE EN EL MAPA */}
      <section id="explorar" className="mx-auto max-w-[1320px] px-4 pt-20 md:px-8 lg:pt-28">
        <div data-reveal className="mb-8 grid items-end gap-4 md:grid-cols-[1fr_auto] lg:mb-10">
          <h2 className="text-[36px] leading-tight md:text-[48px]">{tx(locale, "Explore en el mapa", "Explore on the map")}</h2>
          <p className="max-w-[380px] text-[15px] leading-relaxed text-muted md:text-right">
            {tx(locale, "Precio por m² calculado con las propiedades publicadas en cada zona. Dibuje su zona ideal y reciba avisos.", "Price per m² computed from the properties listed in each area. Draw your ideal area and get alerts.")}
          </p>
        </div>
        <div className="grid gap-6 lg:grid-cols-[1.55fr_1fr]">
          <HomeMap listings={pins} locale={locale} focus={{ lat: 10.62, lng: -65.45 }} initialScale={2.9} />
          <ul data-reveal="stagger" className="flex flex-col gap-3">
            {zones.map((z) => (
              <li key={z.zone}>
                <Link href={z.href} className="group flex h-full min-h-[104px] items-stretch overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(22,38,56,.05),0_8px_24px_rgba(22,38,56,.06)] transition-shadow duration-np hover:shadow-[0_16px_36px_rgba(22,38,56,.12)]">
                  <span className="relative w-[84px] shrink-0 overflow-hidden sm:w-[112px]">
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
                {tx(locale, "Abrir el mapa completo", "Open the full map")} <ArrowRight size={16} aria-hidden />
              </Button>
            </li>
          </ul>
        </div>
      </section>

      {/* COMPRA A DISTANCIA — the diaspora's routes draw in to Lechería as the steps light up. */}
      <div className="pt-20 lg:pt-28">
        <RemoteRoute
          eyebrow={tx(locale, "Para venezolanos en el exterior", "For Venezuelans abroad")}
          title={tx(locale, "Compre en Lechería sin moverse de Madrid, Miami o Panamá.", "Buy in Lechería without leaving Madrid, Miami or Panama.")}
          steps={steps as [string, string][]}
        >
          <Button href={`/${locale}/search?type=SALE`} variant="outline" className="mt-8">
            {tx(locale, "Ver propiedades disponibles", "See available properties")}
          </Button>
        </RemoteRoute>
      </div>

      {/* VENDA EN PRIVADO */}
      <section className="mt-24 bg-arena lg:mt-32">
        <div className="mx-auto grid max-w-[1320px] items-end gap-10 px-4 pt-16 md:px-8 lg:grid-cols-2 lg:gap-16 lg:pt-20">
          <div data-reveal className="pb-4 lg:pb-24">
            <p className="np-eyebrow text-gold-text">{tx(locale, "Propietarios", "Owners")}</p>
            <h2 className="mt-3 text-[38px] leading-[1.05] md:text-[52px]">
              {tx(locale, "Venda en privado.", "Sell privately.")}
              <br />
              {tx(locale, "Compre con certeza.", "Buy with certainty.")}
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
                {tx(locale, "Valorar mi propiedad", "Value my property")}
              </Button>
            </span>
          </div>
          <div className="np-arch relative mx-auto aspect-[5/6] w-full max-w-[520px] bg-[#D9CDB8] lg:mr-0">
            <div data-parallax="40" className="absolute -inset-y-[8%] inset-x-0">
              <Image src="/brand/oficina.jpg" alt={tx(locale, "Despacho con ventanal en arco", "Study with an arched window")} fill sizes="(max-width: 1024px) 90vw, 520px" className="object-cover" />
            </div>
          </div>
        </div>
      </section>
    </PublicPage>
  );
}

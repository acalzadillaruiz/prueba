import Image from "next/image";
import { ArrowRight, ArrowUpRight, Check } from "lucide-react";
import type { Listing, Locale } from "@/types/domain";
import { PublicPage } from "@/components/layout/PublicPage";
import { HomeZoneMap } from "@/components/search/HomeZoneMap";
import { mapListing } from "@/components/map/mapListing";
import { factsLine } from "@/components/listing/ListingCard";
import { HeroAura } from "@/components/home/HeroAura";
import { HowWeWork } from "@/components/home/HowWeWork";
import { PhotoBand } from "@/components/home/PhotoBand";
import { PHOTOS } from "@/lib/media";
import { CollectionRail } from "@/components/home/CollectionRail";
import { RemoteRoute } from "@/components/home/RemoteRoute";
import { listingHref } from "@/lib/listing-href";
import { listingPhoto } from "@/lib/photos";
import { Button } from "@/components/ui";
import { publicListings } from "@/server/listings";
import { money, priceSuffix, tx } from "@/lib/i18n";

// Static and cached (ISR): no session is read on public pages; data refreshes every 60 s and on listing changes.
export const revalidate = 60;

const AVAILABLE = ["ACTIVE", "COMING_SOON", "UNDER_OFFER"];

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
    badge: l.luxury ? tx(locale, "Exclusiva", "Exclusive") : undefined,
  }));
  const pins = available.map(mapListing);

  // "Así trabajamos": what the buyer gets, then how (035: short, concrete, at most two lines on a phone).
  const chapters = [
    { title: tx(locale, "Papeles en regla, sin sorpresas", "Paperwork in order, no surprises"), body: tx(locale, "Revisamos títulos, deudas y gravámenes antes de que pagues nada.", "We check titles, debts and liens before you pay anything.") },
    { title: tx(locale, "Sabes lo que vale", "You know what it's worth"), body: tx(locale, "Cada casa trae su precio verificado con ventas reales de la zona.", "Every home comes with a price checked against real sales nearby.") },
    { title: tx(locale, "Visitas cuando te venga bien", "Viewings when it suits you"), body: tx(locale, "En persona o por video, con el mismo asesor y su agenda real.", "In person or by video, with the same advisor and their real calendar.") },
    { title: tx(locale, "Te acompañamos hasta el final", "With you to the end"), body: tx(locale, "Firmas, pagas y recibes tu casa con un asesor a tu lado.", "You sign, pay and get your keys with an advisor beside you.") },
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
      {/* HERO — cinema, full screen: the coast at sunset with the search on it. */}
      <HeroAura locale={locale} available={available.length} />

      {/* EXPLORE EN EL MAPA */}
      <section id="explorar" className="np-gutter mx-auto max-w-[1280px] box-content py-[var(--np-section)]">
        <div data-reveal className="mb-10 grid items-end gap-6 md:grid-cols-[1fr_auto] md:gap-8 lg:mb-12">
          <div><h2 className="np-t-band">{tx(locale, "Busca por zona", "Search by area")}</h2></div>
          <p className="np-t-body max-w-[380px] text-ink md:text-right">
            {tx(locale, "Explora las casas sobre el mapa. Precios en dólares.", "Explore the homes on the map. Prices in US dollars.")}
          </p>
        </div>
        <HomeZoneMap listings={pins} locale={locale} />
        <div className="mt-8">
          <Button href={`/${locale}/search?type=SALE`} variant="outline">
            {tx(locale, "Abrir el buscador con mapa", "Open the map search")} <ArrowRight size={16} aria-hidden />
          </Button>
        </div>
      </section>

      {/* 043-C · night band, full-bleed photo: «Entre el Ávila y el mar», one idea on it. */}
      <PhotoBand
        id="entre-el-avila-y-el-mar"
        photo={PHOTOS.torreAtardecer}
        locale={locale}
        title={tx(locale, "Pocas casas, bien elegidas.", "A few homes, well chosen.")}
        body={tx(locale, "Sabemos lo que valen y te acompañamos hasta las llaves. Un asesor te atiende a cualquier hora.", "We know what they're worth and we stay with you until the keys. An advisor answers at any hour.")}
      >
        <Button href={`/${locale}/search?type=SALE`} size="lg">
          {tx(locale, "Ver casas", "See homes")}
        </Button>
      </PhotoBand>

      {/* ZONES (043): a still line of places, no endless marquee. */}
      <div className="np-gutter bg-arena pt-[var(--np-section)]">
        <ul aria-label={tx(locale, "Dónde estamos", "Where we are")} data-reveal className="mx-auto flex max-w-[1280px] flex-wrap gap-x-6 gap-y-1 font-title text-[28px] font-light text-ink md:gap-x-10 md:text-[40px]">
          {marquee.map((z) => (
            <li key={z}>{z}</li>
          ))}
        </ul>
      </div>

      {/* HOW WE WORK — a realistic photo and four short steps (035: no 3D). */}
      <HowWeWork
        heading={tx(locale, "Compra sin sorpresas", "Buy without surprises")}
        intro={tx(locale, "Así trabajamos contigo, de la primera visita a las llaves.", "How we work with you, from the first viewing to the keys.")}
        steps={chapters}
        photoAlt={tx(locale, PHOTOS.torreMarina.alt.es, PHOTOS.torreMarina.alt.en)}
      />

      {/* COLECCIÓN PRIVADA — real homes right after the hero: horizontal gallery */}
      <CollectionRail
        title={tx(locale, "Colección privada", "Private collection")}
        lead={tx(locale, "Casas fuera de mercado que vemos en persona y enseñamos solo con cita.", "Off-market homes we see in person and show by appointment only.")}
        photo={PHOTOS.salonMar}
        photoAlt={tx(locale, PHOTOS.salonMar.alt.es, PHOTOS.salonMar.alt.en)}
        items={rail}
        more={{ href: `/${locale}/luxury`, label: tx(locale, "Ver toda la colección", "See the whole collection") }}
        labels={{ prev: tx(locale, "Casa anterior", "Previous home"), next: tx(locale, "Casa siguiente", "Next home"), hint: tx(locale, "Desliza", "Swipe") }}
      />

      {/* COMPRA A DISTANCIA — the diaspora's routes draw in to Lechería as the steps light up. */}
      <RemoteRoute
          title={tx(locale, "Compra desde donde vivas", "Buy from wherever you live")}
          subtitle={tx(locale, "Visita en video, firma con poder y paga en dólares de forma segura.", "View by video, sign by power of attorney and pay in dollars, safely.")}
          steps={steps as [string, string][]}
        >
          <Button href={`/${locale}/search?type=SALE`} variant="outline" className="mt-6 md:mt-8">
            {tx(locale, "Ver casas disponibles", "See available homes")}
          </Button>
        </RemoteRoute>

      {/* VENDA EN PRIVADO */}
      <section className="np-band relative overflow-hidden bg-ivory">
        <div className="np-gutter relative mx-auto grid max-w-[1280px] box-content items-center gap-10 py-[var(--np-section)] lg:grid-cols-2 lg:gap-16">
          <div data-reveal="stagger">
            <h2 className="np-t-band">{tx(locale, "Vende tu casa al precio justo", "Sell your home at a fair price")}</h2>
            <ul className="mt-7 space-y-3">
              {owner.map((o) => (
                <li key={o} className="flex items-center gap-3 text-[17px] text-ink">
                  <Check size={16} strokeWidth={2.4} className="shrink-0 text-gold-text" aria-hidden /> {o}
                </li>
              ))}
            </ul>
            <span className="mt-10 inline-block">
              <Button href={`/${locale}/sell`} variant="navy" size="lg">
                {tx(locale, "¿Cuánto vale mi casa?", "What\u2019s my home worth?")} <ArrowUpRight size={18} aria-hidden />
              </Button>
            </span>
          </div>
          {/* Portrait only beside the copy (lg); stacked below it (phones, tablets) a landscape band. */}
          <div data-reveal className="relative aspect-[16/10] w-full overflow-hidden bg-[#EFE6D8] lg:aspect-[4/3]">
            <div className="absolute inset-0">
              <Image src={PHOTOS.costaAtardecer.src} alt={tx(locale, PHOTOS.costaAtardecer.alt.es, PHOTOS.costaAtardecer.alt.en)} fill sizes="(max-width: 1024px) 90vw, 560px" className="object-cover" style={{ objectPosition: PHOTOS.costaAtardecer.focus }} />
            </div>
          </div>
        </div>
      </section>
    </PublicPage>
  );
}

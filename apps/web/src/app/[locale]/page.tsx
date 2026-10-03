import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Listing, Locale } from "@/types/domain";
import { PublicPage } from "@/components/layout/PublicPage";
import { HeroSearch } from "@/components/search/HeroSearch";
import { HomeMap } from "@/components/search/HomeMap";
import { mapListing } from "@/components/map/mapListing";
import { ListingCard } from "@/components/listing/ListingCard";
import { RoofGlyph } from "@/components/brand/Logo";
import { Button } from "@/components/ui";
import { publicListings } from "@/server/listings";
import { zoneStats } from "@/server/zone-stats";
import { money, plural, tx } from "@/lib/i18n";

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
  // "Pocas propiedades": three, the exclusive (luxury) ones first, then the newest.
  const picks = [...available.filter((l) => l.luxury), ...available.filter((l) => !l.luxury)].slice(0, 3);
  const pins = available.map(mapListing);
  const zones = await Promise.all(FEATURED_ZONES.map(async (z) => ({ ...z, stats: await zoneStats(z.zone), href: zoneLink(locale, z.zone, available) })));

  const trust = [
    [tx(locale, "Asesoría legal y notarial", "Legal and notarial advice"), tx(locale, "Documentos revisados antes de firmar", "Documents reviewed before you sign")],
    [tx(locale, "Compra a distancia", "Buy from abroad"), tx(locale, "Videovisita, poder notarial y pago en USD", "Video tour, power of attorney, USD payment")],
    [tx(locale, "Visitas privadas", "Private viewings"), tx(locale, "Agendadas en la agenda real de su asesor", "Booked on your advisor’s real calendar")],
    [tx(locale, "Valoración PlaceEstimate", "PlaceEstimate valuation"), tx(locale, "Precio justo con comparables reales", "Fair price from real comparables")],
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
      {/* HERO — the arch opening to the sea, navy veil, the screen's only terracotta action ("Buscar"). */}
      <section className="relative isolate overflow-hidden bg-navy text-ivory">
        <Image src="/brand/hero-arco.jpg" alt="" fill priority sizes="100vw" quality={80} className="-z-10 object-cover object-[50%_38%]" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(22,38,56,.72)_0%,rgba(22,38,56,.28)_34%,rgba(22,38,56,.45)_62%,rgba(22,38,56,.92)_100%)]" aria-hidden />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(22,38,56,.55)_0%,rgba(22,38,56,0)_60%)]" aria-hidden />
        <div className="mx-auto flex min-h-[640px] max-w-[1320px] flex-col justify-end px-4 pb-10 pt-[132px] md:px-8 lg:min-h-[min(860px,100svh)] lg:pb-16">
          <p className="np-eyebrow text-[12px] tracking-[0.2em] text-ivory/90">{tx(locale, "El Caribe, con alma mediterránea", "The Caribbean, with a Mediterranean soul")}</p>
          <h1 className="np-hero-title mt-4 max-w-[820px] text-[38px] leading-[1.04] text-ivory sm:text-[60px] lg:text-[80px]">
            {tx(locale, "Pocas propiedades.", "Few properties.")}
            <br />
            <em>{tx(locale, "Todas extraordinarias.", "All extraordinary.")}</em>
          </h1>
          <p className="mt-5 max-w-[580px] text-[17px] leading-relaxed text-ivory/85">
            {tx(
              locale,
              "Residencias seleccionadas en Lechería, El Morro, Margarita y Caracas, valoradas con datos reales y presentadas en privado por asesores verificados.",
              "Selected residences in Lechería, El Morro, Margarita and Caracas, valued with real data and presented privately by verified advisors.",
            )}
          </p>
          <div className="mt-8">
            <HeroSearch locale={locale} />
          </div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section aria-label={tx(locale, "Cómo trabajamos", "How we work")} className="np-navy-panel bg-navy text-ivory">
        <ul className="mx-auto grid max-w-[1320px] grid-cols-2 md:px-8 lg:grid-cols-4">
          {trust.map(([title, body], i) => (
            <li key={title} className={"border-[#B4935A]/25 px-4 py-6 md:px-6 lg:py-7 " + (i % 2 ? "border-l " : "") + (i > 1 ? "border-t lg:border-t-0 " : "") + (i === 2 ? "lg:border-l" : "")}>
              <div className="font-serif text-[19px] leading-tight md:text-[23px]">{title}</div>
              <div className="mt-1 text-sm text-ivory/65">{body}</div>
            </li>
          ))}
        </ul>
      </section>

      {/* SELECCIÓN EXCLUSIVA — real listings */}
      <section className="mx-auto max-w-[1320px] px-4 pt-20 md:px-8 lg:pt-28">
        <div className="mb-8 flex items-end justify-between gap-4 lg:mb-10">
          <h2 className="text-[36px] leading-tight md:text-[48px]">{tx(locale, "Selección exclusiva", "Exclusive selection")}</h2>
          <Link href={`/${locale}/luxury`} className="inline-flex min-h-11 shrink-0 items-center font-display text-[15px] font-semibold text-ink underline decoration-[1.5px] underline-offset-[6px] hover:decoration-[#B4935A]">
            {tx(locale, "Ver la colección", "View the collection")}
          </Link>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-7">
          {picks.map((l) => (
            <ListingCard key={l.id} l={l} locale={locale} />
          ))}
        </div>
      </section>

      {/* EXPLORE EN EL MAPA */}
      <section id="explorar" className="mx-auto max-w-[1320px] px-4 pt-20 md:px-8 lg:pt-28">
        <div className="mb-8 grid items-end gap-4 md:grid-cols-[1fr_auto] lg:mb-10">
          <h2 className="text-[36px] leading-tight md:text-[48px]">{tx(locale, "Explore en el mapa", "Explore on the map")}</h2>
          <p className="max-w-[380px] text-[15px] leading-relaxed text-ink/65 md:text-right">
            {tx(locale, "Precio por m² calculado con las propiedades publicadas en cada zona. Dibuje su zona ideal y reciba avisos.", "Price per m² computed from the properties listed in each area. Draw your ideal area and get alerts.")}
          </p>
        </div>
        <div className="grid gap-6 lg:grid-cols-[1.55fr_1fr]">
          <HomeMap listings={pins} locale={locale} focus={{ lat: 10.62, lng: -65.45 }} initialScale={2.9} />
          <ul className="flex flex-col gap-3">
            {zones.map((z) => (
              <li key={z.zone}>
                <Link href={z.href} className="group flex h-full min-h-[104px] items-stretch overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(22,38,56,.05),0_8px_24px_rgba(22,38,56,.06)] transition-shadow duration-np hover:shadow-[0_16px_36px_rgba(22,38,56,.12)]">
                  <span className="relative w-[84px] shrink-0 overflow-hidden sm:w-[112px]">
                    <Image src={z.photo} alt="" fill sizes="112px" className="object-cover transition-transform duration-700 group-hover:scale-105" />
                  </span>
                  <span className="flex min-w-0 flex-1 items-center justify-between gap-3 px-4 py-4 sm:px-5">
                    <span className="min-w-0">
                      <span className="block font-serif text-[22px] leading-tight sm:text-[25px]">{z.zone}</span>
                      <span className="block text-sm text-ink/60">
                        {z.stats.activeListings > 0 ? plural(z.stats.activeListings, locale, ["propiedad", "propiedades"], ["property", "properties"]) : tx(locale, "Próximamente", "Coming soon")}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block font-display text-[15px] font-semibold text-ink">{money(z.stats.salePpm, locale)}</span>
                      <span className="block text-sm text-ink/55">{tx(locale, "por m²", "per m²")}</span>
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

      {/* COMPRA A DISTANCIA */}
      <section id="compra-a-distancia" className="mx-auto grid max-w-[1320px] scroll-mt-24 items-center gap-10 px-4 pt-20 md:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20 lg:pt-32">
        <div className="np-arch relative mx-auto aspect-[4/5] w-full max-w-[460px] bg-arena">
          <Image src="/brand/arco.jpg" alt={tx(locale, "Portal en arco de una residencia mediterránea", "Arched doorway of a Mediterranean residence")} fill sizes="(max-width: 1024px) 90vw, 460px" className="object-cover" />
        </div>
        <div>
          <p className="np-eyebrow text-gold-text">{tx(locale, "Para venezolanos en el exterior", "For Venezuelans abroad")}</p>
          <h2 className="mt-3 max-w-[640px] text-[34px] leading-[1.08] md:text-[46px]">
            {tx(locale, "Compre en Lechería sin moverse de Madrid, Miami o Panamá.", "Buy in Lechería without leaving Madrid, Miami or Panama.")}
          </h2>
          <ol className="mt-8">
            {steps.map(([title, body], i) => (
              <li key={title} className="flex gap-6 border-b border-line py-4">
                <span className="w-6 shrink-0 font-serif text-[28px] leading-none text-gold-text">{i + 1}</span>
                <span>
                  <span className="block text-[15px] font-semibold text-ink">{title}</span>
                  <span className="block text-sm text-ink/65">{body}</span>
                </span>
              </li>
            ))}
          </ol>
          <Button href={`/${locale}/search?type=SALE`} variant="outline" className="mt-8">
            {tx(locale, "Ver propiedades disponibles", "See available properties")}
          </Button>
        </div>
      </section>

      {/* VENDA EN PRIVADO */}
      <section className="mt-24 bg-arena lg:mt-32">
        <div className="mx-auto grid max-w-[1320px] items-end gap-10 px-4 pt-16 md:px-8 lg:grid-cols-2 lg:gap-16 lg:pt-20">
          <div className="pb-4 lg:pb-24">
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
            <Button href={`/${locale}/owner/new`} variant="navy" size="lg" className="mt-9">
              {tx(locale, "Valorar mi propiedad", "Value my property")}
            </Button>
          </div>
          <div className="np-arch relative mx-auto aspect-[5/6] w-full max-w-[520px] bg-[#D9CDB8] lg:mr-0">
            <Image src="/brand/oficina.jpg" alt={tx(locale, "Despacho con ventanal en arco", "Study with an arched window")} fill sizes="(max-width: 1024px) 90vw, 520px" className="object-cover" />
          </div>
        </div>
      </section>
    </PublicPage>
  );
}

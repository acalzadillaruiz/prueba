import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Droplets, Mountain, Waves, Zap, Anchor, Container } from "lucide-react";
import type { Listing, Locale } from "@/types/domain";
import { PublicPage } from "@/components/layout/PublicPage";
import { HomeMap } from "@/components/search/HomeMap";
import { mapListing } from "@/components/map/mapListing";
import { ListingCard } from "@/components/listing/ListingCard";
import { HomeMotion } from "@/components/home/HomeMotion";
import { HeroAura } from "@/components/home/HeroAura";
import { GuardiaClock } from "@/components/home/GuardiaClock";
import type { Hotspot } from "@/components/home/Building4D";
import { OnCallButton } from "@/components/brand/PublicChrome";
import { listingHref } from "@/lib/listing-href";
import { listingPhoto } from "@/lib/photos";
import { Button } from "@/components/ui";
import { cn } from "@/lib/cn";
import { publicListings } from "@/server/listings";
import { zoneStats } from "@/server/zone-stats";
import { money, num, plural, priceSuffix, tx } from "@/lib/i18n";

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

/**
 * The model's hotspots come from one real home on show (a flat or penthouse with the most declared essentials): each
 * tag says something true about it and opens the search filtered by that service.
 */
function modelFrom(locale: Locale, homes: Listing[]): { caption?: { label: string; href: string }; hotspots: Hotspot[] } {
  const score = (l: Listing) =>
    (l.powerBackup === "FULL" ? 2 : l.powerBackup === "PARTIAL" ? 1 : 0) + (l.ownWell ? 1 : 0) + (l.waterTankLiters ? 1 : 0) + (l.viewAvila || l.viewSea ? 1 : 0) + (l.dockFeet ? 1 : 0);
  const towers = homes.filter((l) => l.kind === "apartment" || l.kind === "penthouse");
  const pick = [...(towers.length ? towers : homes)].sort((a, b) => score(b) - score(a))[0];
  if (!pick) return { hotspots: [] };
  const q = (p: string) => `/${locale}/search?type=${pick.listingType}&${p}`;
  const h: Hotspot[] = [];
  if (pick.powerBackup === "FULL" || pick.powerBackup === "PARTIAL") h.push({ label: tx(locale, "Planta eléctrica", "Backup generator"), value: pick.powerBackup === "FULL" ? "100 %" : tx(locale, "parcial", "partial"), href: q(pick.powerBackup === "FULL" ? "power=full" : "power=partial") });
  if (pick.waterTankLiters) h.push({ label: tx(locale, "Tanque", "Water tank"), value: `${num(pick.waterTankLiters, locale)} L`, href: q(`tank=${Math.min(10000, pick.waterTankLiters)}`) });
  if (pick.ownWell) h.push({ label: tx(locale, "Pozo propio", "Own well"), href: q("well=1") });
  if (pick.viewAvila) h.push({ label: tx(locale, "Vista al Ávila", "Ávila view"), href: q("avila=1") });
  else if (pick.viewSea) h.push({ label: tx(locale, "Vista al mar", "Sea view"), href: q("sea=1") });
  if (pick.dockFeet) h.push({ label: tx(locale, "Muelle", "Dock"), value: tx(locale, `${pick.dockFeet} pies`, `${pick.dockFeet} ft`), href: q("dock=1") });
  return {
    caption: { label: tx(locale, `Recorrido 4D · ${pick.title_es}, ${pick.zone}`, `4D tour · ${pick.title_en}, ${pick.zone}`), href: listingHref(locale, pick) },
    hotspots: h.slice(0, 4),
  };
}

export default async function Home({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const all = await publicListings();
  const available = all.filter((l) => AVAILABLE.includes(l.status));
  // Real homes, newest first (the exclusive ones lead). Verified = its agency or advisor is verified.
  const ranked = [...available].sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
  const verifiedHomes = available.filter((l) => l.agency?.verified || l.agent?.verified);
  const advisorShare = verifiedHomes.length ? Math.round((verifiedHomes.filter((l) => l.agent).length / verifiedHomes.length) * 100) : 0;
  const pins = available.map(mapListing);
  const zones = await Promise.all(FEATURED_ZONES.map(async (z) => ({ ...z, stats: await zoneStats(z.zone), ...zoneCard(locale, z.zone, available) })));
  const saleZones = zones.filter((z) => z.type === "SALE");
  const otherZones = zones.filter((z) => z.type !== "SALE");
  const zoneCount = (n: number) => (n > 0 ? plural(n, locale, ["casa", "casas"], ["home", "homes"]) : tx(locale, "Próximamente", "Coming soon"));
  const essentials: { Icon: typeof Zap; es: string; en: string; q: string }[] = [
    { Icon: Zap, es: "Planta eléctrica", en: "Backup generator", q: "power=full" },
    { Icon: Droplets, es: "Pozo propio", en: "Own well", q: "well=1" },
    { Icon: Container, es: "Tanque de 10.000 L o más", en: "10,000 L tank or more", q: "tank=10000" },
    { Icon: Anchor, es: "Muelle", en: "Private dock", q: "dock=1" },
    { Icon: Mountain, es: "Vista al Ávila", en: "Ávila view", q: "avila=1" },
    { Icon: Waves, es: "Vista al mar", en: "Sea view", q: "sea=1" },
  ];
  const zonePills = ["Lechería", "El Morro", "Puerto La Cruz", "Altamira", "Los Palos Grandes", "La Castellana", "Country Club"];

  return (
    <PublicPage locale={locale} header="transparent" tabbar>
      <HomeMotion />
      <HeroAura locale={locale} verified={verifiedHomes.length} advisorShare={advisorShare} model={modelFrom(locale, available)} />

      {/* 1 · CASAS REALES, HOY — real homes at the first scroll. */}
      <section className="mx-auto max-w-[1440px] px-5 pt-10 md:px-10 md:pt-16 lg:px-12 min-[1440px]:px-24" aria-labelledby="hoy-title">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="np-label text-gold-text">{tx(locale, "Recién verificadas", "Just verified")}</p>
            <h2 id="hoy-title" className="mt-2 text-[32px] leading-[1.05] text-ink md:text-[48px]">{tx(locale, "Casas reales, hoy.", "Real homes, today.")}</h2>
          </div>
          <Link href={`/${locale}/search?type=SALE`} className="group inline-flex min-h-11 items-center gap-2 font-display text-[15px] font-medium text-ink">
            {tx(locale, `Ver las ${num(available.length, locale)} casas`, `See all ${num(available.length, locale)} homes`)}
            <ArrowRight size={16} aria-hidden className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
        <nav aria-label={tx(locale, "Zonas", "Areas")} className="no-scrollbar -mx-5 mt-5 flex gap-2 overflow-x-auto px-5 md:mx-0 md:px-0">
          {zonePills.map((z) => (
            <Link key={z} href={`/${locale}/search?zone=${encodeURIComponent(z)}`} className="flex min-h-10 shrink-0 items-center rounded-full border border-line bg-white/60 px-4 font-display text-[14px] text-ink/80 transition-colors hover:border-[#9A9DA1] hover:bg-white hover:text-ink">
              {z}
            </Link>
          ))}
        </nav>
        <ul className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 min-[1280px]:grid-cols-4">
          {ranked.filter((l) => !!listingPhoto(l, 0)).slice(0, 8).map((l, i) => (
            <li key={l.id} className={cn(i >= 4 && "hidden min-[1280px]:block", i >= 2 && i < 4 && "hidden sm:block")}>
              <ListingCard l={l} locale={locale} />
            </li>
          ))}
        </ul>
      </section>

      {/* 2 · GUARDIA 24/7 — the one dark block of the page. */}
      <section className="mx-3 mt-14 overflow-hidden rounded-[28px] bg-navy text-[#ECEEF0] md:mx-6 md:mt-20" aria-labelledby="guardia-title">
        <div className="mx-auto grid max-w-[1440px] items-center gap-8 px-6 py-12 md:px-12 md:py-16 lg:grid-cols-[1.2fr_1fr] min-[1440px]:px-20">
          <div>
            <p className="np-label text-[#A9AFB6]">{tx(locale, "Guardia 24/7", "On call 24/7")}</p>
            <h2 id="guardia-title" className="mt-3 text-[32px] leading-[1.05] md:text-[52px]">
              <GuardiaClock locale={locale} />
            </h2>
            <p className="mt-4 max-w-[520px] text-[16px] leading-[1.55] text-[#A9AFB6] md:text-[17px]">
              {tx(locale, "Cada agencia deja un asesor de guardia. Escríbele ahora por WhatsApp o por chat: te responde una persona con nombre y foto, no un robot.", "Every agency keeps an advisor on call. Message them now on WhatsApp or chat: a person with a name and a face answers, not a bot.")}
            </p>
          </div>
          <div className="lg:justify-self-end">
            <OnCallButton locale={locale} className="inline-flex min-h-12 items-center gap-3 rounded-full bg-[#ECEEF0] px-6 font-display text-[15px] font-medium text-[#1F2328] transition-transform duration-200 hover:-translate-y-px">
              <span className="np-live" aria-hidden />
              {tx(locale, "Hablar con el asesor de guardia", "Talk to the on-call advisor")}
            </OnCallButton>
          </div>
        </div>
      </section>

      {/* 3 · LO QUE IMPORTA EN VENEZUELA — every icon filters the search. */}
      <section className="mx-auto max-w-[1440px] px-5 pt-14 md:px-10 md:pt-20 lg:px-12 min-[1440px]:px-24" aria-labelledby="ve-title">
        <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
          <div>
            <p className="np-label text-gold-text">{tx(locale, "Lo que importa en Venezuela", "What matters in Venezuela")}</p>
            <h2 id="ve-title" className="mt-2 text-[32px] leading-[1.05] text-ink md:text-[48px]">{tx(locale, "Luz, agua y vista, antes que nada.", "Power, water and a view, first.")}</h2>
            <p className="mt-4 max-w-[460px] text-[16px] leading-[1.55] text-muted">
              {tx(locale, "Filtra por planta eléctrica, pozo propio, litros de tanque, muelle, vista al Ávila o vista al mar. Lo indica quien publica, y si falta un dato, te lo decimos.", "Filter by backup generator, own well, tank size, dock, Ávila or sea view. The publisher declares it, and if something is missing, we say so.")}
            </p>
          </div>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {essentials.map(({ Icon, es, en, q }) => (
              <li key={q}>
                <Link href={`/${locale}/search?type=SALE&${q}`} className="np-card-lift group flex h-full min-h-[104px] flex-col justify-between gap-3 rounded-[20px] border border-line bg-[#FBFCFC] p-4 [html.dark_&]:bg-[#1C2025]">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border-[1.5px] border-[#9A9DA1] text-gold-text"><Icon size={18} strokeWidth={1.5} aria-hidden /></span>
                  <span className="font-display text-[15px] font-medium text-ink">{tx(locale, es, en)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

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
            <ul data-reveal="stagger" data-zone-rail className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 md:mx-0 md:grid md:snap-none md:grid-cols-2 md:overflow-visible md:px-0 lg:flex lg:flex-col">
              {saleZones.map((z) => (
                <li key={z.zone} className="w-[78%] shrink-0 snap-start sm:w-[46%] md:w-auto">
                  <Link href={z.href} data-spotlight className="np-glass group flex h-full min-h-[88px] items-stretch overflow-hidden rounded-[24px] transition-transform duration-500 hover:-translate-y-0.5 md:min-h-[104px]">
                    <span className="relative m-2 w-[56px] shrink-0 overflow-hidden rounded-[18px] sm:w-[84px] lg:w-[100px]">
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
                      <Link href={z.href} className="np-glass group flex min-h-[64px] items-center gap-3 rounded-[20px] p-1.5 pr-4 transition-transform duration-500 hover:-translate-y-0.5">
                        <span className="relative h-[52px] w-[52px] shrink-0 overflow-hidden rounded-[14px]">
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

      {/* 5 · SI VIVES FUERA · SI VAS A VENDER — two bento cards. */}
      <section className="mx-auto grid max-w-[1440px] gap-4 px-5 pt-14 md:grid-cols-2 md:px-10 md:pt-20 lg:px-12 min-[1440px]:px-24">
        <Link href={`/${locale}/search?type=SALE`} className="np-card-lift group flex min-h-[260px] flex-col justify-between rounded-[28px] border border-line bg-[#FBFCFC] p-7 md:p-10 [html.dark_&]:bg-[#1C2025]">
          <div>
            <p className="np-label text-gold-text">{tx(locale, "Si vives fuera", "If you live abroad")}</p>
            <h2 className="mt-3 text-[30px] leading-[1.05] text-ink md:text-[40px]">{tx(locale, "Compra desde Madrid, Miami o Panamá.", "Buy from Madrid, Miami or Panama.")}</h2>
            <p className="mt-4 max-w-[440px] text-[16px] leading-[1.55] text-muted">{tx(locale, "La recorremos contigo por videollamada, revisamos cada papel y, si hace falta, firmamos por ti con un poder notarial.", "We walk you through it on a video call, check every document and, if needed, sign for you with a power of attorney.")}</p>
          </div>
          <span className="mt-6 inline-flex items-center gap-2 font-display text-[15px] font-medium text-ink">{tx(locale, "Comprar a distancia", "Buy remotely")} <ArrowRight size={16} aria-hidden className="transition-transform group-hover:translate-x-0.5" /></span>
        </Link>
        <Link href={`/${locale}/sell`} className="np-card-lift group flex min-h-[260px] flex-col justify-between rounded-[28px] border border-line bg-[#FBFCFC] p-7 md:p-10 [html.dark_&]:bg-[#1C2025]">
          <div>
            <p className="np-label text-gold-text">{tx(locale, "Si vas a vender", "If you\u2019re selling")}</p>
            <h2 className="mt-3 text-[30px] leading-[1.05] text-ink md:text-[40px]">{tx(locale, "¿Cuánto vale tu casa hoy?", "What is your home worth today?")}</h2>
            <p className="mt-4 max-w-[440px] text-[16px] leading-[1.55] text-muted">{tx(locale, "Valoración gratuita en USD con ventas reales de tu zona, en 2 minutos. Sin compromiso.", "A free valuation in USD from real sales in your area, in 2 minutes. No strings attached.")}</p>
          </div>
          <span className="mt-6 inline-flex items-center gap-2 font-display text-[15px] font-medium text-ink">{tx(locale, "Valorar mi casa", "Value my home")} <ArrowUpRight size={16} aria-hidden className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></span>
        </Link>
      </section>

      {/* 6 · PARA AGENCIAS — a thin closing strip. */}
      <section className="mx-auto max-w-[1440px] px-5 pb-16 pt-14 md:px-10 md:pb-24 md:pt-20 lg:px-12 min-[1440px]:px-24">
        <div className="flex flex-col gap-5 border-t border-line pt-8 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-[26px] leading-[1.1] text-ink md:text-[32px]">{tx(locale, "¿Tienes una inmobiliaria?", "Do you run an agency?")}</h2>
            <p className="mt-2 max-w-[560px] text-[16px] text-muted">{tx(locale, "Guardia 24/7, auditoría de chats y rendimiento de tus asesores, todo en un solo lugar. Empieza gratis.", "On-call rota, chat audits and advisor performance, all in one place. Start free.")}</p>
          </div>
          <Button href={`/${locale}/register`} variant="outline">
            {tx(locale, "Conocer New Place para agencias", "New Place for agencies")} <ArrowRight size={16} aria-hidden />
          </Button>
        </div>
      </section>
    </PublicPage>
  );
}

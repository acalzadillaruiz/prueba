import Link from "next/link";
import { Bath, BedDouble, Calendar, Car, ChevronRight, Clock, Eye, Heart, Maximize2, Ruler, Users } from "lucide-react";
import type { Listing, Locale } from "@/types/domain";
import { PublicPage } from "@/components/layout/PublicPage";
import { Gallery } from "@/components/detail/Gallery";
import { EstimateCard } from "@/components/detail/Estimate";
import { ContactPanel } from "@/components/detail/ContactPanel";
import { BilingualBody, PriceHistory } from "@/components/detail/Bits";
import { DetailMap } from "@/components/detail/DetailMap";
import { ListingCard } from "@/components/listing/ListingCard";
import { CompareButton, Freshness, SaveButton, ShareButton, StatusBadge } from "@/components/listing/bits";
import { prisma } from "@newplace/db";
import { listingInclude, publicWhere, toCard, toDomain } from "@/server/listings";
import { getFx } from "@/server/data";
import { AMENITY_LABEL, TYPE_LABEL, lbl, money, num, priceSuffix, tx, plural } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { ViewBeacon } from "@/components/detail/ViewBeacon";
import { zoneStats } from "@/server/zone-stats";
import { SITE_URL } from "@/lib/seo";

function jsonLd(l: Listing, locale: Locale) {
  const url = `${SITE_URL}/${locale}/listing/${l.slug}`;
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: tx(locale, l.title_es, l.title_en),
    url,
    datePosted: l.publishedAt,
    image: l.photos?.length ? l.photos.map((p) => (p.startsWith("http") ? p : `${SITE_URL}${p}`)) : [`${url}/opengraph-image`],
    offers: { "@type": "Offer", price: l.priceAmount, priceCurrency: l.priceCurrency, availability: l.status === "SOLD" || l.status === "RENTED" ? "https://schema.org/SoldOut" : "https://schema.org/InStock" },
    about: {
      "@type": l.kind === "house" || l.kind === "villa" || l.kind === "townhouse" || l.kind === "chalet" ? "House" : l.kind === "land" ? "Place" : "Apartment",
      floorSize: { "@type": "QuantitativeValue", value: l.areaM2, unitCode: "MTK" },
      ...(l.beds ? { numberOfRooms: l.beds } : {}),
      address: { "@type": "PostalAddress", addressLocality: l.zone, addressRegion: l.state, addressCountry: "VE" },
      geo: { "@type": "GeoCoordinates", latitude: l.lat, longitude: l.lng },
    },
  });
}

/** Published and approved: visible to everyone (the rest only through the authenticated preview). */
export function isPublicListing(l: Pick<Listing, "status" | "review" | "privateListing">) {
  return ["COMING_SOON", "ACTIVE", "UNDER_OFFER", "SOLD", "RENTED"].includes(l.status) && l.review === "APPROVED";
}

function Facts({ l, locale, dark }: { l: Listing; locale: Locale; dark?: boolean }) {
  const items = [
    l.beds > 0 && [BedDouble, `${l.beds}`, tx(locale, "habitaciones", "bedrooms")],
    l.baths > 0 && [Bath, `${l.baths}`, l.baths === 1 ? tx(locale, "baño", "bath") : tx(locale, "baños", "baths")],
    [Maximize2, `${num(l.areaM2, locale)} m²`, tx(locale, "construidos", "built")],
    l.plotM2 && [Ruler, `${num(l.plotM2, locale)} m²`, tx(locale, "terreno", "plot")],
    l.parking > 0 && [Car, `${l.parking}`, l.parking === 1 ? tx(locale, "puesto", "parking spot") : tx(locale, "puestos", "parking")],
    l.kind !== "land" && [Calendar, `${l.yearBuilt}`, tx(locale, "año", "built in")],
    l.shortRent && [Users, `${l.shortRent.maxGuests}`, tx(locale, "huéspedes", "guests")],
  ].filter(Boolean) as [React.ElementType, string, string][];
  return (
    <div className="flex flex-wrap gap-x-7 gap-y-3">
      {items.map(([Icon, v, t]) => (
        <div key={t} className="flex items-center gap-2">
          <Icon size={20} className={dark ? "text-gold" : "text-coral"} />
          <div>
            <div className="font-display text-lg font-semibold leading-none">{v}</div>
            <div className={cn("text-xs", dark ? "text-mist" : "text-ink/65")}>{t}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Listing detail. Rendered by the public, cacheable page (published listings only) and by the private preview
 * route (drafts / under review / taken down, for the owner's team). No session is read here.
 */
export async function ListingView({ locale, l }: { locale: Locale; l: Listing }) {
  const isPublic = isPublicListing(l);
  const [zoneRow, fx, similarRows, nearbyRows, soldRows] = await Promise.all([
    zoneStats(l.zone),
    getFx(),
    prisma.listing.findMany({ where: { AND: [publicWhere(), { id: { not: l.id }, listingType: l.listingType }, { OR: [{ city: l.city }, { luxury: l.luxury }] }] }, include: listingInclude, take: 24 }),
    prisma.listing.findMany({ where: { AND: [publicWhere(), { id: { not: l.id }, city: l.city }] }, include: listingInclude, take: 12 }),
    prisma.listing.findMany({ where: { id: { not: l.id }, zone: l.zone, status: { in: ["SOLD", "RENTED"] } }, include: listingInclude, take: 3, orderBy: { updatedAt: "desc" } }),
  ]);
  const zone = zoneRow;
  const usd1 = (n: number) => new Intl.NumberFormat(locale === "es" ? "es-VE" : "en-US", { style: "currency", currency: "USD", maximumFractionDigits: 1 }).format(n).replace(/[\u00a0\u202f]/g, " ");
  const all = [...similarRows.map((r) => toCard(toDomain(r))), ...nearbyRows.map((r) => toCard(toDomain(r)))];
  const similar = similarRows.map((r) => toCard(toDomain(r))).sort((a, b) => Math.abs(a.priceAmount - l.priceAmount) - Math.abs(b.priceAmount - l.priceAmount)).slice(0, 4);
  const nearby = nearbyRows.map((r) => toCard(toDomain(r)));
  void all;
  const ves = fx.find((f) => f.code === "VES")?.perUsd ?? 0;
  const eur = fx.find((f) => f.code === "EUR")?.perUsd ?? 0;
  const dark = l.luxury;
  const soldNearby = soldRows.map((r) => toCard(toDomain(r))).map((o) => ({ t: `${tx(locale, o.title_es, o.title_en)} · ${o.areaM2} m²`, p: o.priceAmount, d: tx(locale, o.status === "SOLD" ? "Vendido" : "Alquilado", o.status === "SOLD" ? "Sold" : "Rented") }));
  const H = ({ children }: { children: React.ReactNode }) => <h3 className="mb-4 font-display text-xl font-semibold">{children}</h3>;
  const sec = cn("border-t py-8", dark ? "border-navy-line" : "border-line");

  return (
    <PublicPage locale={locale} header={dark ? "dark" : "light"}>
      <div className={cn(dark && "bg-navy text-ivory")}>
        <div className={cn("mx-auto max-w-[1280px] px-4 pt-4 md:px-6", dark && "max-w-none px-0 md:px-0")}>
          <nav className={cn("mb-3 flex items-center gap-1 text-sm", dark ? "mx-auto max-w-[1280px] px-4 text-mist md:px-6" : "text-ink/65")}>
            <Link href={`/${locale}/search?type=${l.listingType.startsWith("COMMERCIAL") ? "COMMERCIAL" : l.listingType}`}>{lbl(TYPE_LABEL[l.listingType], locale)}</Link>
            <ChevronRight size={14} /> <span>{l.city}</span> <ChevronRight size={14} /> <span>{l.zone}</span>
          </nav>
          {!isPublic && (
            <div className="mb-3 rounded-np border border-warn/60 bg-[#C9862A1a] px-4 py-2.5 text-sm font-semibold text-[#8F5E1C]">
              {l.review === "PENDING" ? tx(locale, "Pendiente de aprobación: solo tu equipo ve esta ficha.", "Pending approval: only your team can see this listing.") : tx(locale, `No publicado (${l.status}). Solo tu equipo ve esta ficha.`, `Not public (${l.status}). Only your team can see this listing.`)}
              {l.takedownReason && ` · ${l.takedownReason}`}
            </div>
          )}
          <Gallery l={l} locale={locale} luxury={dark} />
          {isPublic && <ViewBeacon id={l.id} />}
          {l.luxury && l.brochurePdf && (
            <a href={l.brochurePdf} target="_blank" rel="noreferrer" className={cn("mt-3 inline-flex min-h-11 items-center gap-2 rounded-full border px-4 font-display text-sm", dark ? "border-gold/50 text-gold hover:bg-white/5" : "border-line bg-white")}>
              {tx(locale, "Descargar brochure (PDF)", "Download brochure (PDF)")}
            </a>
          )}
          {isPublic && (
            <script
              type="application/ld+json"
              // schema.org structured data for search engines (rich results)
              dangerouslySetInnerHTML={{ __html: jsonLd(l, locale).replace(/</g, "\\u003c") }}
            />
          )}
        </div>

        <div className="mx-auto grid max-w-[1280px] gap-10 px-4 pt-6 md:px-6 grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_380px]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={l.status} locale={locale} />
              {dark && <span className="rounded-full border border-gold px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-gold">Luxury collection</span>}
              <Freshness iso={l.updatedAt} locale={locale} className={dark ? "text-mist" : "text-ink/65"} />
              <div className="ml-auto flex items-center gap-2">
                <CompareButton id={l.id} locale={locale} dark={dark} />
                <ShareButton locale={locale} title={tx(locale, l.title_es, l.title_en)} className={cn("inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold", dark ? "border-white/20" : "border-line bg-white")} />
                <SaveButton id={l.id} locale={locale} className="h-8 w-8 border border-line" />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="font-display text-4xl font-bold">
                  {money(l.priceAmount, locale)}
                  <span className={cn("text-lg font-normal", dark ? "text-mist" : "text-ink/65")}>{priceSuffix(l, locale)}</span>
                </div>
                <div className={cn("mt-1 text-sm", dark ? "text-mist" : "text-ink/65")}>
                  ≈ Bs. {num(Math.round(l.priceAmount * ves), locale)} · € {num(Math.round(l.priceAmount * eur), locale)} <span className="opacity-70">({tx(locale, "tasa referencial", "reference rate")})</span>
                </div>
              </div>
              <div className={cn("text-right text-sm", dark ? "text-mist" : "text-ink/60")}>
                <div className="font-semibold">{l.address}</div>
                <div>{l.zone}, {l.city} · {l.state}</div>
              </div>
            </div>
            <h1 className="mt-4 font-display text-2xl font-semibold md:text-3xl">{tx(locale, l.title_es, l.title_en)}</h1>
            <div className="mt-5"><Facts l={l} locale={locale} dark={dark} /></div>
            <div className={cn("mt-5 flex flex-wrap gap-4 text-sm", dark ? "text-mist" : "text-ink/65")}>
              <span className="inline-flex items-center gap-1.5"><Eye size={15} /> {num(l.stats.impressions, locale)} {tx(locale, "vistas", "views")}</span>
              <span className="inline-flex items-center gap-1.5"><Heart size={15} /> {l.stats.saves} {tx(locale, "lo guardaron", "saves")}</span>
              <span className="inline-flex items-center gap-1.5"><Clock size={15} /> {l.daysOnMarket === 0 ? tx(locale, "Publicado hoy", "Listed today") : plural(l.daysOnMarket, locale, ["día publicado", "días publicado"], ["day on New Place", "days on New Place"])}</span>
            </div>

            <div className={sec + " mt-8"}><BilingualBody l={l} locale={locale} dark={dark} /></div>

            <div className={sec}>
              <H>{tx(locale, "Amenidades", "Amenities")}</H>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {l.amenities.map((a) => (
                  <div key={a} className={cn("rounded-lg border px-3 py-2.5 text-sm font-semibold", dark ? "border-navy-line" : "border-line bg-white")}>{lbl(AMENITY_LABEL[a], locale)}</div>
                ))}
                {l.commercial && (
                  <>
                    <div className={cn("rounded-lg border px-3 py-2.5 text-sm", dark ? "border-navy-line" : "border-line bg-white")}><b>{l.commercial.ceilingHeight} m</b> {tx(locale, "altura libre", "clear height")}</div>
                    <div className={cn("rounded-lg border px-3 py-2.5 text-sm", dark ? "border-navy-line" : "border-line bg-white")}><b>{l.commercial.zoning}</b></div>
                    {l.commercial.capRate && <div className={cn("rounded-lg border px-3 py-2.5 text-sm", dark ? "border-navy-line" : "border-line bg-white")}>Cap rate <b>{l.commercial.capRate} %</b></div>}
                    {l.commercial.loadingDock && <div className={cn("rounded-lg border px-3 py-2.5 text-sm", dark ? "border-navy-line" : "border-line bg-white")}><b>{tx(locale, "Andén de carga", "Loading dock")}</b></div>}
                  </>
                )}
                {l.shortRent && (
                  <div className={cn("rounded-lg border px-3 py-2.5 text-sm", dark ? "border-navy-line" : "border-line bg-white")}>{tx(locale, "Mín.", "Min.")} <b>{l.shortRent.minNights} {tx(locale, "noches", "nights")}</b> · {tx(locale, "limpieza", "cleaning")} {money(l.shortRent.cleaningFee, locale)}</div>
                )}
              </div>
            </div>

            <div className={sec}><EstimateCard l={l} locale={locale} dark={dark} /></div>

            <div className={sec}>
              <H>{tx(locale, "Ubicación", "Location")}</H>
              <DetailMap l={l} locale={locale} nearby={nearby} />
              <p className={cn("mt-2 text-xs", dark ? "text-mist" : "text-ink/65")}>
                {tx(locale, "Colegios y trayectos se muestran solo cuando hay datos verificados para la zona.", "Schools and commute times appear only when verified data exists for the area.")}
              </p>
            </div>

            <div className={cn(sec, "grid gap-8 md:grid-cols-2")}>
              <div>
                <H>{tx(locale, "Historial de precio", "Price history")}</H>
                <PriceHistory events={l.priceHistory} locale={locale} dark={dark} />
              </div>
              <div>
                <H>{tx(locale, `Informe de zona · ${l.zone}`, `Area report · ${l.zone}`)}</H>
                <p className={cn("-mt-2 mb-3 text-xs", dark ? "text-mist" : "text-ink/65")}>{zone.live ? tx(locale, "Calculado con los anuncios publicados en New Place.", "Computed from listings published on New Place.") : tx(locale, "Pocos anuncios en la zona: valores de referencia.", "Few listings in this area: reference values.")}</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    [money(zone.salePpm, locale), tx(locale, "USD/m² venta", "USD/m² sale")],
                    [usd1(zone.rentPpm), tx(locale, "USD/m² alquiler/mes", "USD/m² rent/mo")],
                    [num(zone.activeListings, locale), tx(locale, "en oferta en New Place", "available on New Place")],
                    [zone.daysOnMarket, tx(locale, "días en mercado (mediana)", "median days on market")],
                  ].map(([v, t]) => (
                    <div key={String(t)} className={cn("rounded-np border p-3", dark ? "border-navy-line" : "border-line bg-white")}>
                      <div className="font-display text-xl font-semibold">{v}</div>
                      <div className={cn("text-xs", dark ? "text-mist" : "text-ink/65")}>{t}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {soldNearby.length > 0 && (
              <div className={sec}>
                <H>{tx(locale, "Vendidos cerca", "Sold nearby")}</H>
                <div className={cn("divide-y rounded-np border", dark ? "divide-navy-line border-navy-line" : "divide-line border-line bg-white")}>
                  {soldNearby.map((s) => (
                    <div key={s.t} className="flex items-center justify-between px-4 py-3 text-sm">
                      <span className="font-semibold">{s.t}</span>
                      <span className={dark ? "text-mist" : "text-ink/65"}>{s.d}</span>
                      <span className="font-display">{money(s.p, locale)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <aside className="lg:sticky lg:top-20 lg:self-start">
            <ContactPanel l={l} locale={locale} dark={dark} />
          </aside>
        </div>

        <div className="mx-auto max-w-[1280px] px-4 pb-16 pt-6 md:px-6">
          <H>{tx(locale, "Similares", "Similar homes")}</H>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {similar.map((s) => (
              <ListingCard key={s.id} l={s} locale={locale} />
            ))}
          </div>
        </div>
      </div>
    </PublicPage>
  );
}

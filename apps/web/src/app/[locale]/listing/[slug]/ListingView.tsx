import Link from "next/link";
import { Anchor, Clock, Droplet, Droplets, Eye, Heart, Mountain, Waves, Zap, type LucideIcon } from "lucide-react";
import type { Listing, Locale } from "@/types/domain";
import { PublicPage } from "@/components/layout/PublicPage";
import { Gallery } from "@/components/detail/Gallery";
import { EstimateCard } from "@/components/detail/Estimate";
import { ContactPanel } from "@/components/detail/ContactPanel";
import { whatsappHref } from "@/lib/listing-href";
import { Badge } from "@/components/ui";
import { BilingualBody, PriceHistory } from "@/components/detail/Bits";
import { DetailMap } from "@/components/detail/DetailMap";
import { mapListing } from "@/components/map/mapListing";
import { ListingCard } from "@/components/listing/ListingCard";
import { CompareButton, Freshness, SaveButton, ShareButton, StatusBadge } from "@/components/listing/bits";
import { prisma } from "@newplace/db";
import { PUBLIC_STATUSES, listingInclude, publicWhere, toCard, toDomain } from "@/server/listings";
import { getFx } from "@/server/data";
import { AMENITY_LABEL, TYPE_LABEL, lbl, money, num, priceSuffix, tx, plural } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { ViewBeacon } from "@/components/detail/ViewBeacon";
import { StickyContactBar } from "@/components/detail/StickyContactBar";
import { takesTours } from "@/lib/visit-hours";
import { zoneStats } from "@/server/zone-stats";
import { essentialLabels } from "@/lib/essentials";

const ESSENTIAL_ICON: Record<string, LucideIcon> = { power: Zap, well: Droplet, tank: Droplets, dock: Anchor, avila: Mountain, sea: Waves };

/** "Servicios esenciales": backup power, water and dock/views — only values the listing actually declares. */
function Essentials({ l, locale, title }: { l: Listing; locale: Locale; title: React.ReactNode }) {
  const items = essentialLabels(l, locale);
  if (!items.length) return null;
  return (
    <div className="border-t border-line py-10" data-testid="essentials">
      {title}
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(({ key, label }) => {
          const Icon = ESSENTIAL_ICON[key];
          return (
            <li key={key} className="flex items-center gap-3 rounded-[20px] bg-white/70 ring-1 ring-black/[.04] px-4 py-3 text-[15px] font-semibold text-ink [font-feature-settings:'lnum']">
              <Icon size={18} strokeWidth={1.7} className="shrink-0 text-navy" aria-hidden />
              <span>{label}</span>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-sm text-muted">{tx(locale, "Lo indica quien publica la casa. Si un servicio no aparece, es porque no lo informó.", "As stated by the lister. If a service isn’t shown, it wasn’t reported.")}</p>
    </div>
  );
}


/** Published and approved: visible to everyone (the rest only through the authenticated preview). */
export function isPublicListing(l: Pick<Listing, "status" | "review" | "privateListing">) {
  return PUBLIC_STATUSES.includes(l.status) && l.review === "APPROVED";
}

function Facts({ l, locale }: { l: Listing; locale: Locale }) {
  const items = [
    l.beds > 0 && [`${l.beds}`, tx(locale, l.beds === 1 ? "habitación" : "habitaciones", l.beds === 1 ? "bedroom" : "bedrooms")],
    l.baths > 0 && [`${l.baths}`, l.baths === 1 ? tx(locale, "baño", "bath") : tx(locale, "baños", "baths")],
    [`${num(l.areaM2, locale)} m²`, tx(locale, "construcción", "built")],
    l.plotM2 && [`${num(l.plotM2, locale)} m²`, tx(locale, "parcela", "plot")],
    l.parking > 0 && [`${l.parking}`, l.parking === 1 ? tx(locale, "puesto", "parking spot") : tx(locale, "puestos", "parking")],
    l.kind !== "land" && [`${l.yearBuilt}`, tx(locale, "año", "year built")],
    l.shortRent && [`${l.shortRent.maxGuests}`, tx(locale, "huéspedes", "guests")],
  ].filter(Boolean) as [string, string][];
  return (
    <dl className="flex flex-wrap gap-x-12 gap-y-5 border-y border-line py-6 lg:gap-x-14">
      {items.map(([v, t]) => (
        <div key={t} className="flex flex-col-reverse">
          <dt className="mt-1 text-[13px] font-semibold uppercase tracking-[0.14em] text-muted">{t}</dt>
          <dd className="font-serif text-[30px] font-semibold leading-none text-ink">{v}</dd>
        </div>
      ))}
    </dl>
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
    prisma.listing.findMany({ where: { AND: [publicWhere(), { id: { not: l.id }, zone: l.zone, status: { in: ["SOLD", "RENTED"] } }] }, include: listingInclude, take: 3, orderBy: { updatedAt: "desc" } }),
  ]);
  const zone = zoneRow;
  const usd1 = (n: number) => new Intl.NumberFormat(locale === "es" ? "es-VE" : "en-US", { style: "currency", currency: "USD", maximumFractionDigits: 1 }).format(n).replace(/[\u00a0\u202f]/g, " ");
  const similar = similarRows.map((r) => toCard(toDomain(r))).sort((a, b) => Math.abs(a.priceAmount - l.priceAmount) - Math.abs(b.priceAmount - l.priceAmount)).slice(0, 4);
  const nearby = nearbyRows.map((r) => toCard(toDomain(r)));
  const ves = fx.find((f) => f.code === "VES")?.perUsd ?? 0;
  const eur = fx.find((f) => f.code === "EUR")?.perUsd ?? 0;
  const ppm = l.listingType === "SALE" || l.listingType === "COMMERCIAL_SALE" ? Math.round(l.priceAmount / Math.max(1, l.areaM2)) : null;
  const soldNearby = soldRows.map((r) => toCard(toDomain(r))).map((o) => ({ t: `${tx(locale, o.title_es, o.title_en)} · ${o.areaM2} m²`, p: o.priceAmount, d: tx(locale, o.status === "SOLD" ? "Vendido" : "Alquilado", o.status === "SOLD" ? "Sold" : "Rented") }));
  const H = ({ children }: { children: React.ReactNode }) => <h3 className="mb-5 font-serif text-[28px] leading-tight">{children}</h3>;
  const sec = "border-t border-line py-10";
  const tile = "rounded-[20px] bg-white/70 ring-1 ring-black/[.04] px-4 py-3 text-[15px]";
  const searchType = l.listingType.startsWith("COMMERCIAL") ? "COMMERCIAL" : l.listingType;

  return (
    <PublicPage locale={locale}>
      {/* Bottom padding on phones: the sticky contact bar never hides the last section. */}
      <div className="pb-28 md:pb-0">
        <div className="mx-auto max-w-[1320px] px-4 pt-5 md:px-8">
          <nav aria-label={tx(locale, "Ruta de navegación", "Breadcrumb")} className="mb-3 flex flex-wrap items-center text-[15px] text-muted">
            <Link className="inline-flex min-h-11 items-center underline-offset-4 hover:text-ink hover:underline" href={`/${locale}/search?type=${searchType}`}>{lbl(TYPE_LABEL[l.listingType], locale)}</Link>
            {[l.state, l.city, l.zone].filter((x, i, a) => x && a.indexOf(x) === i).map((x) => (
              <span key={x}><span aria-hidden className="px-1.5">·</span>{x}</span>
            ))}
          </nav>
          {!isPublic && (
            <div className="mb-3 rounded-xl border border-warn/60 bg-[#8A5A001a] px-4 py-2.5 text-sm font-semibold text-[#8A5A00]">
              {l.review === "PENDING" ? tx(locale, "En revisión: por ahora solo tu equipo puede verla.", "Under review: for now only your team can see it.") : tx(locale, `Aún no está publicada (${l.status}). Solo tu equipo puede verla.`, `Not public yet (${l.status}). Only your team can see it.`)}
              {l.takedownReason && ` · ${l.takedownReason}`}
            </div>
          )}
          <Gallery l={l} locale={locale} />
          {isPublic && <ViewBeacon id={l.id} />}
          {l.luxury && l.brochurePdf && (
            <a href={l.brochurePdf} target="_blank" rel="noreferrer" className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full border-[1.5px] border-navy px-5 font-display text-sm font-semibold text-navy hover:bg-navy/5">
              {tx(locale, "Descargar el folleto (PDF)", "Download the brochure (PDF)")}
            </a>
          )}
        </div>

        <div className="mx-auto grid max-w-[1320px] grid-cols-[minmax(0,1fr)] gap-12 px-4 pt-8 md:px-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-16">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              {l.luxury && <Badge tone="exclusive">{tx(locale, "Exclusiva New Place", "New Place exclusive")}</Badge>}
              {l.status !== "ACTIVE" && <StatusBadge status={l.status} locale={locale} />}
              {(l.viewSea || l.viewAvila || l.amenities.includes("view")) && <Badge tone="egeo">{l.viewSea ? tx(locale, "Vista al mar", "Sea view") : l.viewAvila ? tx(locale, "Vista al Ávila", "Ávila view") : tx(locale, "Con vista", "With a view")}</Badge>}
              {l.furnished && <Badge tone="arena">{tx(locale, "Amoblado", "Furnished")}</Badge>}
              <div className="ml-auto flex items-center gap-2">
                <CompareButton id={l.id} locale={locale} className="min-h-11 px-3.5 text-[13px]" />
                <ShareButton locale={locale} title={tx(locale, l.title_es, l.title_en)} className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line bg-white px-3.5 text-[13px] font-semibold" />
                <SaveButton id={l.id} locale={locale} className="border border-line" />
              </div>
            </div>
            <h1 className="mt-5 max-w-[760px] text-[38px] leading-[1.06] tracking-[-0.02em] md:text-[56px]">{tx(locale, l.title_es, l.title_en)}</h1>
            <p className="mt-2 text-[15px] text-muted">{l.address} · {l.zone}, {l.city}{l.state && l.state !== l.city ? `, ${l.state}` : ""}</p>
            <div className="mt-7 flex flex-wrap items-baseline gap-x-5 gap-y-1">
              <div className="font-serif text-[48px] font-semibold leading-none text-ink md:text-[58px]">
                {money(l.priceAmount, locale)}
                <span className="font-display text-lg font-normal text-muted">{priceSuffix(l, locale)}</span>
              </div>
              <div className="text-[15px] text-muted">
                {ppm ? `${money(ppm, locale)} / m² · ` : ""}≈ Bs. {num(Math.round(l.priceAmount * ves), locale)} · € {num(Math.round(l.priceAmount * eur), locale)} <span>({tx(locale, "tasa referencial", "reference rate")})</span>
              </div>
            </div>
            <div className="mt-8"><Facts l={l} locale={locale} /></div>
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted">
              <Freshness iso={l.updatedAt} locale={locale} />
              <span className="inline-flex items-center gap-1.5"><Eye size={15} aria-hidden /> {num(l.stats.impressions, locale)} {tx(locale, "vistas", "views")}</span>
              <span className="inline-flex items-center gap-1.5"><Heart size={15} aria-hidden /> {l.stats.saves} {tx(locale, "lo guardaron", "saves")}</span>
              <span className="inline-flex items-center gap-1.5"><Clock size={15} aria-hidden /> {l.daysOnMarket === 0 ? tx(locale, "Publicado hoy", "Listed today") : plural(l.daysOnMarket, locale, ["día en New Place", "días en New Place"], ["day on New Place", "days on New Place"])}</span>
            </div>

            <div className="mt-8 py-6"><BilingualBody l={l} locale={locale} /></div>

            <Essentials l={l} locale={locale} title={<H>{tx(locale, "Servicios esenciales", "Essential services")}</H>} />

            <div className={sec}>
              <H>{tx(locale, "Amenidades", "Amenities")}</H>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {l.amenities.map((a) => (
                  <div key={a} className={cn(tile, "font-semibold")}>{lbl(AMENITY_LABEL[a], locale)}</div>
                ))}
                {l.commercial && (
                  <>
                    <div className={tile}><b>{l.commercial.ceilingHeight} m</b> {tx(locale, "altura libre", "clear height")}</div>
                    <div className={tile}><b>{l.commercial.zoning}</b></div>
                    {l.commercial.capRate && <div className={tile}>Cap rate <b>{l.commercial.capRate} %</b></div>}
                    {l.commercial.loadingDock && <div className={tile}><b>{tx(locale, "Andén de carga", "Loading dock")}</b></div>}
                  </>
                )}
                {l.shortRent && (
                  <div className={tile}>{tx(locale, "Mín.", "Min.")} <b>{l.shortRent.minNights} {tx(locale, "noches", "nights")}</b> · {tx(locale, "limpieza", "cleaning")} {money(l.shortRent.cleaningFee, locale)}</div>
                )}
              </div>
            </div>

            <div className={sec}><EstimateCard l={l} locale={locale} /></div>

            <div className={sec}>
              <H>{tx(locale, "Ubicación", "Location")}</H>
              <DetailMap l={mapListing(l)} locale={locale} nearby={nearby.map(mapListing)} />
              <p className="mt-3 text-sm text-muted">
                {tx(locale, "Te mostramos colegios y tiempos de trayecto solo cuando los hemos verificado en la zona.", "We show schools and travel times only once we’ve verified them for the area.")}
              </p>
            </div>

            <div className={cn(sec, "grid grid-cols-1 gap-10 md:grid-cols-2")}>
              <div>
                <H>{tx(locale, "Historial de precio", "Price history")}</H>
                <PriceHistory events={l.priceHistory} locale={locale} />
              </div>
              <div>
                <H>{tx(locale, `La zona en cifras · ${l.zone}`, `The area in numbers · ${l.zone}`)}</H>
                <p className="-mt-3 mb-4 text-sm text-muted">{zone.live ? tx(locale, "Calculado con las casas publicadas en New Place.", "Worked out from the homes listed on New Place.") : tx(locale, "Aún hay pocas casas publicadas aquí: tómalo como una referencia.", "Only a few homes listed here so far: treat these as a guide.")}</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    [money(zone.salePpm, locale), tx(locale, "USD/m² venta", "USD/m² sale")],
                    [usd1(zone.rentPpm), tx(locale, "USD/m² alquiler/mes", "USD/m² rent/mo")],
                    [num(zone.activeListings, locale), tx(locale, "en oferta en New Place", "available on New Place")],
                    [zone.daysOnMarket, tx(locale, "días en mercado (mediana)", "median days on market")],
                  ].map(([v, t]) => (
                    <div key={String(t)} className="rounded-[20px] bg-white/70 ring-1 ring-black/[.04] p-4">
                      <div className="font-serif text-[26px] font-semibold leading-none">{v}</div>
                      <div className="mt-1.5 text-sm text-muted">{t}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {soldNearby.length > 0 && (
              <div className={sec}>
                <H>{tx(locale, "Se vendieron cerca", "Recently sold nearby")}</H>
                <div className="divide-y divide-line rounded-[20px] bg-white/70 ring-1 ring-black/[.04]">
                  {soldNearby.map((s) => (
                    <div key={s.t} className="flex items-center justify-between gap-3 px-4 py-3 text-[15px]">
                      <span className="font-semibold">{s.t}</span>
                      <span className="text-muted">{s.d}</span>
                      <span className="font-serif text-lg font-semibold">{money(s.p, locale)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <aside id="contact" className="scroll-mt-24 lg:sticky lg:top-24 lg:self-start">
            <ContactPanel l={l} locale={locale} />
          </aside>
          <StickyContactBar
            locale={locale}
            price={money(l.priceAmount, locale)}
            suffix={priceSuffix(l, locale)}
            tour={takesTours(l)}
            whatsapp={whatsappHref(l, locale)}
            agentFirst={l.agent?.name.split(" ")[0]}
          />
        </div>

        {similar.length > 0 && (
          <div className="mx-auto max-w-[1320px] px-4 pb-20 pt-10 md:px-8">
            <h2 className="mb-8 text-[34px] leading-tight tracking-[-0.02em] md:text-[46px]">{tx(locale, "También te pueden gustar", "You might also like")}</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {similar.map((s) => (
                <ListingCard key={s.id} l={s} locale={locale} compact />
              ))}
            </div>
          </div>
        )}
      </div>
    </PublicPage>
  );
}

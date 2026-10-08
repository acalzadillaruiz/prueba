import Link from "next/link";
import { Anchor, Clock, Droplet, Droplets, Eye, Heart, Mountain, Waves, X, Zap, type LucideIcon } from "lucide-react";
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
import { BackToResults } from "@/components/detail/BackToResults";
import { Fold } from "@/components/detail/Fold";
import { CompareLink } from "@/components/compare/CompareTray";
import { OPEN_FOR_TOURS, takesTours } from "@/lib/visit-hours";
import { zoneStats } from "@/server/zone-stats";
import { essentialLabels } from "@/lib/essentials";

const ESSENTIAL_ICON: Record<string, LucideIcon> = { power: Zap, well: Droplet, tank: Droplets, dock: Anchor, avila: Mountain, sea: Waves };

/**
 * Amenities minus whatever the "Servicios esenciales" block (or the commercial tiles) already shows: no "Planta
 * eléctrica" under a "Planta eléctrica 100 %", no "Tanque de agua" under "Tanque de 5.000 L", no bare "Vista" next to
 * "Vista al Ávila", no second "Andén de carga".
 */
export function amenitiesBeyondEssentials(l: Pick<Listing, "amenities" | "powerBackup" | "waterTankLiters" | "viewAvila" | "viewSea" | "commercial">) {
  const shown = new Set<string>();
  if (l.powerBackup) shown.add("generator");
  if (l.waterTankLiters) shown.add("waterTank");
  if (l.viewAvila || l.viewSea) shown.add("view");
  if (l.commercial?.loadingDock) shown.add("loadingDock");
  return l.amenities.filter((a) => !shown.has(a));
}

/** Views are a feature of the home, not a utility: they go with the amenities, never under "Servicios esenciales". */
const VIEW_KEYS = new Set(["avila", "sea"]);
const essentialServices = (l: Listing, locale: Locale) => essentialLabels(l, locale).filter((x) => !VIEW_KEYS.has(x.key));
const viewFeatures = (l: Listing, locale: Locale) => essentialLabels(l, locale).filter((x) => VIEW_KEYS.has(x.key));

/** "Servicios esenciales": backup power, water and dock — only values the listing actually declares. */
function Essentials({ l, locale, title }: { l: Listing; locale: Locale; title: React.ReactNode }) {
  const items = essentialServices(l, locale);
  if (!items.length) return null;
  return (
    <div className="border-t border-line py-10" data-testid="essentials">
      {title}
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(({ key, label }) => {
          // A declared absence ("no backup power") is information, not a perk: muted, dashed, with an "x" — never styled like a feature.
          if (key === "power" && l.powerBackup === "NONE")
            return (
              <li key={key} data-absent className="flex items-center gap-3 rounded-[20px] border border-dashed border-muted/40 px-4 py-3 text-[15px] text-muted">
                <X size={18} strokeWidth={1.7} className="shrink-0" aria-hidden />
                <span>{tx(locale, "Planta eléctrica: no tiene", "Backup power: none")}</span>
              </li>
            );
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
  // Even rows at every width (a lone "1996 AÑO" on a second row read as a mistake): 6 facts → 2 / 3 per row, 4 → 2 / 4.
  const cols = items.length <= 3 ? ["", "grid-cols-1", "grid-cols-2", "grid-cols-3"][items.length] : items.length === 4 ? "grid-cols-2 sm:grid-cols-4" : items.length >= 7 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-3";
  return (
    <dl className={cn("grid gap-x-8 gap-y-5 border-y border-line py-6", cols)}>
      {items.map(([v, t]) => (
        <div key={t} className="flex min-w-0 flex-col-reverse">
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
  const amenities = amenitiesBeyondEssentials(l);
  const views = viewFeatures(l, locale);
  const tile = "rounded-[20px] bg-white/70 ring-1 ring-black/[.04] px-4 py-3 text-[15px]";
  const searchType = l.listingType.startsWith("COMMERCIAL") ? "COMMERCIAL" : l.listingType;

  const estimateHint = tx(locale, `Valor estimado ≈ ${money(l.estimate.mid, locale)}`, `Estimated value ≈ ${money(l.estimate.mid, locale)}`);
  const historyHint = [plural(l.priceHistory.length, locale, ["movimiento de precio", "movimientos de precio"], ["price event", "price events"]), ppm ? tx(locale, `${money(zone.salePpm, locale)}/m² en ${l.zone}`, `${money(zone.salePpm, locale)}/m² in ${l.zone}`) : tx(locale, `${usd1(zone.rentPpm)}/m² al mes en ${l.zone}`, `${usd1(zone.rentPpm)}/m² a month in ${l.zone}`)].join(" · ");

  return (
    <PublicPage locale={locale}>
      {/* Bottom padding below lg (phones + tablets): the sticky contact bar (and its compare chip) never hides the last section. */}
      <div className="pb-36 lg:pb-0">
        <div className="mx-auto max-w-[1320px] px-4 pt-5 md:px-8">
          <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            <BackToResults locale={locale} />
            <nav aria-label={tx(locale, "Ruta de navegación", "Breadcrumb")} className="flex flex-wrap items-center text-[15px] text-muted">
              <Link className="inline-flex min-h-11 items-center underline-offset-4 hover:text-ink hover:underline" href={`/${locale}/search?type=${searchType}`}>{lbl(TYPE_LABEL[l.listingType], locale)}</Link>
              {[l.state, l.city, l.zone].filter((x, i, a) => x && a.indexOf(x) === i).map((x) => (
                <span key={x}><span aria-hidden className="px-1.5">·</span>{x}</span>
              ))}
            </nav>
          </div>
          {!isPublic && (
            <div className="mb-3 rounded-xl border border-warn/60 bg-[#8A5A001a] px-4 py-2.5 text-sm font-semibold text-[#8A5A00]">
              {l.review === "PENDING" ? tx(locale, "En revisión: por ahora solo tu equipo puede verla.", "Under review: for now only your team can see it.") : tx(locale, `Aún no está publicada (${l.status}). Solo tu equipo puede verla.`, `Not public yet (${l.status}). Only your team can see it.`)}
              {l.takedownReason && ` · ${l.takedownReason}`}
            </div>
          )}
          {/* Phones: photos first, then title and price. Desktop: title and price above a shorter gallery, so both are on the first screen. */}
          <div className="flex flex-col">
            <header className="order-2 mt-6 lg:order-1 lg:mb-6 lg:mt-1">
              <div className="flex flex-wrap items-center gap-2">
                {l.luxury && <Badge tone="exclusive">{tx(locale, "Exclusiva New Place", "New Place exclusive")}</Badge>}
                {l.status !== "ACTIVE" && <StatusBadge status={l.status} locale={locale} />}
                {(l.viewSea || l.viewAvila || l.amenities.includes("view")) && <Badge tone="egeo">{l.viewSea ? tx(locale, "Vista al mar", "Sea view") : l.viewAvila ? tx(locale, "Vista al Ávila", "Ávila view") : tx(locale, "Con vista", "With a view")}</Badge>}
                {l.furnished && <Badge tone="arena">{tx(locale, "Amoblado", "Furnished")}</Badge>}
                <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
                  <CompareLink locale={locale} className="hidden md:inline-flex" />
                  <CompareButton id={l.id} locale={locale} className="min-h-11 px-3.5 text-[13px]" />
                  <ShareButton locale={locale} title={tx(locale, l.title_es, l.title_en)} className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line bg-white px-3.5 text-[13px] font-semibold" />
                  <SaveButton id={l.id} locale={locale} className="border border-line" />
                </div>
              </div>
              <div className="lg:flex lg:items-end lg:justify-between lg:gap-12">
                <div className="min-w-0">
                  <h1 className="mt-5 max-w-[760px] text-[38px] leading-[1.06] tracking-[-0.02em] md:text-[52px] lg:mt-4 lg:text-[48px]">{tx(locale, l.title_es, l.title_en)}</h1>
                  <p className="mt-2 text-[15px] text-muted">{l.address} · {l.zone}, {l.city}{l.state && l.state !== l.city ? `, ${l.state}` : ""}</p>
                </div>
                <div className="mt-7 shrink-0 lg:mt-0 lg:text-right">
                  <div className="font-serif text-[48px] font-semibold leading-none text-ink md:text-[54px] lg:whitespace-nowrap">
                    {money(l.priceAmount, locale)}
                    <span className="font-display text-lg font-normal text-muted">{priceSuffix(l, locale)}</span>
                  </div>
                  <div className="mt-1.5 text-[15px] text-muted">
                    {ppm ? `${money(ppm, locale)} / m² · ` : ""}≈ Bs. {num(Math.round(l.priceAmount * ves), locale)} · € {num(Math.round(l.priceAmount * eur), locale)} <span>({tx(locale, "tasa referencial", "reference rate")})</span>
                  </div>
                </div>
              </div>
            </header>
            <div className="order-1 lg:order-2">
              <Gallery l={l} locale={locale} />
              {isPublic && <ViewBeacon id={l.id} />}
              {l.luxury && l.brochurePdf && (
                <a href={l.brochurePdf} target="_blank" rel="noreferrer" className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full border-[1.5px] border-navy px-5 font-display text-sm font-semibold text-navy hover:bg-navy/5">
                  {tx(locale, "Descargar el folleto (PDF)", "Download the brochure (PDF)")}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Phones: the essentials, then the contact card, then the secondary sections (folded). Desktop: the card sticks on the right. */}
        <div className="mx-auto grid max-w-[1320px] grid-cols-[minmax(0,1fr)] gap-12 px-4 pt-8 md:px-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-x-16 lg:gap-y-0">
          <div className="lg:col-start-1 lg:row-start-1">
            <Facts l={l} locale={locale} />
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted">
              <Freshness iso={l.updatedAt} locale={locale} />
              <span className="inline-flex items-center gap-1.5"><Eye size={15} aria-hidden /> {num(l.stats.impressions, locale)} {tx(locale, "vistas", "views")}</span>
              <span className="inline-flex items-center gap-1.5"><Heart size={15} aria-hidden /> {l.stats.saves} {tx(locale, "lo guardaron", "saves")}</span>
              <span className="inline-flex items-center gap-1.5"><Clock size={15} aria-hidden /> {l.daysOnMarket === 0 ? tx(locale, "Publicado hoy", "Listed today") : plural(l.daysOnMarket, locale, ["día en New Place", "días en New Place"], ["day on New Place", "days on New Place"])}</span>
            </div>

            <div className="mt-8 py-6"><BilingualBody l={l} locale={locale} /></div>

            <Essentials l={l} locale={locale} title={<H>{tx(locale, "Servicios esenciales", "Essential services")}</H>} />

            {(amenities.length > 0 || views.length > 0 || l.commercial || l.shortRent) && (
            <div className={sec} data-testid="amenities">
              <H>{views.length ? tx(locale, "Vistas y amenidades", "Views and amenities") : tx(locale, "Amenidades", "Amenities")}</H>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {views.map(({ key, label }) => {
                  const Icon = ESSENTIAL_ICON[key];
                  return (
                    <div key={key} className={cn(tile, "flex items-center gap-2 font-semibold")} data-testid={`view-${key}`}>
                      <Icon size={17} strokeWidth={1.7} className="shrink-0 text-navy" aria-hidden />
                      {label}
                    </div>
                  );
                })}
                {amenities.map((a) => (
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
            )}
          </div>

          {/* Desktop: the sticky card never outgrows the viewport (it scrolls inside if a long form opens). The scroller's
              padding is as wide as the card's soft shadow (0 20px 50px -18px), so overflow never clips it into a hard edge. */}
          <aside id="contact" className="scroll-mt-24 lg:sticky lg:top-[84px] lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:-mx-8 lg:-mb-12 lg:-mt-3 lg:max-h-[calc(100dvh-84px)] lg:self-start lg:overflow-y-auto lg:overscroll-contain lg:px-8 lg:pb-12 lg:pt-3">
            <ContactPanel l={l} locale={locale} />
          </aside>

          <div className="lg:col-start-1 lg:row-start-2">
            <Fold className={sec} testId="estimate-section" title={tx(locale, "¿Es un buen precio?", "Is it a fair price?")} hint={estimateHint}>
              <EstimateCard l={l} locale={locale} />
            </Fold>

            <div className={sec}>
              <H>{tx(locale, "Ubicación", "Location")}</H>
              <DetailMap l={mapListing(l)} locale={locale} nearby={nearby.map(mapListing)} />
              <p className="mt-3 text-sm text-muted">
                {tx(locale, "Te mostramos colegios y tiempos de trayecto solo cuando los hemos verificado en la zona.", "We show schools and travel times only once we’ve verified them for the area.")}
              </p>
            </div>

            <Fold className={sec} testId="history-section" title={tx(locale, "Historial de precio y la zona", "Price history and the area")} hint={historyHint}>
              <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
                <div>
                  <h4 className="mb-4 font-serif text-[22px] leading-tight">{tx(locale, "Historial de precio", "Price history")}</h4>
                  <PriceHistory events={l.priceHistory} locale={locale} />
                </div>
                <div>
                  <h4 className="mb-4 font-serif text-[22px] leading-tight">{tx(locale, `La zona en cifras · ${l.zone}`, `The area in numbers · ${l.zone}`)}</h4>
                  <p className="-mt-2 mb-4 text-sm text-muted">{zone.live ? tx(locale, "Calculado con las casas publicadas en New Place.", "Worked out from the homes listed on New Place.") : tx(locale, "Aún hay pocas casas publicadas aquí: tómalo como una referencia.", "Only a few homes listed here so far: treat these as a guide.")}</p>
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
            </Fold>

            {soldNearby.length > 0 && (
              <Fold className={sec} testId="sold-nearby" title={tx(locale, "Se vendieron cerca", "Recently sold nearby")} hint={plural(soldNearby.length, locale, ["operación reciente en la zona", "operaciones recientes en la zona"], ["recent deal in the area", "recent deals in the area"])}>
                <div className="divide-y divide-line rounded-[20px] bg-white/70 ring-1 ring-black/[.04]">
                  {soldNearby.map((s) => (
                    <div key={s.t} className="flex items-center justify-between gap-3 px-4 py-3 text-[15px]">
                      <span className="font-semibold">{s.t}</span>
                      <span className="text-muted">{s.d}</span>
                      <span className="font-serif text-lg font-semibold">{money(s.p, locale)}</span>
                    </div>
                  ))}
                </div>
              </Fold>
            )}
          </div>
        </div>
        <StickyContactBar
          locale={locale}
          price={money(l.priceAmount, locale)}
          amount={l.priceAmount}
          meta={[lbl(TYPE_LABEL[l.listingType], locale), l.areaM2 > 0 && `${num(l.areaM2, locale)} m²`].filter(Boolean).join(" · ")}
          suffix={priceSuffix(l, locale)}
          tour={takesTours(l)}
          stay={l.listingType === "SHORT_RENT" && OPEN_FOR_TOURS.includes(l.status)}
          whatsapp={whatsappHref(l, locale)}
          agentFirst={l.agent?.name.split(" ")[0]}
        />

        {similar.length > 0 && (
          <section className="mx-auto max-w-[1320px] pb-20 pt-10 md:px-8" aria-labelledby="similar-title" data-testid="similar">
            <h2 id="similar-title" className="mb-6 px-4 text-[30px] leading-tight tracking-[-0.02em] md:mb-8 md:px-0 md:text-[46px]">{tx(locale, "También te pueden gustar", "You might also like")}</h2>
            {/* Phones: a swipe row (snap per card, the next one peeking). From sm up: a grid. */}
            <ul className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-4 px-4 pb-2 sm:grid sm:grid-cols-2 sm:gap-6 sm:overflow-visible sm:px-4 md:px-0 lg:grid-cols-4">
              {similar.map((s) => (
                <li key={s.id} className="w-[78%] max-w-[320px] shrink-0 snap-start sm:w-auto sm:max-w-none">
                  <ListingCard l={s} locale={locale} compact />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </PublicPage>
  );
}

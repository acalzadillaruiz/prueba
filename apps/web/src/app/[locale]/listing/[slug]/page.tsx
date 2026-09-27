import { notFound } from "next/navigation";
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
import { listingBySlug, listingInclude, publicWhere, toDomain } from "@/server/listings";
import { getFx } from "@/server/data";
import { getAppUser } from "@/server/session";
import { AMENITY_LABEL, TYPE_LABEL, lbl, money, num, priceSuffix, tx, plural } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { alternates } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale; slug: string }> }) {
  const { locale, slug } = await params;
  const l = await listingBySlug(slug);
  if (!l) notFound();
  const title = tx(locale, l.title_es, l.title_en);
  const description = `${money(l.priceAmount, locale, l.priceCurrency)}${priceSuffix(l, locale)} · ${l.zone}, ${l.city} · ${tx(locale, l.body_es, l.body_en)}`.slice(0, 180);
  const path = `/listing/${l.slug}`;
  const hidden = !["COMING_SOON", "ACTIVE", "UNDER_OFFER", "SOLD", "RENTED"].includes(l.status) || l.review !== "APPROVED";
  return {
    title,
    description,
    alternates: alternates(locale, path),
    openGraph: { type: "website", title, description, url: `/${locale}${path}`, locale: locale === "es" ? "es_VE" : "en_US" },
    twitter: { card: "summary_large_image", title, description },
    ...(hidden ? { robots: { index: false, follow: false } } : {}),
  };
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

export default async function ListingPage({ params }: { params: Promise<{ locale: Locale; slug: string }> }) {
  const { locale, slug } = await params;
  const l = await listingBySlug(slug);
  if (!l) notFound();
  const user = await getAppUser();
  const isPublic = ["COMING_SOON", "ACTIVE", "UNDER_OFFER", "SOLD", "RENTED"].includes(l.status) && l.review === "APPROVED";
  const canSeeHidden = !!user && (user.role === "SUPERADMIN" || user.id === l.ownerUserId || (!!l.agencyId && user.agencyId === l.agencyId));
  if (!isPublic && !canSeeHidden) notFound();
  prisma.listing.update({ where: { id: l.id }, data: { views: { increment: 1 }, interactions: { increment: 1 } } }).catch(() => {});
  const [zoneRow, fx, similarRows, nearbyRows, soldRows] = await Promise.all([
    prisma.zone.findUnique({ where: { name: l.zone } }),
    getFx(),
    prisma.listing.findMany({ where: { AND: [publicWhere(), { id: { not: l.id }, listingType: l.listingType }, { OR: [{ city: l.city }, { luxury: l.luxury }] }] }, include: listingInclude, take: 24 }),
    prisma.listing.findMany({ where: { AND: [publicWhere(), { id: { not: l.id }, city: l.city }] }, include: listingInclude, take: 12 }),
    prisma.listing.findMany({ where: { id: { not: l.id }, zone: l.zone, status: { in: ["SOLD", "RENTED"] } }, include: listingInclude, take: 3, orderBy: { updatedAt: "desc" } }),
  ]);
  const zone = zoneRow ?? { salePpm: Math.round(l.priceAmount / l.areaM2), rentPpm: 0, activeListings: 0, daysOnMarket: 0 };
  const all = [...similarRows.map(toDomain), ...nearbyRows.map(toDomain)];
  const similar = similarRows.map(toDomain).sort((a, b) => Math.abs(a.priceAmount - l.priceAmount) - Math.abs(b.priceAmount - l.priceAmount)).slice(0, 4);
  const nearby = nearbyRows.map(toDomain);
  void all;
  const ves = fx.find((f) => f.code === "VES")?.perUsd ?? 0;
  const eur = fx.find((f) => f.code === "EUR")?.perUsd ?? 0;
  const dark = l.luxury;
  const soldNearby = soldRows.map(toDomain).map((o) => ({ t: `${tx(locale, o.title_es, o.title_en)} · ${o.areaM2} m²`, p: o.priceAmount, d: tx(locale, o.status === "SOLD" ? "Vendido" : "Alquilado", o.status === "SOLD" ? "Sold" : "Rented") }));
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
                <div className="grid grid-cols-2 gap-3">
                  {[
                    [money(zone.salePpm, locale), tx(locale, "USD/m² venta", "USD/m² sale")],
                    [`${zone.rentPpm} $`, tx(locale, "USD/m² alquiler/mes", "USD/m² rent/mo")],
                    [zone.activeListings, tx(locale, "ofertas activas", "active listings")],
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

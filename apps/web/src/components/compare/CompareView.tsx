"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, CalendarCheck, Check, FileText, Minus, Plus, Scale, X } from "lucide-react";
import type { Listing, Locale } from "@/types/domain";
import { PropertyArt } from "@/components/art/PropertyArt";
import { Button } from "@/components/ui";
import { Empty, k } from "@/components/agency/kit";
import { useApp } from "@/lib/store";
import { listingPhoto } from "@/lib/photos";
import { AMENITY_LABEL, TYPE_LABEL, lbl, money, num, priceSuffix, shortMoney, tx } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { useListingsByIds } from "./useListingsByIds";

const isSale = (l: Listing) => l.listingType === "SALE" || l.listingType === "COMMERCIAL_SALE";
/** Green / amber that keep ≥ 4.5:1 on the dark card (#2A2420) too. */
const OK = "text-ok dark:text-[#8FCBA6]";
const WARN = "text-warn dark:text-[#E0A84A]";
/** Remove ("×") on a photo: its own light/dark colours (not the remapped bg-white, which turned it dark-on-dark). */
const REMOVE_BTN = "absolute flex items-center justify-center rounded-full bg-[#F1EBE3] text-[#1E1A18] shadow ring-1 ring-black/10 after:absolute after:content-[''] dark:bg-[#15120F]/85 dark:text-[#F1EBE3] dark:ring-[#F1EBE3]/45";
/** Pinned row (phones): the thumbnail is the "Ver ficha" link, then one 36 px text pill ("Visita" / "Fechas") filling the rest of the column. */
const PIN_PILL = "flex h-9 min-w-0 flex-1 items-center justify-center whitespace-nowrap rounded-full px-1.5 font-display text-[13px] font-semibold leading-none";
/** Phone actions row: full column width, the label may wrap to 2 lines in a third of 360 px. */
const STACK_BTN = "flex min-h-11 items-center justify-center rounded-full px-2 py-1.5 text-center font-display text-[13px] font-semibold leading-tight";
/** Backup power ranked for the "best" mark: full > partial > none; unknown isn't ranked. */
const POWER_RANK: Record<string, number> = { FULL: 2, PARTIAL: 1, NONE: 0 };
/** Yes/no cells: a plain ✓ / — in every boolean row (the winner of a row gets the "Mejor" pill instead, never a second ✓). */
const yes = (on: boolean, locale: Locale) => (on ? <Check size={16} className="inline text-ink" aria-label={tx(locale, "Sí", "Yes")} /> : <Minus size={16} className="inline text-muted" aria-label={tx(locale, "No", "No")} />);
/** "USD 118k", "USD 180/n", "$2,500/mo" (as on the map pins): fits the phone's pinned row (a third of 360 px). */
const shortPrice = (l: Listing, locale: Locale) => shortMoney(l.priceAmount, locale) + (l.pricePeriod === "night" ? tx(locale, "/n", "/nt") : l.pricePeriod === "month" ? tx(locale, "/m", "/mo") : "");
const listingUrl = (l: Listing, locale: Locale) => `/${locale}/listing/${l.slug}`;
/** The listing page's contact card (ContactPanel lives in <aside id="contact">). */
const contactUrl = (l: Listing, locale: Locale) => `${listingUrl(l, locale)}#contact`;
/** Vacation rentals are booked by dates, not visited (the contact card says "Disponibilidad"). */
/** One-word pill for the pinned row (a third of 360 px); its accessible name stays the full "Pedir visita: «…»" (the visible word is part of it). */
const pillText = (l: Listing, locale: Locale) => (l.listingType === "SHORT_RENT" ? tx(locale, "Fechas", "Dates") : tx(locale, "Visita", "Viewing"));
const visitText = (l: Listing, locale: Locale) => (l.listingType === "SHORT_RENT" ? tx(locale, "Consultar fechas", "Check dates") : tx(locale, "Pedir visita", "Request a viewing"));

type Row = {
  label: string;
  render: (l: Listing) => React.ReactNode;
  /** Numeric value used to highlight the best column (only when the unit is comparable). */
  val?: (l: Listing) => number;
  best?: "min" | "max";
  /** Hide the row when no compared home has data for it. */
  show?: (l: Listing) => boolean;
};

/**
 * Side-by-side comparison of up to 3 homes. `urlIds` (from ?ids=) wins, so a link can be shared; without it the
 * page shows the visitor's own selection (the tray, kept on the device). No account needed.
 */
export function CompareView({ locale, urlIds, initial }: { locale: Locale; urlIds: string[] | null; initial: Listing[] }) {
  const { compare, toggleCompare } = useApp();
  const router = useRouter();
  const ids = urlIds ?? compare;
  const { items: cmp, loading } = useListingsByIds(ids, initial);

  // Phones: the photos + titles header scrolls away like the rest; once it's gone a slim row (thumbnail + price per
  // home) pins under the site header instead (~60 px, not ~180). Zero-height sticky host → no layout jump.
  const fullHead = useRef<HTMLDivElement>(null);
  const pin = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    let raf = 0;
    const check = () => {
      raf = 0;
      const a = fullHead.current?.getBoundingClientRect();
      const b = pin.current?.getBoundingClientRect();
      if (a && b) setStuck(a.height > 0 && a.bottom < b.top - 1);
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(check);
    };
    check();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
    };
  }, [cmp.length]);

  const remove = (id: string) => {
    if (compare.includes(id)) toggleCompare(id);
    if (urlIds) {
      const rest = urlIds.filter((x) => x !== id);
      router.replace(`/${locale}/compare${rest.length ? `?ids=${rest.map(encodeURIComponent).join(",")}` : ""}`, { scroll: false });
    }
  };

  // A sale price, a monthly rent and a nightly rate are different units: only pick a "best" price among like units.
  const mixedOperation = cmp.some(isSale) && cmp.some((l) => !isSale(l));
  const sameUnit = new Set(cmp.map((l) => l.pricePeriod ?? "sale")).size <= 1;
  const unit = (l: Listing) => <span className="text-xs font-normal text-muted">{priceSuffix(l, locale)}</span>;
  const ppm = (l: Listing) => (l.areaM2 > 0 ? l.priceAmount / l.areaM2 : NaN);
  const allRows: Row[] = [
    { label: tx(locale, "Precio", "Price"), render: (l) => <span className="font-serif text-[17px] font-medium leading-tight md:text-[22px]"><span className="whitespace-nowrap md:hidden">{shortMoney(l.priceAmount, locale)}</span><span className="hidden md:inline">{money(l.priceAmount, locale)}</span><span className="whitespace-nowrap">{unit(l)}</span></span>, val: sameUnit ? (l) => l.priceAmount : undefined, best: "min" },
    // A rent per m² next to a sale per m² (or a nightly next to a monthly one) isn't comparable: "—" for the rents.
    { label: tx(locale, "Precio por m²", "Price per m²"), render: (l) => (Number.isFinite(ppm(l)) && (sameUnit || !l.pricePeriod) ? <>{num(Math.round(ppm(l) * (l.pricePeriod ? 10 : 1)) / (l.pricePeriod ? 10 : 1), locale)} USD/m²{unit(l)}</> : <span aria-label={tx(locale, "No comparable", "Not comparable")}>—</span>), val: sameUnit ? ppm : undefined, best: "min" },
    { label: "PlaceEstimate", render: (l) => <>{money(l.estimate.mid, locale)}{unit(l)}</> },
    {
      label: tx(locale, "Vs. estimación", "Vs. estimate"),
      render: (l) => {
        const d = ((l.priceAmount - l.estimate.mid) / l.estimate.mid) * 100;
        return <span className={cn("font-semibold", d <= 0 ? OK : WARN)}>{d > 0 ? "+" : ""}{d.toFixed(0)} %</span>;
      },
      val: (l) => (l.priceAmount - l.estimate.mid) / l.estimate.mid,
      best: "min",
    },
    { label: tx(locale, "Superficie", "Area"), render: (l) => `${num(l.areaM2, locale)} m²`, val: (l) => l.areaM2, best: "max" },
    { label: tx(locale, "Habitaciones", "Bedrooms"), render: (l) => l.beds, val: (l) => l.beds, best: "max" },
    { label: tx(locale, "Baños", "Baths"), render: (l) => l.baths, val: (l) => l.baths, best: "max" },
    { label: tx(locale, "Puestos", "Parking"), render: (l) => l.parking, val: (l) => l.parking, best: "max" },
    { label: tx(locale, "Año", "Year"), render: (l) => l.yearBuilt, val: (l) => l.yearBuilt, best: "max" },
    { label: tx(locale, "Zona", "Location"), render: (l) => `${l.zone}, ${l.city}` },
    { label: tx(locale, "Operación", "Type"), render: (l) => lbl(TYPE_LABEL[l.listingType], locale) },
    // Venezuelan essentials
    { label: tx(locale, "Planta eléctrica", "Backup generator"), render: (l) => (l.powerBackup === "FULL" ? "100 %" : l.powerBackup === "PARTIAL" ? tx(locale, "Parcial", "Partial") : l.powerBackup === "NONE" ? tx(locale, "No tiene", "None") : "—"), val: (l) => POWER_RANK[l.powerBackup ?? ""] ?? NaN, best: "max" },
    { label: tx(locale, "Pozo propio", "Own water well"), render: (l) => yes(l.ownWell, locale), val: (l) => (l.ownWell ? 1 : 0), best: "max" },
    { label: tx(locale, "Tanque de agua", "Water tank"), render: (l) => (l.waterTankLiters ? `${num(l.waterTankLiters, locale)} L` : "—"), val: (l) => l.waterTankLiters ?? 0, best: "max" },
    { label: tx(locale, "Muelle", "Private dock"), render: (l) => (l.dockFeet ? tx(locale, `${num(l.dockFeet, locale)} pies`, `${num(l.dockFeet, locale)} ft`) : "—"), show: (l) => !!l.dockFeet },
    { label: tx(locale, "Vista al Ávila", "Ávila view"), render: (l) => yes(l.viewAvila, locale), show: (l) => l.viewAvila },
    { label: tx(locale, "Vista al mar", "Sea view"), render: (l) => yes(l.viewSea, locale), show: (l) => l.viewSea },
    ...(["pool", "security", "gym", "elevator", "terrace"] as const).map((a): Row => ({ label: lbl(AMENITY_LABEL[a], locale), render: (l) => yes(l.amenities.includes(a), locale) })),
    { label: tx(locale, "Agencia", "Agency"), render: (l) => l.agency?.name ?? tx(locale, "Dueño directo", "By owner") },
    // Not a merit (a fresh listing isn't a better home): no "Mejor" pill on this row.
    { label: tx(locale, "Días publicado", "Days listed"), render: (l) => l.daysOnMarket },
  ];
  const rows = allRows.filter((r) => !r.show || cmp.some(r.show));
  // Per row: which column wins (green), only when the values differ.
  // Only the finite values take part: a home with no data for a row (NaN) neither wins nor wipes out the others' winner.
  const wins = rows.map(({ val, best }) => {
    const vals = val ? cmp.map(val) : [];
    const known = vals.filter(Number.isFinite);
    const target = known.length ? (best === "min" ? Math.min(...known) : Math.max(...known)) : null;
    return (i: number) => !!val && cmp.length > 1 && known.length > 1 && Number.isFinite(vals[i]) && vals[i] === target && new Set(known).size > 1;
  });
  // The winner of a row: green cell + a small "Mejor" pill (distinct from the ✓ of the yes/no rows).
  const bestMark = (cls: string) => (
    <span className={cn("inline-flex items-center whitespace-nowrap rounded-full bg-[#2F6B4F1F] px-1.5 py-px align-[2px] font-display text-[11px] font-semibold leading-4 text-ok dark:bg-[#8FCBA626] dark:text-[#8FCBA6]", cls)} data-compare-best>
      {tx(locale, "Mejor", "Best")}
    </span>
  );
  const cols = { gridTemplateColumns: `repeat(${Math.max(2, cmp.length)}, minmax(0, 1fr))` };
  const removeLabel = (title: string) => tx(locale, `Quitar «${title}» de la comparación`, `Remove “${title}” from the comparison`);
  const named = (title: string) => <span className="sr-only">{tx(locale, `: «${title}»`, `: “${title}”`)}</span>;
  const fichaName = (title: string) => tx(locale, `Ver ficha: «${title}»`, `View listing: “${title}”`);
  const visitName = (l: Listing, title: string) => `${visitText(l, locale)}${tx(locale, `: «${title}»`, `: “${title}”`)}`;

  return (
    <div className="mx-auto max-w-[1280px] px-4 pb-32 pt-10 md:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className={k.eyebrow}>{tx(locale, "Comparador", "Compare")}</div>
          <h1 className="mt-1 font-serif text-[40px] font-medium leading-[1.05] md:text-[48px]">{tx(locale, "Lado a lado", "Side by side")}</h1>
          <p className="mt-1 text-muted">{tx(locale, "Hasta 3 casas, con lo que de verdad importa. La mejor de cada fila lleva la marca «Mejor».", "Up to 3 homes, with what really matters. The best of each row gets a “Best” tag.")}</p>
        </div>
        {cmp.length > 0 && cmp.length < 3 && (
          <Button href={`/${locale}/search`} variant="outline" className={k.outline}>
            <Plus size={16} aria-hidden /> {tx(locale, "Añadir otra casa", "Add another home")}
          </Button>
        )}
      </div>

      {mixedOperation && (
        <div role="status" className="mt-6 flex items-start gap-3 rounded-[18px] bg-[#8A5A00]/10 px-4 py-3 text-[15px] text-[#5C3D00] dark:text-[#E9C77E]">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden />
          <p>
            <strong className="font-semibold">{tx(locale, "Estás comparando una venta con un alquiler.", "You’re comparing a sale with a rental.")}</strong>{" "}
            {tx(locale, "Un precio de venta y una renta no se miden igual, así que en precio no marcamos ganadora.", "A sale price and a rent aren’t measured the same way, so we don’t pick a winner on price.")}
          </p>
        </div>
      )}
      {!mixedOperation && !sameUnit && (
        <div role="status" className="mt-6 flex items-start gap-3 rounded-[18px] bg-[#8A5A00]/10 px-4 py-3 text-[15px] text-[#5C3D00] dark:text-[#E9C77E]">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden />
          <p>{tx(locale, "Estás comparando un alquiler por mes con uno por noche: en precio no marcamos ganadora.", "You’re comparing a monthly rent with a nightly one: we don’t pick a winner on price.")}</p>
        </div>
      )}

      {loading && cmp.length === 0 && <div className="np-skeleton mt-8 h-[420px] rounded-[18px]" aria-label={tx(locale, "Un momento…", "One moment…")} />}

      {cmp.length > 0 && (
        <section className={cn("np-in mt-8 overflow-clip", k.card)} aria-label={tx(locale, "Comparación", "Comparison")}>
          <div className="flex items-center gap-2 border-b border-line bg-navy px-5 py-3 text-ivory">
            <Scale size={18} strokeWidth={1.6} className="text-[#C9A574]" aria-hidden />
            <span className="font-serif text-[20px] font-medium">{tx(locale, `${cmp.length} ${cmp.length === 1 ? "casa" : "casas"}`, `${cmp.length} ${cmp.length === 1 ? "home" : "homes"}`)}</span>
            <span className="text-sm text-mist">{cmp.length}/3</span>
          </div>
          {/* Phones and small tablets: every home in view at once (a column each, 33–50 %), each row's label above its
              values, and the photos + titles pinned under the header while the rows scroll. */}
          <div className="md:hidden" data-compare-stack>
            <div ref={fullHead} className="grid gap-2 border-b border-line bg-white p-3 dark:bg-navy-card" style={cols}>
              {cmp.map((l) => {
                const title = tx(locale, l.title_es, l.title_en);
                return (
                  <div key={l.id} className="min-w-0">
                    <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-arena">
                      {/* The photo opens the listing too (the title below is the keyboard / screen-reader link). */}
                      <Link href={listingUrl(l, locale)} tabIndex={-1} aria-hidden className="block h-full w-full">
                        <PropertyArt scene={l.scenes[0]} seed={l.id} photo={listingPhoto(l, 0)} sizes="50vw" className="h-full w-full" />
                      </Link>
                      <button type="button" onClick={() => remove(l.id)} aria-label={removeLabel(title)} className={cn(REMOVE_BTN, "right-1 top-1 h-7 w-7 after:-inset-2")}>
                        <X size={13} aria-hidden />
                      </button>
                    </div>
                    <Link href={listingUrl(l, locale)} className="mt-1.5 line-clamp-2 block break-words font-serif text-[14px] font-medium leading-tight underline-offset-4 hover:underline">
                      {title}
                    </Link>
                  </div>
                );
              })}
            </div>
            {/* The slim pinned row: per home a compact price, then its thumbnail (opens the listing) and a "Visita" pill. Price and
                thumbnail repeat the header above (hidden from assistive tech); the actions are real links, only reachable
                while the row is shown (`invisible` otherwise). */}
            <div ref={pin} className="sticky top-[calc(env(safe-area-inset-top)+var(--np-header-offset,80px)_-_8px)] z-[2] h-0 transition-[top] duration-300 ease-[cubic-bezier(.2,.7,.2,1)]">
              <div
                data-compare-pinned={stuck ? "on" : "off"}
                className={cn(
                  "absolute inset-x-0 top-0 grid gap-2 border-b border-line bg-white/95 px-3 py-2 shadow-[0_8px_18px_-12px_rgba(30,26,24,.35)] backdrop-blur transition-[opacity,transform] duration-200 dark:bg-navy-card",
                  stuck ? "opacity-100" : "pointer-events-none invisible -translate-y-1 opacity-0",
                )}
                style={cols}
              >
                {cmp.map((l) => {
                  const title = tx(locale, l.title_es, l.title_en);
                  return (
                    <div key={l.id} className="min-w-0">
                      <div aria-hidden className="np-num truncate whitespace-nowrap text-[13px] leading-tight">{shortPrice(l, locale)}</div>
                      <div className="mt-1 flex items-center gap-1">
                        <Link href={listingUrl(l, locale)} aria-label={fichaName(title)} title={tx(locale, "Ver ficha", "View listing")} className="relative h-9 w-9 shrink-0 overflow-hidden rounded-md bg-arena ring-1 ring-navy/20 dark:ring-ivory/25">
                          <PropertyArt scene={l.scenes[0]} seed={l.id} photo={listingPhoto(l, 0)} sizes="36px" className="h-full w-full" />
                        </Link>
                        <Link href={contactUrl(l, locale)} aria-label={visitName(l, title)} className={cn(PIN_PILL, "np-btn-navy bg-navy text-ivory")}>
                          {pillText(l, locale)}
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <dl>
              {rows.map(({ label, render }, r) => (
                <div key={label} className="border-t border-line px-3 py-2.5 first:border-t-0">
                  <dt className="text-[13px] font-semibold text-muted">{label}</dt>
                  <dd className="mt-1 grid gap-2" style={cols}>
                    {cmp.map((l, i) => (
                      <span key={l.id} className={cn("min-w-0 break-words rounded-md px-1.5 py-1 text-[14px] leading-snug", wins[r](i) && "bg-[#2F6B4F14] dark:bg-[#8FCBA61A]")}>
                        {render(l)} {wins[r](i) && bestMark("ml-0.5")}
                      </span>
                    ))}
                  </dd>
                </div>
              ))}
            </dl>
            {/* The way out: each home's listing and its contact card (no dead end after comparing). */}
            <div className="grid gap-2 border-t border-line px-3 py-3" style={cols} data-compare-actions>
              {cmp.map((l) => {
                const title = tx(locale, l.title_es, l.title_en);
                return (
                  <div key={l.id} className="flex min-w-0 flex-col gap-2">
                    <Link href={listingUrl(l, locale)} aria-label={fichaName(title)} className={cn(STACK_BTN, "np-btn-outline border-[1.5px] border-navy text-navy", k.outline)}>
                      {tx(locale, "Ver ficha", "View listing")}{named(title)}
                    </Link>
                    <Link href={contactUrl(l, locale)} aria-label={visitName(l, title)} className={cn(STACK_BTN, "np-btn-navy bg-navy text-ivory")}>
                      {visitText(l, locale)}{named(title)}
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
          {/* md and up: a table, every home's column the same width. */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full table-fixed text-sm" style={{ minWidth: `${9 + cmp.length * 11.5}rem` }}>
              <colgroup>
                <col className="w-36 lg:w-48" />
                {cmp.map((l) => <col key={l.id} />)}
              </colgroup>
              <thead>
                <tr>
                  <th className={cn("sticky left-0 z-[1]", k.stickyCol)}>
                    <span className="sr-only">{tx(locale, "Característica", "Feature")}</span>
                  </th>
                  {cmp.map((l) => {
                    const title = tx(locale, l.title_es, l.title_en);
                    return (
                      <th key={l.id} scope="col" className="p-4 text-left align-top font-normal">
                        {/* 16:10 and capped, so two homes side by side at 1024 don't fill the screen with photo */}
                        <div className="relative aspect-[16/10] max-h-[240px] w-full overflow-hidden rounded-lg bg-arena">
                          <Link href={listingUrl(l, locale)} tabIndex={-1} aria-hidden className="block h-full w-full">
                            <PropertyArt scene={l.scenes[0]} seed={l.id} photo={listingPhoto(l, 0)} sizes="(max-width: 1280px) 30vw, 380px" className="h-full w-full" />
                          </Link>
                          <button type="button" onClick={() => remove(l.id)} aria-label={removeLabel(title)} className={cn(REMOVE_BTN, "right-2 top-2 h-8 w-8 after:-inset-1.5")}>
                            <X size={14} aria-hidden />
                          </button>
                        </div>
                        <Link href={listingUrl(l, locale)} className="mt-2 line-clamp-2 block font-serif text-[19px] font-medium leading-tight underline-offset-4 hover:underline">
                          {title}
                        </Link>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {rows.map(({ label, render }, r) => (
                  <tr key={label} className="border-t border-line">
                    <td className={cn("sticky left-0 z-[1] px-4 py-2.5 font-semibold text-muted", k.stickyCol)}>{label}</td>
                    {cmp.map((l, i) => (
                      <td key={l.id} className={cn("break-words px-4 py-2.5", wins[r](i) && "bg-[#2F6B4F0F] dark:bg-[#8FCBA614]")}>
                        {render(l)} {wins[r](i) && bestMark("ml-1")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-line" data-compare-actions>
                  <td className={cn("sticky left-0 z-[1] px-4 py-4 font-semibold text-muted", k.stickyCol)}>{tx(locale, "Siguiente paso", "Next step")}</td>
                  {cmp.map((l) => {
                    const title = tx(locale, l.title_es, l.title_en);
                    return (
                      <td key={l.id} className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          <Button href={listingUrl(l, locale)} aria-label={fichaName(title)} variant="outline" size="sm" className={k.outline}>
                            <FileText size={15} aria-hidden /> {tx(locale, "Ver ficha", "View listing")}{named(title)}
                          </Button>
                          <Button href={contactUrl(l, locale)} aria-label={visitName(l, title)} variant="navy" size="sm">
                            <CalendarCheck size={15} aria-hidden /> {visitText(l, locale)}{named(title)}
                          </Button>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      )}

      {!loading && cmp.length === 0 && (
        <Empty
          title={tx(locale, "Todavía no eliges casas para comparar", "No homes to compare yet")}
          body={tx(locale, "Toca «Comparar» en hasta 3 casas y aquí las verás lado a lado. No necesitas cuenta.", "Tap “Compare” on up to 3 homes and you’ll see them side by side here. No account needed.")}
          cta={<Button href={`/${locale}/search`} variant="outline" className={k.outline}>{tx(locale, "Explorar casas", "Explore homes")}</Button>}
        />
      )}
    </div>
  );
}

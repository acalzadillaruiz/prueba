"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, Minus, Plus, Scale, X } from "lucide-react";
import type { Listing, Locale } from "@/types/domain";
import { PropertyArt } from "@/components/art/PropertyArt";
import { Button } from "@/components/ui";
import { Empty, k } from "@/components/agency/kit";
import { useApp } from "@/lib/store";
import { listingPhoto } from "@/lib/photos";
import { AMENITY_LABEL, TYPE_LABEL, lbl, money, num, priceSuffix, tx } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { useListingsByIds } from "./useListingsByIds";

const isSale = (l: Listing) => l.listingType === "SALE" || l.listingType === "COMMERCIAL_SALE";
const yes = (on: boolean, locale: Locale) => (on ? <Check size={16} className="text-ok" aria-label={tx(locale, "Sí", "Yes")} /> : <Minus size={16} className="text-muted" aria-label={tx(locale, "No", "No")} />);

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
    { label: tx(locale, "Precio", "Price"), render: (l) => <span className="font-serif text-[22px] font-medium leading-tight">{money(l.priceAmount, locale)}{unit(l)}</span>, val: sameUnit ? (l) => l.priceAmount : undefined, best: "min" },
    { label: tx(locale, "Precio por m²", "Price per m²"), render: (l) => (Number.isFinite(ppm(l)) ? <>{num(Math.round(ppm(l) * (l.pricePeriod ? 10 : 1)) / (l.pricePeriod ? 10 : 1), locale)} USD/m²{unit(l)}</> : "—"), val: sameUnit ? ppm : undefined, best: "min" },
    { label: "PlaceEstimate", render: (l) => <>{money(l.estimate.mid, locale)}{unit(l)}</> },
    {
      label: tx(locale, "Vs. estimación", "Vs. estimate"),
      render: (l) => {
        const d = ((l.priceAmount - l.estimate.mid) / l.estimate.mid) * 100;
        return <span className={d <= 0 ? "font-semibold text-ok" : "font-semibold text-warn"}>{d > 0 ? "+" : ""}{d.toFixed(0)} %</span>;
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
    { label: tx(locale, "Planta eléctrica", "Backup generator"), render: (l) => (l.powerBackup === "FULL" ? "100 %" : l.powerBackup === "PARTIAL" ? tx(locale, "Parcial", "Partial") : l.powerBackup === "NONE" ? tx(locale, "No tiene", "None") : "—") },
    { label: tx(locale, "Pozo propio", "Own water well"), render: (l) => yes(l.ownWell, locale) },
    { label: tx(locale, "Tanque de agua", "Water tank"), render: (l) => (l.waterTankLiters ? `${num(l.waterTankLiters, locale)} L` : "—"), val: (l) => l.waterTankLiters ?? 0, best: "max" },
    { label: tx(locale, "Muelle", "Private dock"), render: (l) => (l.dockFeet ? tx(locale, `${num(l.dockFeet, locale)} pies`, `${num(l.dockFeet, locale)} ft`) : "—"), show: (l) => !!l.dockFeet },
    { label: tx(locale, "Vista al Ávila", "Ávila view"), render: (l) => yes(l.viewAvila, locale), show: (l) => l.viewAvila },
    { label: tx(locale, "Vista al mar", "Sea view"), render: (l) => yes(l.viewSea, locale), show: (l) => l.viewSea },
    ...(["pool", "security", "gym", "elevator", "terrace"] as const).map((a): Row => ({ label: lbl(AMENITY_LABEL[a], locale), render: (l) => yes(l.amenities.includes(a), locale) })),
    { label: tx(locale, "Agencia", "Agency"), render: (l) => l.agency?.name ?? tx(locale, "Dueño directo", "By owner") },
    { label: tx(locale, "Días publicado", "Days listed"), render: (l) => l.daysOnMarket, val: (l) => l.daysOnMarket, best: "min" },
  ];
  const rows = allRows.filter((r) => !r.show || cmp.some(r.show));

  return (
    <div className="mx-auto max-w-[1280px] px-4 pb-32 pt-10 md:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className={k.eyebrow}>{tx(locale, "Comparador", "Compare")}</div>
          <h1 className="mt-1 font-serif text-[40px] font-medium leading-[1.05] md:text-[48px]">{tx(locale, "Lado a lado", "Side by side")}</h1>
          <p className="mt-1 text-muted">{tx(locale, "Hasta 3 casas, con lo que de verdad importa. Marcamos en verde la mejor de cada fila.", "Up to 3 homes, with what really matters. The best of each row is marked in green.")}</p>
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
        <section className={cn("np-in mt-8 overflow-hidden", k.card)} aria-label={tx(locale, "Comparación", "Comparison")}>
          <div className="flex items-center gap-2 border-b border-line bg-navy px-5 py-3 text-ivory">
            <Scale size={18} strokeWidth={1.6} className="text-[#C9A574]" aria-hidden />
            <span className="font-serif text-[20px] font-medium">{tx(locale, `${cmp.length} ${cmp.length === 1 ? "casa" : "casas"}`, `${cmp.length} ${cmp.length === 1 ? "home" : "homes"}`)}</span>
            <span className="text-sm text-mist">{cmp.length}/3</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: `${9 + cmp.length * 13}rem` }}>
              <thead>
                <tr>
                  <th className={cn("sticky left-0 z-[1] w-36", k.stickyCol)}>
                    <span className="sr-only">{tx(locale, "Característica", "Feature")}</span>
                  </th>
                  {cmp.map((l) => {
                    const title = tx(locale, l.title_es, l.title_en);
                    return (
                      <th key={l.id} scope="col" className="p-4 text-left align-top font-normal">
                        <div className="relative">
                          <PropertyArt scene={l.scenes[0]} seed={l.id} photo={listingPhoto(l, 0)} sizes="(max-width: 768px) 60vw, 25vw" className="aspect-[4/3] w-full overflow-hidden rounded-lg" />
                          <button type="button" onClick={() => remove(l.id)} aria-label={tx(locale, `Quitar «${title}» de la comparación`, `Remove “${title}” from the comparison`)} className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow after:absolute after:-inset-1.5 after:content-['']">
                            <X size={14} aria-hidden />
                          </button>
                        </div>
                        <Link href={`/${locale}/listing/${l.slug}`} className="mt-2 line-clamp-2 block font-serif text-[19px] font-medium leading-tight underline-offset-4 hover:underline">
                          {title}
                        </Link>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {rows.map(({ label, render, val, best }) => {
                  const vals = val ? cmp.map(val) : [];
                  const target = val ? (best === "min" ? Math.min(...vals) : Math.max(...vals)) : null;
                  const win = (i: number) => !!val && cmp.length > 1 && Number.isFinite(vals[i]) && vals[i] === target && new Set(vals).size > 1;
                  return (
                    <tr key={label} className="border-t border-line">
                      <td className={cn("sticky left-0 z-[1] px-4 py-2.5 font-semibold text-muted", k.stickyCol)}>{label}</td>
                      {cmp.map((l, i) => (
                        <td key={l.id} className={cn("px-4 py-2.5", win(i) && "bg-[#2F6B4F0F]")}>
                          {render(l)} {win(i) && <Check size={13} className="ml-1 inline text-ok" aria-label={tx(locale, "La mejor", "Best")} />}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
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

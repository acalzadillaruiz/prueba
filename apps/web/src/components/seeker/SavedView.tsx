"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Check, Minus, Scale, X } from "lucide-react";
import type { Listing, Locale } from "@/types/domain";
import { ListingCard } from "@/components/listing/ListingCard";
import { listingPhoto } from "@/lib/photos";
import { PropertyArt } from "@/components/art/PropertyArt";
import { Button } from "@/components/ui";
import { useQuery } from "@tanstack/react-query";
import { useApp } from "@/lib/store";
import { Empty, k } from "@/components/agency/kit";
import { api } from "@/lib/api";
import { AMENITY_LABEL, TYPE_LABEL, lbl, money, num, priceSuffix, tx } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { storeSavedOffline } from "@/lib/offline-saved";

export function SavedView({ locale, all }: { locale: Locale; all: Listing[] }) {
  const { saved, compare, toggleCompare } = useApp();
  const items = saved.map((id) => all.find((l) => l.id === id)).filter(Boolean) as Listing[];
  // Keep a light copy on the device so "Guardados" works offline (the offline screen lists them).
  useEffect(() => {
    storeSavedOffline(items.map((l) => ({ slug: l.slug, title_es: l.title_es, title_en: l.title_en, price: `${money(l.priceAmount, "es")}${priceSuffix(l, "es")}`, price_en: `${money(l.priceAmount, "en")}${priceSuffix(l, "en")}`, zone: l.zone, city: l.city })));
  }, [items]);
  // Compared listings don't have to be saved: fetch the ones we don't already have.
  const missing = compare.filter((id) => !all.some((l) => l.id === id));
  const extra = useQuery({ queryKey: ["compare", missing.join(",")], queryFn: () => api<{ items: Listing[] }>(`listings?ids=${missing.join(",")}`), enabled: missing.length > 0 });
  const pool = [...all, ...(extra.data?.items ?? [])];
  const cmp = compare.map((id) => pool.find((l) => l.id === id)).filter(Boolean) as Listing[];
  // A sale price, a monthly rent and a nightly rate are different units: only pick a "best" price among like units.
  const sameUnit = new Set(cmp.map((l) => l.pricePeriod ?? "sale")).size <= 1;
  const unit = (l: Listing) => <span className="text-xs font-normal text-muted">{priceSuffix(l, locale)}</span>;
  const ppm = (l: Listing) => (l.areaM2 > 0 ? l.priceAmount / l.areaM2 : NaN);
  const rows: [string, (l: Listing) => React.ReactNode, ((l: Listing) => number)?, ("min" | "max")?][] = [
    [tx(locale, "Precio", "Price"), (l) => <span className="font-serif text-[24px] font-medium leading-tight">{money(l.priceAmount, locale)}{unit(l)}</span>, sameUnit ? (l) => l.priceAmount : undefined, "min"],
    ["PlaceEstimate", (l) => <>{money(l.estimate.mid, locale)}{unit(l)}</>],
    [tx(locale, "Vs. estimación", "Vs. estimate"), (l) => { const d = ((l.priceAmount - l.estimate.mid) / l.estimate.mid) * 100; return <span className={d <= 0 ? "font-semibold text-ok" : "font-semibold text-warn"}>{d > 0 ? "+" : ""}{d.toFixed(0)} %</span>; }, (l) => (l.priceAmount - l.estimate.mid) / l.estimate.mid, "min"],
    [tx(locale, "Precio por m²", "Price per m²"), (l) => (Number.isFinite(ppm(l)) ? <>{num(Math.round(ppm(l) * (l.pricePeriod ? 10 : 1)) / (l.pricePeriod ? 10 : 1), locale)} USD/m²{unit(l)}</> : "—"), sameUnit ? ppm : undefined, "min"],
    [tx(locale, "Superficie", "Area"), (l) => `${num(l.areaM2, locale)} m²`, (l) => l.areaM2, "max"],
    [tx(locale, "Habitaciones", "Bedrooms"), (l) => l.beds, (l) => l.beds, "max"],
    [tx(locale, "Baños", "Baths"), (l) => l.baths, (l) => l.baths, "max"],
    [tx(locale, "Puestos", "Parking"), (l) => l.parking, (l) => l.parking, "max"],
    [tx(locale, "Año", "Year"), (l) => l.yearBuilt, (l) => l.yearBuilt, "max"],
    [tx(locale, "Zona", "Location"), (l) => `${l.zone}, ${l.city}`],
    [tx(locale, "Operación", "Type"), (l) => lbl(TYPE_LABEL[l.listingType], locale)],
    [tx(locale, "Agencia", "Agency"), (l) => l.agency?.name ?? tx(locale, "Dueño directo", "By owner")],
    [tx(locale, "Días publicado", "Days listed"), (l) => l.daysOnMarket, (l) => l.daysOnMarket, "min"],
  ];
  const keyAmen = ["generator", "waterTank", "pool", "security", "gym", "elevator", "terrace", "view"] as const;
  return (
    <div className="mx-auto max-w-[1280px] px-4 py-10 md:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className={k.eyebrow}>{tx(locale, "Su colección privada", "Your private collection")}</div>
          <h1 className="mt-1 font-serif text-[40px] font-medium leading-[1.05] md:text-[48px]">{tx(locale, "Guardados", "Saved homes")}</h1>
          <p className="mt-1 text-muted">{tx(locale, `${items.length} inmuebles · selecciona hasta 3 para comparar`, `${items.length} homes · pick up to 3 to compare`)}</p>
        </div>
        <Button href={`/${locale}/alerts`} variant="outline" className={k.outline}>{tx(locale, "Mis alertas", "My alerts")}</Button>
      </div>

      {cmp.length > 0 && (
        <section className={cn("np-in mt-8 overflow-hidden", k.card)}>
          <div className="flex items-center gap-2 border-b border-line bg-navy px-5 py-3 text-ivory">
            <Scale size={18} strokeWidth={1.6} className="text-[#E79A7F]" />
            <span className="font-serif text-[22px] font-medium">{tx(locale, "Comparador", "Compare")}</span>
            <span className="text-sm text-mist">{cmp.length}/3</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr>
                  <th className="w-44" />
                  {cmp.map((l) => (
                    <th key={l.id} className="p-4 text-left align-top font-normal">
                      <div className="relative">
                        <PropertyArt scene={l.scenes[0]} seed={l.id} photo={listingPhoto(l, 0)} className="aspect-[4/3] w-full rounded-lg" />
                        <button onClick={() => toggleCompare(l.id)} className="absolute right-2 top-2 rounded-full bg-white p-1 shadow"><X size={14} /></button>
                      </div>
                      <Link href={`/${locale}/listing/${l.slug}`} className="mt-2 line-clamp-2 block font-serif text-[20px] font-medium leading-tight underline-offset-4 hover:underline">{tx(locale, l.title_es, l.title_en)}</Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(([label, render, val, best]) => {
                  const vals = val ? cmp.map(val) : [];
                  const target = val ? (best === "min" ? Math.min(...vals) : Math.max(...vals)) : null;
                  return (
                    <tr key={label} className="border-t border-line">
                      <td className="px-4 py-2.5 font-semibold text-muted">{label}</td>
                      {cmp.map((l, i) => (
                        <td key={l.id} className={cn("px-4 py-2.5", val && cmp.length > 1 && vals[i] === target && "bg-[#2F6B4F0F]")}>
                          {render(l)} {val && cmp.length > 1 && vals[i] === target && <Check size={13} className="ml-1 inline text-ok" />}
                        </td>
                      ))}
                    </tr>
                  );
                })}
                {keyAmen.map((a) => (
                  <tr key={a} className="border-t border-line">
                    <td className="px-4 py-2 text-muted">{lbl(AMENITY_LABEL[a], locale)}</td>
                    {cmp.map((l) => (
                      <td key={l.id} className="px-4 py-2">{l.amenities.includes(a) ? <Check size={16} className="text-ok" /> : <Minus size={16} className="text-muted" aria-label={tx(locale, "No", "No")} />}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((l) => (
          <ListingCard key={l.id} l={l} locale={locale} showCompare />
        ))}
      </div>
      {items.length === 0 && (
        <Empty title={tx(locale, "Aún no guardas nada", "Nothing saved yet")} body={tx(locale, "Toca el corazón en cualquier inmueble para tenerlo aquí, incluso sin conexión.", "Tap the heart on any listing to keep it here — even offline.")} cta={<Button href={`/${locale}/search`} variant="outline" className={k.outline}>{tx(locale, "Explorar el mapa", "Explore the map")}</Button>} />
      )}
    </div>
  );
}

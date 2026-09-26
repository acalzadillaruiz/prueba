"use client";

import Link from "next/link";
import { Check, Heart, Minus, Scale, X } from "lucide-react";
import type { Listing, Locale } from "@/types/domain";
import { ListingCard } from "@/components/listing/ListingCard";
import { listingPhoto } from "@/lib/photos";
import { PropertyArt } from "@/components/art/PropertyArt";
import { Button, EmptyState } from "@/components/ui";
import { useDemo } from "@/lib/store";
import { AMENITY_LABEL, TYPE_LABEL, lbl, money, num, priceSuffix, tx } from "@/lib/i18n";
import { agencyById } from "@/mock/people";
import { cn } from "@/lib/cn";

export function SavedView({ locale, all }: { locale: Locale; all: Listing[] }) {
  const { saved, compare, toggleCompare } = useDemo();
  const items = saved.map((id) => all.find((l) => l.id === id)).filter(Boolean) as Listing[];
  const cmp = compare.map((id) => all.find((l) => l.id === id)).filter(Boolean) as Listing[];
  const rows: [string, (l: Listing) => React.ReactNode, ((l: Listing) => number)?, ("min" | "max")?][] = [
    [tx(locale, "Precio", "Price"), (l) => <span className="font-display text-lg font-semibold">{money(l.priceAmount, locale)}<span className="text-xs font-normal text-ink/50">{priceSuffix(l, locale)}</span></span>, (l) => l.priceAmount, "min"],
    ["PlaceEstimate", (l) => money(l.estimate.mid, locale)],
    [tx(locale, "Vs. estimación", "Vs. estimate"), (l) => { const d = ((l.priceAmount - l.estimate.mid) / l.estimate.mid) * 100; return <span className={d <= 0 ? "font-semibold text-ok" : "font-semibold text-warn"}>{d > 0 ? "+" : ""}{d.toFixed(0)} %</span>; }, (l) => (l.priceAmount - l.estimate.mid) / l.estimate.mid, "min"],
    ["USD/m²", (l) => num(Math.round(l.priceAmount / l.areaM2), locale), (l) => l.priceAmount / l.areaM2, "min"],
    [tx(locale, "Superficie", "Area"), (l) => `${num(l.areaM2, locale)} m²`, (l) => l.areaM2, "max"],
    [tx(locale, "Habitaciones", "Bedrooms"), (l) => l.beds, (l) => l.beds, "max"],
    [tx(locale, "Baños", "Baths"), (l) => l.baths, (l) => l.baths, "max"],
    [tx(locale, "Puestos", "Parking"), (l) => l.parking, (l) => l.parking, "max"],
    [tx(locale, "Año", "Year"), (l) => l.yearBuilt, (l) => l.yearBuilt, "max"],
    [tx(locale, "Zona", "Area"), (l) => `${l.zone}, ${l.city}`],
    [tx(locale, "Operación", "Type"), (l) => lbl(TYPE_LABEL[l.listingType], locale)],
    [tx(locale, "Agencia", "Agency"), (l) => agencyById(l.agencyId)?.name ?? tx(locale, "Dueño directo", "By owner")],
    [tx(locale, "Días publicado", "Days listed"), (l) => l.daysOnMarket, (l) => l.daysOnMarket, "min"],
  ];
  const keyAmen = ["generator", "waterTank", "pool", "security", "gym", "elevator", "terrace", "view"] as const;
  return (
    <div className="mx-auto max-w-[1280px] px-4 py-10 md:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">{tx(locale, "Guardados", "Saved homes")}</h1>
          <p className="mt-1 text-ink/60">{tx(locale, `${items.length} inmuebles · selecciona hasta 3 para comparar`, `${items.length} homes · pick up to 3 to compare`)}</p>
        </div>
        <Button href={`/${locale}/alerts`} variant="outline">{tx(locale, "Mis alertas", "My alerts")}</Button>
      </div>

      {cmp.length > 0 && (
        <section className="np-in mt-8 overflow-hidden rounded-np border border-line bg-white shadow-np">
          <div className="flex items-center gap-2 border-b border-line bg-navy px-5 py-3 text-ivory">
            <Scale size={18} className="text-coral" />
            <span className="font-display font-semibold">{tx(locale, "Comparador", "Compare")}</span>
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
                        <PropertyArt scene={l.scenes[0]} seed={l.id} photo={listingPhoto(l.id, 0)} className="aspect-[4/3] w-full rounded-lg" />
                        <button onClick={() => toggleCompare(l.id)} className="absolute right-2 top-2 rounded-full bg-white p-1 shadow"><X size={14} /></button>
                      </div>
                      <Link href={`/${locale}/listing/${l.slug}`} className="mt-2 line-clamp-2 block font-display font-semibold hover:text-coral">{tx(locale, l.title_es, l.title_en)}</Link>
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
                      <td className="px-4 py-2.5 font-semibold text-ink/60">{label}</td>
                      {cmp.map((l, i) => (
                        <td key={l.id} className={cn("px-4 py-2.5", val && cmp.length > 1 && vals[i] === target && "bg-[#2F6F4E0F]")}>
                          {render(l)} {val && cmp.length > 1 && vals[i] === target && <Check size={13} className="ml-1 inline text-ok" />}
                        </td>
                      ))}
                    </tr>
                  );
                })}
                {keyAmen.map((a) => (
                  <tr key={a} className="border-t border-line">
                    <td className="px-4 py-2 text-ink/60">{lbl(AMENITY_LABEL[a], locale)}</td>
                    {cmp.map((l) => (
                      <td key={l.id} className="px-4 py-2">{l.amenities.includes(a) ? <Check size={16} className="text-ok" /> : <Minus size={16} className="text-ink/25" />}</td>
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
        <EmptyState icon={<Heart size={20} />} title={tx(locale, "Aún no guardas nada", "Nothing saved yet")} body={tx(locale, "Toca el corazón en cualquier inmueble para tenerlo aquí, incluso sin conexión.", "Tap the heart on any listing to keep it here — even offline.")} cta={<Button href={`/${locale}/search`}>{tx(locale, "Explorar el mapa", "Explore the map")}</Button>} />
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { Check, Eye, GripVertical, ImagePlus, Loader2, Save, Sparkles, Star, X } from "lucide-react";
import { heuristicWriteListing } from "@newplace/ai";
import type { Listing, ListingStatus, Locale } from "@/types/domain";
import { AdminShell } from "@/components/layout/AdminShell";
import { listingPhoto } from "@/lib/photos";
import { PropertyArt } from "@/components/art/PropertyArt";
import { EstimateCard } from "@/components/detail/Estimate";
import { PriceHistory } from "@/components/detail/Bits";
import { Button, Field, darkInputCls } from "@/components/ui";
import { AMENITY_LABEL, STATUS_LABEL, lbl, money, num, tx } from "@/lib/i18n";
import { agencyById } from "@/mock/people";
import { cn } from "@/lib/cn";

const STATUSES: ListingStatus[] = ["DRAFT", "COMING_SOON", "ACTIVE", "UNDER_OFFER", "SOLD", "RENTED", "WITHDRAWN", "EXPIRED"];

export function ListingEditor({ l, locale }: { l: Listing; locale: Locale }) {
  const [lang, setLang] = useState<Locale>("es");
  const [copy, setCopy] = useState({ title_es: l.title_es, title_en: l.title_en, body_es: l.body_es, body_en: l.body_en });
  const [writing, setWriting] = useState(false);
  const [status, setStatus] = useState<ListingStatus>(l.status);
  const [price, setPrice] = useState(l.priceAmount);
  const [cover, setCover] = useState(0);
  const [saved, setSaved] = useState(false);
  const agency = agencyById(l.agencyId) ?? agencyById("ag-andes")!;
  const commission = (price * agency.commissionPct) / 100;
  const checks: [boolean, string, number][] = [
    [l.scenes.length >= 8, tx(locale, `Fotos ≥ 8 (${l.scenes.length})`, `Photos ≥ 8 (${l.scenes.length})`), 35],
    [!!copy.title_en && !!copy.body_en, tx(locale, "Bilingüe ES/EN", "Bilingual ES/EN"), 20],
    [true, tx(locale, "Geolocalizado", "Geolocated"), 20],
    [l.hasFloorplan, tx(locale, "Plano", "Floor plan"), 15],
    [l.hasVirtualTour, tx(locale, "Tour virtual", "Virtual tour"), 10],
  ];
  const quality = checks.reduce((s, [ok, , pts]) => s + (ok ? pts : 0), 0);
  const section = "rounded-np border border-navy-line bg-navy-card p-5";
  return (
    <AdminShell
      locale={locale}
      area="agency"
      title={tx(locale, "Editar inmueble", "Edit listing")}
      actions={
        <div className="flex gap-2">
          <Button size="sm" variant="dark-outline" href={`/${locale}/listing/${l.slug}`}><Eye size={14} /> {tx(locale, "Ver ficha", "View")}</Button>
          <Button size="sm" onClick={() => setSaved(true)}>{saved ? <Check size={14} /> : <Save size={14} />} {saved ? tx(locale, "Guardado", "Saved") : tx(locale, "Guardar", "Save")}</Button>
        </div>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="space-y-6">
          <div className={section}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-display text-lg font-semibold">{tx(locale, "Texto de la ficha", "Listing copy")}</span>
                {(["es", "en"] as Locale[]).map((x) => (
                  <button key={x} onClick={() => setLang(x)} className={cn("rounded-full px-2.5 py-0.5 text-xs font-bold", lang === x ? "bg-ivory text-navy" : "bg-white/10 text-mist")}>{x.toUpperCase()}</button>
                ))}
              </div>
              <Button size="sm" variant="dark-outline" onClick={() => { setWriting(true); setTimeout(() => { setCopy(heuristicWriteListing({ kind: l.kind, zone: l.zone, city: l.city, areaM2: l.areaM2, beds: l.beds, baths: l.baths, parking: l.parking, amenities: l.amenities, highlights: tx(locale, l.body_es.split(". ")[1] ?? "", l.body_en.split(". ")[1] ?? "") })); setWriting(false); }, 800); }}>
                {writing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} className="text-coral" />} {tx(locale, "Redactar con IA", "Write with AI")}
              </Button>
            </div>
            <Field dark label={tx(locale, "Título", "Title")}><input className={darkInputCls} value={lang === "es" ? copy.title_es : copy.title_en} onChange={(e) => setCopy({ ...copy, [lang === "es" ? "title_es" : "title_en"]: e.target.value })} /></Field>
            <div className="mt-3"><Field dark label={tx(locale, "Descripción", "Description")}><textarea className={cn(darkInputCls, "h-28 py-2")} value={lang === "es" ? copy.body_es : copy.body_en} onChange={(e) => setCopy({ ...copy, [lang === "es" ? "body_es" : "body_en"]: e.target.value })} /></Field></div>
          </div>

          <div className={section}>
            <div className="mb-4 font-display text-lg font-semibold">{tx(locale, "Precio y estado", "Price & status")}</div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field dark label={tx(locale, "Precio (USD)", "Price (USD)")}><input className={darkInputCls} type="number" value={price} onChange={(e) => setPrice(+e.target.value)} /></Field>
              <Field dark label={tx(locale, "Estado", "Status")}>
                <select className={darkInputCls} value={status} onChange={(e) => setStatus(e.target.value as ListingStatus)}>
                  {STATUSES.map((s) => <option key={s} value={s}>{s} · {lbl(STATUS_LABEL[s], locale)}</option>)}
                </select>
              </Field>
              <Field dark label={tx(locale, "Visibilidad", "Visibility")}>
                <select className={darkInputCls} defaultValue={l.privateListing ? "private" : "public"}><option value="public">{tx(locale, "Pública", "Public")}</option><option value="private">{tx(locale, "Privada (solo enlace)", "Private (link only)")}</option></select>
              </Field>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              {[[tx(locale, "Habitaciones", "Beds"), l.beds], [tx(locale, "Baños", "Baths"), l.baths], ["m²", l.areaM2], [tx(locale, "Puestos", "Parking"), l.parking]].map(([t, v]) => (
                <Field dark key={String(t)} label={String(t)}><input className={darkInputCls} defaultValue={v} /></Field>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {l.amenities.map((a) => <span key={a} className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">{lbl(AMENITY_LABEL[a], locale)}</span>)}
            </div>
          </div>

          <div className={section}>
            <div className="mb-4 flex items-center justify-between">
              <span className="font-display text-lg font-semibold">{tx(locale, "Fotos", "Photos")} · {l.scenes.length}</span>
              <Button size="sm" variant="dark-outline"><ImagePlus size={14} /> {tx(locale, "Subir", "Upload")}</Button>
            </div>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
              {l.scenes.map((s, i) => (
                <div key={i} className={cn("group relative overflow-hidden rounded-lg ring-2", cover === i ? "ring-coral" : "ring-transparent")}>
                  <PropertyArt scene={s} seed={i === 0 ? l.id : l.id + (i - 1)} photo={listingPhoto(l, i)} className="aspect-[4/3] w-full" />
                  <GripVertical size={14} className="absolute left-1 top-1 text-white drop-shadow" />
                  <button className="absolute right-1 top-1 rounded-full bg-navy/70 p-0.5 opacity-0 group-hover:opacity-100"><X size={12} /></button>
                  {cover === i ? <span className="absolute bottom-1 left-1 rounded-full bg-coral px-1.5 text-[10px] font-bold text-white"><Star size={9} className="inline" /> {tx(locale, "Portada", "Cover")}</span> : <button onClick={() => setCover(i)} className="absolute bottom-1 left-1 rounded-full bg-white/90 px-1.5 text-[10px] font-bold text-navy opacity-0 group-hover:opacity-100">{tx(locale, "Portada", "Cover")}</button>}
                </div>
              ))}
            </div>
          </div>

          <div className={section}>
            <div className="mb-3 font-display text-lg font-semibold">{tx(locale, "Historial de precio", "Price history")}</div>
            <PriceHistory events={l.priceHistory} locale={locale} dark />
          </div>
        </div>

        <div className="space-y-6">
          <div className={section}>
            <div className="flex items-center justify-between">
              <span className="font-display text-lg font-semibold">{tx(locale, "Calidad de ficha", "Listing quality")}</span>
              <span className={cn("font-display text-3xl font-semibold", quality >= 85 ? "text-[#7FD3A8]" : "text-gold")}>{quality}</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-white/10"><div className="h-full rounded-full bg-ok" style={{ width: `${quality}%` }} /></div>
            <ul className="mt-4 space-y-2 text-sm">
              {checks.map(([ok, t, pts]) => (
                <li key={t} className={cn("flex items-center gap-2", ok ? "text-ivory" : "text-mist")}>
                  {ok ? <Check size={15} className="text-[#7FD3A8]" /> : <span className="h-3.5 w-3.5 rounded-full border-2 border-current" />} {t}
                  <span className="ml-auto text-xs text-mist">+{pts}</span>
                </li>
              ))}
            </ul>
          </div>
          <EstimateCard l={{ ...l, priceAmount: price }} locale={locale} dark />
          <div className={section}>
            <div className="font-display text-lg font-semibold">{tx(locale, "Comisión estimada", "Estimated commission")}</div>
            <div className="mt-2 font-display text-3xl font-semibold">{money(commission, locale)}</div>
            <div className="text-sm text-mist">{agency.commissionPct} % · {tx(locale, "agente", "agent")} {agency.agentSplitPct} % = {money((commission * agency.agentSplitPct) / 100, locale)}</div>
          </div>
          <div className={section}>
            <div className="mb-3 font-display text-lg font-semibold">{tx(locale, "Rendimiento", "Performance")}</div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[[tx(locale, "Impresiones", "Impressions"), num(l.stats.impressions, locale)], ["Saves", l.stats.saves], ["Leads", l.stats.leads], [tx(locale, "Tiempo medio", "Avg. time"), `${Math.floor(l.stats.avgTimeSec / 60)}:${String(l.stats.avgTimeSec % 60).padStart(2, "0")}`], [tx(locale, "Interacciones/visita", "Interactions/visit"), l.stats.interactions], [tx(locale, "Días en mercado", "Days on market"), l.daysOnMarket]].map(([t, v]) => (
                <div key={String(t)} className="rounded-lg bg-white/5 p-3"><div className="text-xs text-mist">{t}</div><div className="font-display text-lg font-semibold">{v}</div></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

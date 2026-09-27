"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Eye, ImagePlus, Loader2, Save, Sparkles, Star, Trash2 } from "lucide-react";
import type { Amenity, Listing, ListingStatus, Locale } from "@/types/domain";
import { AdminShell } from "@/components/layout/AdminShell";
import { PropertyArt } from "@/components/art/PropertyArt";
import { EstimateCard } from "@/components/detail/Estimate";
import { PriceHistory } from "@/components/detail/Bits";
import { Button, Field, darkInputCls } from "@/components/ui";
import { api } from "@/lib/api";
import { AMENITY_LABEL, STATUS_LABEL, lbl, money, num, tx } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { commissionAmount } from "@/lib/commission";

const STATUSES: ListingStatus[] = ["DRAFT", "COMING_SOON", "ACTIVE", "UNDER_OFFER", "SOLD", "RENTED", "WITHDRAWN", "EXPIRED"];
const AMENITIES: Amenity[] = ["pool", "gym", "security", "generator", "waterTank", "view", "terrace", "elevator", "garden", "bbq", "furnished", "pets", "ac", "wifi", "loadingDock"];
type Photo = { id: string; url: string; isCover: boolean };

export function ListingEditor({ l, locale, photos: initialPhotos, commission, canEdit }: { l: Listing; locale: Locale; photos: Photo[]; commission: { pct: number; split: number; rentMonths: number }; canEdit: boolean }) {
  const router = useRouter();
  const [lang, setLang] = useState<Locale>("es");
  const [copy, setCopy] = useState({ title_es: l.title_es, title_en: l.title_en, body_es: l.body_es, body_en: l.body_en });
  const [f, setF] = useState({ status: l.status, priceAmount: l.priceAmount, privateListing: !!l.privateListing, beds: l.beds, baths: l.baths, areaM2: l.areaM2, parking: l.parking, amenities: l.amenities, hasFloorplan: l.hasFloorplan, hasVirtualTour: l.hasVirtualTour });
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos);
  const [writing, setWriting] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const dirty = () => setSaved(false);

  const save = async () => {
    setBusy("save");
    setErr(null);
    try {
      await api(`listings/${l.id}`, { method: "PATCH", json: { ...copy, ...f } });
      setSaved(true);
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  };
  const photoOp = async (json: object) => {
    setBusy("photos");
    try {
      const r = await api<{ photos: Photo[] }>(`listings/${l.id}/photos`, { method: "PATCH", json });
      setPhotos(r.photos);
      router.refresh();
    } finally {
      setBusy(null);
    }
  };
  const upload = async (files: File[]) => {
    if (!files.length) return;
    setBusy("photos");
    try {
      const fd = new FormData();
      files.forEach((x) => fd.append("files", x));
      const r = await fetch(`/api/v1/listings/${l.id}/photos`, { method: "POST", body: fd });
      if (!r.ok) throw new Error((await r.json()).error?.message);
      const list = await api<{ photos: Photo[] }>(`listings/${l.id}/photos`);
      setPhotos(list.photos);
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  };
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= photos.length) return;
    const next = [...photos];
    [next[i], next[j]] = [next[j], next[i]];
    setPhotos(next);
    photoOp({ order: next.map((p) => p.id) });
  };
  const writeAI = async () => {
    setWriting(true);
    try {
      const r = await api<{ copy: typeof copy }>("ai/write-listing", { method: "POST", json: { kind: l.kind, zone: l.zone, city: l.city, areaM2: f.areaM2, beds: f.beds, baths: f.baths, parking: f.parking, amenities: f.amenities } });
      setCopy(r.copy);
      dirty();
    } finally {
      setWriting(false);
    }
  };

  // Same rule as the server: uploaded photos, or the listing's illustrations while it has none.
  const nPhotos = photos.length || l.scenes.length;
  const checks: [boolean, string, number][] = [
    [nPhotos >= 8, tx(locale, `Fotos ≥ 8 (${nPhotos})`, `Photos ≥ 8 (${nPhotos})`), 35],
    [!!copy.title_en && !!copy.body_en, tx(locale, "Bilingüe ES/EN", "Bilingual ES/EN"), 20],
    [true, tx(locale, "Geolocalizado", "Geolocated"), 20],
    [f.hasFloorplan, tx(locale, "Plano", "Floor plan"), 15],
    [f.hasVirtualTour, tx(locale, "Tour virtual", "Virtual tour"), 10],
  ];
  // Mirrors qualityOf() on the server: 4 points per photo up to 8 photos (35).
  const quality = checks.reduce((s, [ok, , pts], i) => s + (ok ? pts : i === 0 ? nPhotos * 4 : 0), 0);
  const commissionValue = commissionAmount(l.listingType, f.priceAmount, { salePct: commission.pct, rentMonths: commission.rentMonths });
  const section = "rounded-np border border-navy-line bg-navy-card p-5";
  const num = (k: "beds" | "baths" | "areaM2" | "parking", label: string) => (
    <Field dark key={k} label={label}>
      <input className={darkInputCls} type="number" min={0} value={f[k]} disabled={!canEdit} onChange={(e) => { setF({ ...f, [k]: Math.max(0, +e.target.value) }); dirty(); }} />
    </Field>
  );

  return (
    <AdminShell
      locale={locale}
      area="agency"
      title={tx(locale, "Editar inmueble", "Edit listing")}
      actions={
        <div className="flex gap-2">
          <Button size="sm" variant="dark-outline" href={`/${locale}/listing/${l.slug}`}><Eye size={14} /> {tx(locale, "Ver ficha", "View")}</Button>
          {canEdit && (
            <Button size="sm" onClick={save} disabled={busy === "save"}>
              {busy === "save" ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : <Save size={14} />} {saved ? tx(locale, "Guardado", "Saved") : tx(locale, "Guardar", "Save")}
            </Button>
          )}
        </div>
      }
    >
      {err && <div className="mb-4 rounded-lg bg-[#B4231833] px-3 py-2 text-sm text-[#FF8A7A]">{err}</div>}
      {l.review === "PENDING" && <div className="mb-4 rounded-lg bg-[#C9862A33] px-3 py-2 text-sm text-[#F2B866]">{tx(locale, "Pendiente de aprobación del backoffice. No es visible al público todavía.", "Pending backoffice approval. Not public yet.")}</div>}
      <div className="grid gap-6 [&>*]:min-w-0 xl:grid-cols-[1fr_420px]">
        <div className="space-y-6">
          <div className={section}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-display text-lg font-semibold">{tx(locale, "Texto de la ficha", "Listing copy")}</span>
                {(["es", "en"] as Locale[]).map((x) => (
                  <button key={x} onClick={() => setLang(x)} className={cn("rounded-full px-2.5 py-0.5 text-xs font-bold", lang === x ? "bg-ivory text-navy" : "bg-white/10 text-mist")}>{x.toUpperCase()}</button>
                ))}
              </div>
              {canEdit && (
                <Button size="sm" variant="dark-outline" onClick={writeAI} disabled={writing}>
                  {writing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} className="text-coral" />} {tx(locale, "Redactar con IA", "Write with AI")}
                </Button>
              )}
            </div>
            <Field dark label={tx(locale, "Título", "Title")}>
              <input className={darkInputCls} disabled={!canEdit} value={lang === "es" ? copy.title_es : copy.title_en} onChange={(e) => { setCopy({ ...copy, [lang === "es" ? "title_es" : "title_en"]: e.target.value }); dirty(); }} />
            </Field>
            <div className="mt-3">
              <Field dark label={tx(locale, "Descripción", "Description")}>
                <textarea className={cn(darkInputCls, "h-28 py-2")} disabled={!canEdit} value={lang === "es" ? copy.body_es : copy.body_en} onChange={(e) => { setCopy({ ...copy, [lang === "es" ? "body_es" : "body_en"]: e.target.value }); dirty(); }} />
              </Field>
            </div>
          </div>

          <div className={section}>
            <div className="mb-4 font-display text-lg font-semibold">{tx(locale, "Precio y estado", "Price & status")}</div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field dark label={tx(locale, "Precio (USD)", "Price (USD)")}><input className={darkInputCls} type="number" min={1} disabled={!canEdit} value={f.priceAmount} onChange={(e) => { setF({ ...f, priceAmount: +e.target.value }); dirty(); }} /></Field>
              <Field dark label={tx(locale, "Estado", "Status")}>
                <select className={darkInputCls} disabled={!canEdit} value={f.status} onChange={(e) => { setF({ ...f, status: e.target.value as ListingStatus }); dirty(); }}>
                  {STATUSES.map((s) => <option key={s} value={s}>{s} · {lbl(STATUS_LABEL[s], locale)}</option>)}
                </select>
              </Field>
              <Field dark label={tx(locale, "Visibilidad", "Visibility")}>
                <select className={darkInputCls} disabled={!canEdit} value={f.privateListing ? "private" : "public"} onChange={(e) => { setF({ ...f, privateListing: e.target.value === "private" }); dirty(); }}>
                  <option value="public">{tx(locale, "Pública", "Public")}</option>
                  <option value="private">{tx(locale, "Privada (solo enlace)", "Private (link only)")}</option>
                </select>
              </Field>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              {num("beds", tx(locale, "Habitaciones", "Beds"))}
              {num("baths", tx(locale, "Baños", "Baths"))}
              {num("areaM2", "m²")}
              {num("parking", tx(locale, "Puestos", "Parking"))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {AMENITIES.map((a) => {
                const on = f.amenities.includes(a);
                return (
                  <button key={a} disabled={!canEdit} onClick={() => { setF({ ...f, amenities: on ? f.amenities.filter((x) => x !== a) : [...f.amenities, a] }); dirty(); }} className={cn("rounded-full px-3 py-1 text-xs font-semibold", on ? "bg-coral-cta text-white" : "bg-white/10 text-mist")}>
                    {lbl(AMENITY_LABEL[a], locale)}
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" disabled={!canEdit} checked={f.hasFloorplan} onChange={(e) => { setF({ ...f, hasFloorplan: e.target.checked }); dirty(); }} className="accent-[#F26B4D]" /> {tx(locale, "Tiene plano", "Has floor plan")}</label>
              <label className="flex items-center gap-2"><input type="checkbox" disabled={!canEdit} checked={f.hasVirtualTour} onChange={(e) => { setF({ ...f, hasVirtualTour: e.target.checked }); dirty(); }} className="accent-[#F26B4D]" /> {tx(locale, "Tour virtual", "Virtual tour")}</label>
            </div>
          </div>

          <div className={section}>
            <input ref={fileRef} type="file" multiple accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { upload(Array.from(e.target.files ?? [])); e.target.value = ""; }} />
            <div className="mb-4 flex items-center justify-between">
              <span className="font-display text-lg font-semibold">{tx(locale, "Fotos", "Photos")} · {nPhotos}</span>
              <Button size="sm" variant="dark-outline" onClick={() => fileRef.current?.click()} disabled={busy === "photos"}>
                {busy === "photos" ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />} {tx(locale, "Subir", "Upload")}
              </Button>
            </div>
            {nPhotos === 0 ? (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                {l.scenes.slice(0, 5).map((s, i) => (
                  <div key={i} className="relative overflow-hidden rounded-lg opacity-60">
                    <PropertyArt scene={s} seed={i === 0 ? l.id : l.id + (i - 1)} className="aspect-[4/3] w-full" />
                  </div>
                ))}
                <p className="col-span-full text-xs text-mist">{tx(locale, "Ilustraciones de marca mientras no haya fotos reales. Sube al menos 8 para +35 de calidad.", "Brand illustrations until real photos are uploaded. Upload at least 8 for +35 quality.")}</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                {photos.map((p, i) => (
                  <div key={p.id} className={cn("group relative overflow-hidden rounded-lg ring-2", p.isCover ? "ring-coral" : "ring-transparent")}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt="" className="aspect-[4/3] w-full object-cover" />
                    <div className="absolute inset-x-1 top-1 flex justify-between transition-opacity [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:opacity-100">
                      <button onClick={() => move(i, -1)} className="rounded bg-navy/80 p-0.5" aria-label="←"><ArrowLeft size={12} /></button>
                      <button onClick={() => photoOp({ remove: p.id })} className="rounded bg-navy/80 p-0.5 text-[#FF8A7A]" aria-label={tx(locale, "Eliminar", "Delete")}><Trash2 size={12} /></button>
                      <button onClick={() => move(i, 1)} className="rounded bg-navy/80 p-0.5" aria-label="→"><ArrowRight size={12} /></button>
                    </div>
                    {p.isCover ? (
                      <span className="absolute bottom-1 left-1 rounded-full bg-coral-cta px-1.5 text-[10px] font-bold text-white"><Star size={9} className="inline" /> {tx(locale, "Portada", "Cover")}</span>
                    ) : (
                      <button onClick={() => photoOp({ cover: p.id })} className="absolute bottom-1 left-1 rounded-full bg-white/90 px-1.5 text-[10px] font-bold text-navy [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:opacity-100">{tx(locale, "Portada", "Cover")}</button>
                    )}
                  </div>
                ))}
              </div>
            )}
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
          <EstimateCard l={{ ...l, priceAmount: f.priceAmount }} locale={locale} dark />
          <div className={section}>
            <div className="font-display text-lg font-semibold">{tx(locale, "Comisión estimada", "Estimated commission")}</div>
            <div className="mt-2 font-display text-3xl font-semibold">{money(commissionValue, locale)}</div>
            <div className="text-sm text-mist">{l.listingType === "SHORT_RENT" ? tx(locale, `${commission.pct} % de 30 noches`, `${commission.pct} % of 30 nights`) : l.listingType.includes("RENT") ? tx(locale, `${commission.rentMonths} ${commission.rentMonths === 1 ? "mes" : "meses"} de canon`, `${commission.rentMonths} month${commission.rentMonths === 1 ? "" : "s"} of rent`) : `${commission.pct} %`} · {tx(locale, "agente", "agent")} {commission.split} % = {money((commissionValue * commission.split) / 100, locale)}</div>
          </div>
          <div className={section}>
            <div className="mb-3 font-display text-lg font-semibold">{tx(locale, "Rendimiento", "Performance")}</div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[[tx(locale, "Impresiones", "Impressions"), num2(l.stats.impressions, locale)], ["Saves", l.stats.saves], ["Leads", l.stats.leads], [tx(locale, "Tiempo medio", "Avg. time"), `${Math.floor(l.stats.avgTimeSec / 60)}:${String(l.stats.avgTimeSec % 60).padStart(2, "0")}`], [tx(locale, "Interacciones", "Interactions"), l.stats.interactions], [tx(locale, "Días en mercado", "Days on market"), l.daysOnMarket]].map(([t, v]) => (
                <div key={String(t)} className="rounded-lg bg-white/5 p-3"><div className="text-xs text-mist">{t}</div><div className="font-display text-lg font-semibold">{v}</div></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

const num2 = (n: number, l: Locale) => num(n, l);

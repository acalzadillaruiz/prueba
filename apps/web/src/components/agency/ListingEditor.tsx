"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Eye, ImagePlus, Loader2, Save, Sparkles, Star, Trash2 } from "lucide-react";
import type { Amenity, Listing, ListingStatus, Locale } from "@/types/domain";
import { AdminShell, useDarkTheme } from "@/components/layout/AdminShell";
import { PropertyArt } from "@/components/art/PropertyArt";
import { EstimateCard } from "@/components/detail/Estimate";
import { PriceHistory } from "@/components/detail/Bits";
import { Button, Field } from "@/components/ui";
import { k, tab } from "./kit";
import { api } from "@/lib/api";
import { AMENITY_LABEL, STATUS_LABEL, dwell, lbl, money, num, tx } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { commissionAmount } from "@/lib/commission";
import { ListingTypeFields, extrasFrom, validateExtras, type ExtrasDraft } from "@/components/owner/ListingTypeFields";
import { EssentialsFields, essentialsFrom, validateEssentials, type EssentialsDraft } from "@/components/owner/EssentialsFields";
import { listingHref } from "@/lib/listing-href";
import { useApp } from "@/lib/store";

const STATUSES: ListingStatus[] = ["DRAFT", "COMING_SOON", "ACTIVE", "UNDER_OFFER", "SOLD", "RENTED", "WITHDRAWN", "EXPIRED"];
const AMENITIES: Amenity[] = ["pool", "gym", "security", "generator", "waterTank", "view", "terrace", "elevator", "garden", "bbq", "furnished", "pets", "ac", "wifi", "loadingDock"];
type Photo = { id: string; url: string; isCover: boolean };

export function ListingEditor({ l, locale, photos: initialPhotos, commission, canEdit, canPhotos = canEdit, showCommission = canEdit }: { l: Listing; locale: Locale; photos: Photo[]; commission: { pct: number; split: number; rentMonths: number }; canEdit: boolean; canPhotos?: boolean; showCommission?: boolean }) {
  const router = useRouter();
  const { user } = useApp();
  const { dark } = useDarkTheme();
  const [lang, setLang] = useState<Locale>("es");
  const [copy, setCopy] = useState({ title_es: l.title_es, title_en: l.title_en, body_es: l.body_es, body_en: l.body_en });
  const [f, setF] = useState({ status: l.status, priceAmount: l.priceAmount, privateListing: !!l.privateListing, beds: l.beds, baths: l.baths, areaM2: l.areaM2, parking: l.parking, amenities: l.amenities, hasFloorplan: l.hasFloorplan, hasVirtualTour: l.hasVirtualTour });
  const [tourUrl, setTourUrl] = useState(l.virtualTourUrl ?? "");
  const tourUrlBad = f.hasVirtualTour && !!tourUrl.trim() && !/^https:\/\/[^\s]+\.[^\s]+$/i.test(tourUrl.trim());
  const [extras, setExtras] = useState<ExtrasDraft>(() => extrasFrom(l));
  const [showExtrasErr, setShowExtrasErr] = useState(false);
  const [ess, setEss] = useState<EssentialsDraft>(() => essentialsFrom(l));
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos);
  const [writing, setWriting] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const dirty = () => setSaved(false);
  const extrasCheck = validateExtras(locale, l.listingType, l.luxury, extras);
  const essCheck = validateEssentials(locale, ess);
  // The brochure isn't part of the domain Listing: the listing API returns it alongside.
  useEffect(() => {
    if (!l.luxury) return;
    let alive = true;
    api<{ brochurePdf?: string | null }>(`listings/${l.id}`)
      .then((r) => alive && r.brochurePdf && setExtras((x) => (x.brochurePdf ? x : { ...x, brochurePdf: r.brochurePdf! })))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [l.id, l.luxury]);

  const save = async () => {
    if (tourUrlBad) {
      setErr(tx(locale, "El enlace del tour virtual debe empezar por https://", "The virtual tour link must start with https://"));
      return;
    }
    if (!extrasCheck.ok || !essCheck.ok) {
      setShowExtrasErr(true);
      setErr(tx(locale, "Revisa los campos marcados antes de guardar.", "Check the highlighted fields before saving."));
      return;
    }
    setBusy("save");
    setErr(null);
    try {
      const p = extrasCheck.payload;
      const typeFields = {
        ...(l.listingType === "SHORT_RENT" ? { shortRent: p.shortRent } : {}),
        ...(l.listingType.startsWith("COMMERCIAL") ? { commercial: p.commercial } : {}),
        ...(l.luxury ? { brochurePdf: p.brochurePdf ?? null } : {}),
      };
      await api(`listings/${l.id}`, { method: "PATCH", json: { ...copy, ...f, ...essCheck.payload, ...typeFields, virtualTourUrl: (f.hasVirtualTour && tourUrl.trim()) || null } });
      setSaved(true);
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  };
  const photoOp = async (json: object, rollback?: Photo[]) => {
    setBusy("photos");
    setErr(null);
    try {
      const r = await api<{ photos: Photo[] }>(`listings/${l.id}/photos`, { method: "PATCH", json });
      setPhotos(r.photos);
      router.refresh();
    } catch (e) {
      if (rollback) setPhotos(rollback);
      setErr((e as Error).message);
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
    const prev = photos;
    setPhotos(next);
    photoOp({ order: next.map((p) => p.id) }, prev);
  };
  const writeAI = async () => {
    setWriting(true);
    setErr(null);
    try {
      const r = await api<{ copy: typeof copy }>("ai/write-listing", { method: "POST", json: { kind: l.kind, zone: l.zone, city: l.city, areaM2: f.areaM2, beds: f.beds, baths: f.baths, parking: f.parking, amenities: f.amenities } });
      setCopy(r.copy);
      dirty();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setWriting(false);
    }
  };

  // Same rule as the server (listingQuality in @newplace/config): only real uploaded photos count.
  const nPhotos = photos.length;
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
  const section = cn(k.card, "p-5 md:p-6");
  const num = (key: "beds" | "baths" | "areaM2" | "parking", label: string) => (
    <Field key={key} label={label}>
      <input className={k.input} type="number" min={0} max={key === "areaM2" ? 1_000_000 : key === "parking" ? 50 : 30} value={f[key]} disabled={!canEdit} onChange={(e) => { setF({ ...f, [key]: Math.max(0, +e.target.value) }); dirty(); }} />
    </Field>
  );

  return (
    <AdminShell
      locale={locale}
      area="agency"
      title={tx(locale, "Editar inmueble", "Edit listing")}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" className={k.outline} href={listingHref(locale, l)}><Eye size={15} /> <span className="sr-only sm:not-sr-only">{tx(locale, "Ver ficha", "View")}</span></Button>
          {canEdit && (
            <Button className={k.primary} onClick={save} disabled={busy === "save"}>
              {busy === "save" ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : <Save size={14} />} {saved ? tx(locale, "Guardado", "Saved") : tx(locale, "Guardar", "Save")}
            </Button>
          )}
        </div>
      }
    >
      {err && <div className={cn("mb-4", k.err)} role="alert">{err}</div>}
      {l.review === "PENDING" && <div className={cn("mb-4", k.warnBox)}>{tx(locale, "Pendiente de aprobación del backoffice. No es visible al público todavía.", "Pending backoffice approval. Not public yet.")}</div>}
      {l.review === "REJECTED" && <div className={cn("mb-4", k.err)}>{tx(locale, "Rechazado por el backoffice: no es visible al público.", "Rejected by backoffice: not public.")}{user?.role === "AGENT" && canEdit ? ` ${tx(locale, "Corrígelo y guarda para reenviarlo a revisión.", "Fix it and save to resubmit it for review.")}` : ""}</div>}
      <div className="grid gap-6 [&>*]:min-w-0 xl:grid-cols-[1fr_420px]">
        <div className="space-y-6">
          <div className={section}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h2 className={k.title}>{tx(locale, "Texto de la ficha", "Listing copy")}</h2>
                {(["es", "en"] as Locale[]).map((x) => (
                  <button key={x} onClick={() => setLang(x)} aria-pressed={lang === x} className={cn(tab(lang === x), "px-2.5 py-0.5 text-xs font-semibold")}>{x.toUpperCase()}</button>
                ))}
              </div>
              {canEdit && (
                <Button size="sm" variant="outline" className={k.outline} onClick={writeAI} disabled={writing}>
                  {writing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} {tx(locale, "Redactar con IA", "Write with AI")}
                </Button>
              )}
            </div>
            <Field label={tx(locale, "Título", "Title")}>
              <input className={k.input} disabled={!canEdit} value={lang === "es" ? copy.title_es : copy.title_en} onChange={(e) => { setCopy({ ...copy, [lang === "es" ? "title_es" : "title_en"]: e.target.value }); dirty(); }} />
            </Field>
            <div className="mt-3">
              <Field label={tx(locale, "Descripción", "Description")}>
                <textarea className={cn(k.input, "h-32 py-2.5 md:h-32")} disabled={!canEdit} value={lang === "es" ? copy.body_es : copy.body_en} onChange={(e) => { setCopy({ ...copy, [lang === "es" ? "body_es" : "body_en"]: e.target.value }); dirty(); }} />
              </Field>
            </div>
          </div>

          <div className={section}>
            <h2 className={cn(k.title, "mb-4")}>{tx(locale, "Precio y estado", "Price & status")}</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label={tx(locale, "Precio (USD)", "Price (USD)")}><input className={k.input} type="number" min={1} disabled={!canEdit} value={f.priceAmount} onChange={(e) => { setF({ ...f, priceAmount: +e.target.value }); dirty(); }} /></Field>
              <Field label={tx(locale, "Estado", "Status")}>
                <select className={k.input} disabled={!canEdit} value={f.status} onChange={(e) => { setF({ ...f, status: e.target.value as ListingStatus }); dirty(); }}>
                  {STATUSES.map((s) => <option key={s} value={s}>{lbl(STATUS_LABEL[s], locale)}</option>)}
                </select>
              </Field>
              <Field label={tx(locale, "Visibilidad", "Visibility")}>
                <select className={k.input} disabled={!canEdit} value={f.privateListing ? "private" : "public"} onChange={(e) => { setF({ ...f, privateListing: e.target.value === "private" }); dirty(); }}>
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
                  <button key={a} disabled={!canEdit} onClick={() => { setF({ ...f, amenities: on ? f.amenities.filter((x) => x !== a) : [...f.amenities, a] }); dirty(); }} aria-pressed={on} className={cn(tab(on), "px-3 py-1 text-xs font-semibold")}>
                    {lbl(AMENITY_LABEL[a], locale)}
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" disabled={!canEdit} checked={f.hasFloorplan} onChange={(e) => { setF({ ...f, hasFloorplan: e.target.checked }); dirty(); }} className="h-4 w-4 accent-navy dark:accent-[#E79A7F]" /> {tx(locale, "Tiene plano", "Has floor plan")}</label>
              <label className="flex items-center gap-2"><input type="checkbox" disabled={!canEdit} checked={f.hasVirtualTour} onChange={(e) => { setF({ ...f, hasVirtualTour: e.target.checked }); dirty(); }} className="h-4 w-4 accent-navy dark:accent-[#E79A7F]" /> {tx(locale, "Tour virtual", "Virtual tour")}</label>
            </div>
            {f.hasVirtualTour && (
              <div className="mt-3 max-w-md">
                <Field
                  label={tx(locale, "Enlace del tour 360° (https)", "360° tour link (https)")}
                  error={tourUrlBad ? tx(locale, "Debe ser un enlace https:// completo.", "Must be a full https:// link.") : undefined}
                  hint={tx(locale, "Se abre en una pestaña nueva desde la ficha pública (Matterport, Kuula…).", "Opens in a new tab from the public listing (Matterport, Kuula…).")}
                >
                  <input
                    className={k.input}
                    type="url"
                    inputMode="url"
                    placeholder="https://"
                    maxLength={500}
                    disabled={!canEdit}
                    value={tourUrl}
                    aria-invalid={tourUrlBad}
                    onChange={(e) => { setTourUrl(e.target.value); dirty(); }}
                  />
                </Field>
              </div>
            )}
          </div>

          <div className={section}>
            <EssentialsFields
              locale={locale}
              value={ess}
              onChange={(x) => {
                setEss(x);
                dirty();
              }}
              showErrors={showExtrasErr}
              disabled={!canEdit}
              admin
            />
          </div>

          {(l.listingType === "SHORT_RENT" || l.listingType.startsWith("COMMERCIAL") || l.luxury) && (
            <div className={section}>
              <ListingTypeFields
                locale={locale}
                listingType={l.listingType}
                luxury={l.luxury}
                value={extras}
                onChange={(x) => {
                  setExtras(x);
                  dirty();
                }}
                showErrors={showExtrasErr}
                disabled={!canEdit}
                admin
              />
            </div>
          )}

          <div className={section}>
            <input ref={fileRef} type="file" multiple accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { upload(Array.from(e.target.files ?? [])); e.target.value = ""; }} />
            <div className="mb-4 flex items-center justify-between">
              <h2 className={k.title}>{tx(locale, "Fotos", "Photos")} · {nPhotos}</h2>
              {canPhotos && (
                <Button size="sm" variant="outline" className={k.outline} onClick={() => fileRef.current?.click()} disabled={busy === "photos"}>
                  {busy === "photos" ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />} {tx(locale, "Subir", "Upload")}
                </Button>
              )}
            </div>
            {photos.length === 0 ? (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                {l.scenes.slice(0, 5).map((s, i) => (
                  <div key={i} className="relative overflow-hidden rounded-xl opacity-60">
                    <PropertyArt scene={s} seed={i === 0 ? l.id : l.id + (i - 1)} className="aspect-[4/3] w-full" />
                  </div>
                ))}
                <p className={cn("col-span-full text-xs", k.muted)}>{tx(locale, "Se muestran ilustraciones de marca mientras no haya fotos reales; no cuentan para la calidad. Sube al menos 8 fotos para +35.", "Brand illustrations are shown until real photos are uploaded; they don’t count towards quality. Upload at least 8 photos for +35.")}</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                {photos.map((p, i) => (
                  <div key={p.id} className={cn("group relative overflow-hidden rounded-xl ring-2", p.isCover ? "ring-navy dark:ring-ivory" : "ring-transparent")}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt="" className="aspect-[4/3] w-full object-cover" />
                    {canPhotos && <div className="absolute inset-x-1 top-1 flex justify-between transition-opacity [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:opacity-100">
                      <button onClick={() => move(i, -1)} className="rounded-full bg-navy/85 p-1 text-ivory" aria-label={tx(locale, "Mover antes", "Move earlier")}><ArrowLeft size={12} /></button>
                      <button onClick={() => photoOp({ remove: p.id })} className="rounded-full bg-navy/85 p-1 text-[#F3B4A3]" aria-label={tx(locale, "Eliminar", "Delete")}><Trash2 size={12} /></button>
                      <button onClick={() => move(i, 1)} className="rounded-full bg-navy/85 p-1 text-ivory" aria-label={tx(locale, "Mover después", "Move later")}><ArrowRight size={12} /></button>
                    </div>}
                    {p.isCover ? (
                      <span className="absolute bottom-1 left-1 rounded-full bg-navy px-1.5 text-[10px] font-bold text-ivory"><Star size={9} className="inline" /> {tx(locale, "Portada", "Cover")}</span>
                    ) : canPhotos && (
                      <button onClick={() => photoOp({ cover: p.id })} className="absolute bottom-1 left-1 rounded-full bg-white/90 px-1.5 text-[10px] font-bold text-navy [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:opacity-100">{tx(locale, "Portada", "Cover")}</button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={section}>
            <h2 className={cn(k.title, "mb-3")}>{tx(locale, "Historial de precio", "Price history")}</h2>
            <PriceHistory events={l.priceHistory} locale={locale} dark={dark} />
          </div>
        </div>

        <div className="space-y-6">
          <div className={section}>
            <div className="flex items-center justify-between">
              <h2 className={k.title}>{tx(locale, "Calidad de ficha", "Listing quality")}</h2>
              <span className={cn(k.num, "text-[36px] leading-none", quality >= 85 ? k.okText : k.warnText)}>{quality}</span>
            </div>
            <div className="mt-3 h-2 rounded-full bg-[#ECE6DA] dark:bg-white/10"><div className="h-full rounded-full bg-ok" style={{ width: `${quality}%` }} /></div>
            <ul className="mt-4 space-y-2 text-sm">
              {checks.map(([ok, t, pts]) => (
                <li key={t} className={cn("flex items-center gap-2", ok ? "text-navy dark:text-ivory" : k.muted)}>
                  {ok ? <Check size={15} className={k.okText} /> : <span className="h-3.5 w-3.5 rounded-full border-2 border-current" />} {t}
                  <span className={cn("ml-auto text-xs", k.muted)}>+{pts}</span>
                </li>
              ))}
            </ul>
          </div>
          <EstimateCard l={{ ...l, priceAmount: f.priceAmount }} locale={locale} dark={dark} />
          {showCommission && <div className={section}>
            <h2 className={k.title}>{tx(locale, "Comisión estimada", "Estimated commission")}</h2>
            <div className={cn(k.num, "mt-3 text-[36px] leading-none")}>{money(commissionValue, locale)}</div>
            <div className={cn("mt-2 text-sm", k.muted)}>{l.listingType === "SHORT_RENT" ? tx(locale, `${commission.pct} % de 30 noches`, `${commission.pct} % of 30 nights`) : l.listingType.includes("RENT") ? tx(locale, `${commission.rentMonths} ${commission.rentMonths === 1 ? "mes" : "meses"} de canon`, `${commission.rentMonths} month${commission.rentMonths === 1 ? "" : "s"} of rent`) : `${commission.pct} %`} · {tx(locale, "agente", "agent")} {commission.split} % = {money((commissionValue * commission.split) / 100, locale)}</div>
          </div>}
          <div className={section}>
            <h2 className={cn(k.title, "mb-3")}>{tx(locale, "Rendimiento", "Performance")}</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[[tx(locale, "Impresiones", "Impressions"), num2(l.stats.impressions, locale)], ["Saves", l.stats.saves], ["Leads", l.stats.leads], [tx(locale, "Tiempo medio", "Avg. time"), dwell(l.stats.avgTimeSec)], [tx(locale, "Interacciones", "Interactions"), l.stats.interactions], [tx(locale, "Días en mercado", "Days on market"), l.daysOnMarket]].map(([t, v]) => (
                <div key={String(t)} className={cn("rounded-xl p-3.5", k.soft)}><div className={cn("text-[11px] font-semibold uppercase tracking-[.1em]", k.muted)}>{t}</div><div className={cn(k.num, "mt-1 text-[22px] leading-none")}>{v}</div></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

const num2 = (n: number, l: Locale) => num(n, l);

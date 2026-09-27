"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, ArrowRight, Building2, Check, CheckCircle2, ImagePlus, Loader2, MapPin, ShieldCheck, Sparkles, Star, User, X } from "lucide-react";
import type { EstimateResult } from "@newplace/ai";
import type { Agency, Amenity, Kind, Locale, Zone } from "@/types/domain";
import { PropertyArt } from "@/components/art/PropertyArt";
import { PlacesSearch, type PlacePick } from "@/components/map/PlacesSearch";
import { MapView } from "@/components/map/MapView";
import { Button, Field, Progress, inputCls } from "@/components/ui";
import { useApp } from "@/lib/store";
import { api, ApiClientError } from "@/lib/api";
import { AMENITY_LABEL, lbl, money, num, tx } from "@/lib/i18n";
import { cn } from "@/lib/cn";

const STEPS: [string, string][] = [
  ["Tipo", "Type"],
  ["Dirección", "Address"],
  ["Características", "Details"],
  ["Fotos", "Photos"],
  ["Precio", "Price"],
  ["Revisión", "Review"],
];

type Copy = { title_es: string; title_en: string; body_es: string; body_en: string };
type Draft = {
  mode: "FSBO" | "MANDATE" | "AGENCY";
  op: string;
  kind: Kind;
  addr: PlacePick | null;
  unit: string;
  m2: number;
  beds: number;
  baths: number;
  parking: number;
  year: number;
  amen: Amenity[];
  price: number;
  copy: Copy;
  agency: string;
};
const DRAFT_KEY_BASE = "np-owner-draft-v1";
const DEFAULT_PRICE: Record<string, number> = { SALE: 150000, LONG_RENT: 900, SHORT_RENT: 80, COMMERCIAL_SALE: 250000, COMMERCIAL_RENT: 1500 };

export function OwnerWizard({ locale, zones, agencies, fxVes, staff = false }: { locale: Locale; zones: Zone[]; agencies: Agency[]; fxVes: number; staff?: boolean }) {
  const router = useRouter();
  const { user, requireLogin } = useApp();
  const [step, setStep] = useState(0);
  const [d, setD] = useState<Draft>({
    mode: staff ? "AGENCY" : "FSBO",
    op: "SALE",
    kind: "apartment",
    addr: null,
    unit: "",
    m2: 110,
    beds: 3,
    baths: 2,
    parking: 1,
    year: 2005,
    amen: ["generator", "waterTank", "security"],
    price: 150000,
    copy: { title_es: "", title_en: "", body_es: "", body_en: "" },
    agency: agencies.find((a) => a.verified)?.id ?? agencies[0]?.id ?? "",
  });
  const set = (p: Partial<Draft>) => setD((x) => ({ ...x, ...p }));
  /** Switching operation swaps an untouched default price (a sale's 150.000 must not become 150.000/month). */
  const setOp = (op: string) =>
    setD((x) => ({ ...x, op, price: x.price === DEFAULT_PRICE[x.op] || !x.price ? (DEFAULT_PRICE[op] ?? x.price) : x.price }));
  const [dupError, setDupError] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [cover, setCover] = useState(0);
  const [dup, setDup] = useState<{ title: string; slug: string } | null>(null);
  const [checking, setChecking] = useState(false);
  const [estimate, setEstimate] = useState<EstimateResult | null>(null);
  const [writing, setWriting] = useState(false);
  const [lang, setLang] = useState<Locale>(locale);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<{ slug: string; id: string; mode: Draft["mode"] } | null>(null);
  const [confirm, setConfirm] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);
  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  const DRAFT_KEY = `${DRAFT_KEY_BASE}${staff ? "-agency" : ""}`;
  // restore draft after login redirect
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { d: Draft; step: number };
        setD(saved.d);
        setStep(saved.step);
      }
    } catch {}
  }, [DRAFT_KEY]);
  useEffect(() => {
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ d, step }));
    } catch {}
  }, [DRAFT_KEY, d, step]);

  const zone = zones.find((z) => z.name === d.addr?.zone) ?? zones.find((z) => z.name === "Altamira") ?? zones[0];
  const listingType = d.op === "COMMERCIAL" ? "COMMERCIAL_SALE" : d.op;

  // duplicate check once the address is known
  useEffect(() => {
    if (!d.addr) return setDup(null);
    setChecking(true);
    const t = setTimeout(() => {
      api<{ duplicate: { title: string; slug: string } | null }>("capture/check", { method: "POST", json: { address: `${d.addr!.main} ${d.unit}`.trim(), areaM2: d.m2, lat: d.addr!.lat, lng: d.addr!.lng } })
        .then((r) => {
          setDup(r.duplicate);
          setDupError(false);
        })
        .catch(() => {
          // Never claim "no duplicates" when the check could not run; the server re-checks at publish anyway.
          setDup(null);
          setDupError(true);
        })
        .finally(() => setChecking(false));
    }, 400);
    return () => clearTimeout(t);
  }, [d.addr, d.unit, d.m2]);

  // live PlaceEstimate (debounced)
  useEffect(() => {
    if (!zone) return;
    const t = setTimeout(() => {
      api<{ estimate: EstimateResult }>("ai/estimate", {
        method: "POST",
        json: { kind: d.kind, zone: zone.name, listingType, areaM2: d.m2, beds: d.beds, baths: d.baths, parking: d.parking, yearBuilt: d.year, amenities: d.amen, lat: d.addr?.lat, lng: d.addr?.lng },
      })
        .then((r) => setEstimate(r.estimate))
        .catch(() => {});
    }, 350);
    return () => clearTimeout(t);
  }, [zone, listingType, d.kind, d.m2, d.beds, d.baths, d.parking, d.year, d.amen, d.addr]);

  const writeAI = async () => {
    setWriting(true);
    try {
      const r = await api<{ copy: Copy }>("ai/write-listing", {
        method: "POST",
        json: { kind: d.kind, zone: zone?.name ?? "", city: zone?.city ?? "Caracas", areaM2: d.m2, beds: d.beds, baths: d.baths, parking: d.parking, amenities: d.amen },
      });
      set({ copy: r.copy });
    } finally {
      setWriting(false);
    }
  };

  const quality = Math.min(100, (files.length >= 8 ? 35 : files.length * 4) + (d.copy.title_en && d.copy.body_en ? 20 : 0) + (d.addr ? 20 : 0));

  const publish = async () => {
    if (!requireLogin()) return;
    if (!d.addr) return setStep(1);
    setErr(null);
    setBusy("create");
    try {
      const created = await api<{ id: string; slug: string }>("listings", {
        method: "POST",
        json: {
          mode: d.mode,
          agencyId: d.mode === "MANDATE" ? d.agency : undefined,
          listingType,
          kind: d.kind,
          address: `${d.addr.main}${d.unit ? `, ${d.unit}` : ""}`,
          zone: d.addr.zone,
          city: d.addr.city,
          state: d.addr.state ?? "",
          countryCode: d.addr.country ?? "VE",
          lat: d.addr.lat,
          lng: d.addr.lng,
          areaM2: d.m2,
          beds: d.beds,
          baths: d.baths,
          parking: d.parking,
          yearBuilt: d.year,
          amenities: d.amen,
          priceAmount: d.price,
          ...(d.copy.title_es ? d.copy : {}),
        },
      });
      if (files.length) {
        setBusy("photos");
        const ordered = [files[cover], ...files.filter((_, i) => i !== cover)];
        const fd = new FormData();
        ordered.forEach((f) => fd.append("files", f));
        const r = await fetch(`/api/v1/listings/${created.id}/photos`, { method: "POST", body: fd });
        if (!r.ok) throw new Error((await r.json()).error?.message ?? "upload failed");
      }
      sessionStorage.removeItem(DRAFT_KEY);
      setDone({ slug: created.slug, id: created.id, mode: d.mode });
      router.refresh();
    } catch (e) {
      if (e instanceof ApiClientError && e.code === "CONFLICT") {
        const dd = (e.details as { duplicateOf?: { title: string; slug: string } })?.duplicateOf;
        if (dd) setDup(dd);
        setErr(tx(locale, "Este inmueble ya está publicado en New Place (anti-duplicados).", "This property is already on New Place (duplicate check)."));
      } else setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const opt = (active: boolean) => cn("rounded-np border p-4 text-left transition-colors duration-np", active ? "border-coral bg-[#F26B4D0D] ring-1 ring-coral" : "border-line bg-white hover:border-navy/30");
  const stepper = (label: string, v: number, onChange: (n: number) => void) => (
    <div className="flex items-center justify-between rounded-np border border-line bg-white px-4 py-3">
      <span className="font-semibold">{label}</span>
      <div className="flex items-center gap-3">
        <button type="button" aria-label={`${label} −`} onClick={() => onChange(Math.max(0, v - 1))} className="h-8 w-8 rounded-full border border-line text-lg">−</button>
        <span className="w-5 text-center font-display text-lg">{v}</span>
        <button type="button" aria-label={`${label} +`} onClick={() => onChange(v + 1)} className="h-8 w-8 rounded-full border border-line text-lg">+</button>
      </div>
    </div>
  );

  if (done)
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center" data-testid="owner-published">
        <CheckCircle2 size={56} className="mx-auto text-ok" />
        <h1 className="mt-4 font-display text-3xl font-semibold">{done.mode === "AGENCY" ? tx(locale, "Inmueble creado", "Listing created") : done.mode === "FSBO" ? tx(locale, `¡Publicado en ${d.addr?.zone}!`, `Live in ${d.addr?.zone}!`) : tx(locale, "Encargo enviado", "Request sent")}</h1>
        <p className="mt-2 text-ink/60">
          {done.mode === "AGENCY"
            ? user?.role === "AGENT"
              ? tx(locale, "Quedó pendiente de aprobación del backoffice.", "It’s pending backoffice approval.")
              : tx(locale, "Publicado y visible en el mapa.", "Published and visible on the map.")
            : done.mode === "FSBO"
            ? tx(locale, "Pasó la revisión automática (sin duplicados) y ya aparece en el mapa.", "It passed automated checks (no duplicates) and is live on the map.")
            : tx(locale, `${agencies.find((a) => a.id === d.agency)?.name} asignará un agente. Estado: SOLICITADO.`, `${agencies.find((a) => a.id === d.agency)?.name} will assign an agent. Status: REQUESTED.`)}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {done.mode === "AGENCY" ? (
            <Button href={`/${locale}/agency/listings/${done.id}/edit`}>{tx(locale, "Editar en el panel", "Edit in dashboard")}</Button>
          ) : (
            <Button href={`/${locale}/owner/listings`}>{tx(locale, "Ver mis inmuebles", "My properties")}</Button>
          )}
          {done.mode === "FSBO" && <Button href={`/${locale}/listing/${done.slug}`} variant="outline">{tx(locale, "Ver la ficha", "View listing")}</Button>}
        </div>
      </div>
    );

  const canNext = step === 1 ? !!d.addr && !dup : step === 4 ? d.price > 0 : true;

  return (
    <div className="mx-auto grid max-w-[1200px] gap-8 px-4 py-8 md:px-6 lg:grid-cols-[1fr_340px]">
      <div>
        <div className="mb-6">
          <div className="mb-3 flex items-center justify-between text-sm">
            <span className="font-display font-semibold">{tx(locale, `Paso ${step + 1} de 6`, `Step ${step + 1} of 6`)} · {tx(locale, STEPS[step][0], STEPS[step][1])}</span>
            <span className="text-ink/65">{tx(locale, "Borrador guardado en este dispositivo", "Draft saved on this device")}</span>
          </div>
          <div className="grid grid-cols-6 gap-1.5">
            {STEPS.map((s, i) => (
              <button key={i} onClick={() => i <= step && setStep(i)} className="min-h-11 py-2 text-left" aria-label={tx(locale, s[0], s[1])} aria-current={i === step ? "step" : undefined}>
                <div className={cn("h-1.5 rounded-full", i <= step ? "bg-coral" : "bg-black/10")} />
                <div className={cn("mt-1.5 hidden text-xs sm:block", i === step ? "font-semibold text-ink" : "text-ink/65")}>{tx(locale, s[0], s[1])}</div>
              </button>
            ))}
          </div>
        </div>

        {step === 0 && (
          <div className="np-in space-y-6">
            <h1 className="font-display text-3xl font-semibold">{staff ? tx(locale, "Nuevo inmueble de la agencia", "New agency listing") : tx(locale, "¿Cómo quieres vender o alquilar?", "How do you want to sell or rent?")}</h1>
            {!staff && <div className="grid gap-3 sm:grid-cols-2">
              <button className={opt(d.mode === "FSBO")} onClick={() => set({ mode: "FSBO" })}>
                <User className="text-coral" />
                <div className="mt-2 font-display text-lg font-semibold">{tx(locale, "Publicar yo mismo", "List it myself")}</div>
                <div className="text-sm text-ink/60">{tx(locale, "Gratis. Tú gestionas visitas y ofertas.", "Free. You handle tours and offers.")}</div>
              </button>
              <button className={opt(d.mode === "MANDATE")} onClick={() => set({ mode: "MANDATE" })}>
                <Building2 className="text-coral" />
                <div className="mt-2 font-display text-lg font-semibold">{tx(locale, "Encargar a una agencia", "Hire an agency")}</div>
                <div className="text-sm text-ink/60">{tx(locale, "Un agente verificado se encarga de todo.", "A verified agent handles everything.")}</div>
              </button>
            </div>}
            {d.mode === "MANDATE" && (
              <div className="grid gap-2 sm:grid-cols-3">
                {agencies.map((a) => (
                  <button key={a.id} onClick={() => set({ agency: a.id })} className={opt(d.agency === a.id)}>
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg font-display text-xs font-bold text-navy" style={{ background: a.color }}>{a.initials}</span>
                      <span className="font-semibold">{a.name}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-1 text-xs text-ink/65">{a.verified && <ShieldCheck size={12} className="text-ok" />} {a.verified ? tx(locale, "Verificada", "Verified") : tx(locale, "En verificación", "Pending verification")} · {a.commissionPct} %</div>
                  </button>
                ))}
              </div>
            )}
            <div>
              <div className="mb-2 font-semibold">{tx(locale, "Operación", "Operation")}</div>
              <div className="flex flex-wrap gap-2">
                {[["SALE", "Venta", "Sale"], ["LONG_RENT", "Alquiler", "Rent"], ["SHORT_RENT", "Vacacional", "Vacation"], ["COMMERCIAL_SALE", "Comercial · venta", "Commercial · sale"], ["COMMERCIAL_RENT", "Comercial · alquiler", "Commercial · rent"]].map(([k, es, en]) => (
                  <button key={k} onClick={() => setOp(k)} aria-pressed={d.op === k} className={cn("rounded-full border px-4 py-2 font-display text-sm", d.op === k ? "border-navy bg-navy text-ivory" : "border-line bg-white")}>{tx(locale, es, en)}</button>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-2 font-semibold">{tx(locale, "Tipo de inmueble", "Property type")}</div>
              <div className="flex flex-wrap gap-2">
                {([["apartment", "Apartamento", "Apartment"], ["house", "Casa", "House"], ["penthouse", "Penthouse", "Penthouse"], ["townhouse", "Townhouse", "Townhouse"], ["studio", "Estudio", "Studio"], ["office", "Oficina", "Office"], ["retail", "Local", "Retail"], ["warehouse", "Galpón", "Warehouse"], ["land", "Terreno", "Land"]] as [Kind, string, string][]).map(([k, es, en]) => (
                  <button key={k} onClick={() => set({ kind: k })} className={cn("rounded-full border px-4 py-2 font-display text-sm", d.kind === k ? "border-navy bg-navy text-ivory" : "border-line bg-white")}>{tx(locale, es, en)}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="np-in space-y-5">
            <h1 className="font-display text-3xl font-semibold">{tx(locale, "¿Dónde está?", "Where is it?")}</h1>
            <PlacesSearch locale={locale} zones={zones} value={d.addr} onPick={(p) => set({ addr: p })} />
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label={tx(locale, "Piso / apto / casa", "Floor / unit")}><input className={inputCls} value={d.unit} onChange={(e) => set({ unit: e.target.value })} placeholder="Piso 6, apto 6-B" /></Field>
              <Field label={tx(locale, "Urbanización", "Neighborhood")}><input className={inputCls} value={d.addr?.zone ?? ""} readOnly /></Field>
              <Field label={tx(locale, "Ciudad", "City")}><input className={inputCls} value={d.addr?.city ?? ""} readOnly /></Field>
            </div>
            <MapView
              key={d.addr ? `${d.addr.lat.toFixed(3)}` : "none"}
              listings={[]}
              locale={locale}
              focus={d.addr ?? { lat: 10.4965, lng: -66.8505 }}
              initialScale={d.addr?.city === "Caracas" || !d.addr ? 4 : 5}
              region={!d.addr || d.addr.city === "Caracas" ? "caracas" : "venezuela"}
              pin={d.addr ?? undefined}
              onPick={(p) => d.addr && set({ addr: { ...d.addr, lat: p.lat, lng: p.lng } })}
              className="h-72 rounded-np"
              controls={false}
            />
            {d.addr && <p className="text-xs text-ink/65">{tx(locale, "Toca el mapa para ajustar el punto exacto.", "Tap the map to fine-tune the exact point.")}</p>}
            {d.addr && (
              <div className={cn("np-in flex flex-wrap items-center gap-3 rounded-np border p-3 text-sm", dup ? "border-warn/60 bg-[#C9862A14]" : "border-[#2F6F4E55] bg-[#2F6F4E0D]")}>
                {checking ? <Loader2 size={18} className="animate-spin" /> : dup ? <AlertTriangle size={18} className="text-warn" /> : <CheckCircle2 size={18} className="text-ok" />}
                <span className="font-semibold">{tx(locale, "Ubicación", "Location")}: {d.addr.lat.toFixed(5)}, {d.addr.lng.toFixed(5)}</span>
                {dup ? (
                  <span>
                    · {tx(locale, "Ya existe:", "Already listed:")}{" "}
                    <Link className="font-semibold text-coral underline" href={`/${locale}/listing/${dup.slug}`}>{dup.title}</Link>
                  </span>
                ) : dupError ? (
                  <span className="text-ink/65">· {tx(locale, "No pudimos verificar duplicados ahora; lo revisaremos al publicar.", "Couldn’t check for duplicates now; we’ll check again when you publish.")}</span>
                ) : (
                  <span className="text-ink/65">· {tx(locale, "Sin duplicados (fingerprint lat/lng + m² + dirección)", "No duplicates (fingerprint lat/lng + m² + address)")}</span>
                )}
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="np-in space-y-5">
            <h1 className="font-display text-3xl font-semibold">{tx(locale, "Cuéntanos cómo es", "Tell us about it")}</h1>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={tx(locale, "Superficie construida (m²)", "Built area (m²)")}><input className={inputCls} type="number" min={1} value={d.m2} onChange={(e) => set({ m2: Math.max(1, +e.target.value) })} /></Field>
              <Field label={tx(locale, "Año de construcción", "Year built")}><input className={inputCls} type="number" value={d.year} onChange={(e) => set({ year: +e.target.value })} /></Field>
              {stepper(tx(locale, "Habitaciones", "Bedrooms"), d.beds, (v) => set({ beds: v }))}
              {stepper(tx(locale, "Baños", "Bathrooms"), d.baths, (v) => set({ baths: v }))}
              {stepper(tx(locale, "Puestos", "Parking"), d.parking, (v) => set({ parking: v }))}
            </div>
            <div>
              <div className="mb-2 font-semibold">{tx(locale, "Amenidades", "Amenities")}</div>
              <div className="flex flex-wrap gap-2">
                {(["generator", "waterTank", "security", "elevator", "terrace", "pool", "gym", "view", "garden", "bbq", "pets", "furnished", "ac"] as Amenity[]).map((a) => {
                  const on = d.amen.includes(a);
                  return (
                    <button key={a} onClick={() => set({ amen: on ? d.amen.filter((x) => x !== a) : [...d.amen, a] })} className={cn("inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-semibold", on ? "border-navy bg-navy text-ivory" : "border-line bg-white")}>
                      {on && <Check size={14} />} {lbl(AMENITY_LABEL[a], locale)}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="np-in space-y-5">
            <h1 className="font-display text-3xl font-semibold">{tx(locale, "Fotos que venden", "Photos that sell")}</h1>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              data-testid="photo-input"
              onChange={(e) => {
                const list = Array.from(e.target.files ?? []).filter((f) => f.size <= 12 * 1024 * 1024);
                setFiles((prev) => [...prev, ...list].slice(0, 30));
                e.target.value = "";
              }}
            />
            <button
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                setFiles((prev) => [...prev, ...Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"))].slice(0, 30));
              }}
              className="flex w-full flex-col items-center rounded-np border-2 border-dashed border-line bg-white py-10 hover:border-coral"
            >
              <ImagePlus size={30} className="text-coral" />
              <span className="mt-2 font-display font-semibold">{tx(locale, "Arrastra tus fotos o haz clic", "Drag your photos or click")}</span>
              <span className="text-sm text-ink/65">JPG / PNG / WebP · {tx(locale, "máx. 12 MB c/u · ideal 8 a 20", "max 12 MB each · ideally 8 to 20")}</span>
            </button>
            {files.length > 0 && (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {previews.map((src, i) => (
                  <div key={src} className={cn("group relative overflow-hidden rounded-lg ring-2", cover === i ? "ring-coral" : "ring-transparent")}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" className="aspect-[4/3] w-full object-cover" />
                    <span className="absolute left-1.5 top-1.5 rounded bg-navy/80 px-1.5 text-xs font-bold text-ivory">{i + 1}</span>
                    <button onClick={() => { setFiles(files.filter((_, j) => j !== i)); if (cover >= i && cover > 0) setCover(cover - 1); }} className="absolute right-1.5 top-1.5 rounded-full bg-navy/70 p-0.5 text-white" aria-label={tx(locale, "Quitar", "Remove")}><X size={14} /></button>
                    {cover === i ? (
                      <span className="absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 rounded-full bg-coral-cta px-2 py-0.5 text-[11px] font-bold text-white"><Star size={11} /> {tx(locale, "Portada", "Cover")}</span>
                    ) : (
                      <button onClick={() => setCover(i)} className="absolute bottom-1.5 left-1.5 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-bold">{tx(locale, "Usar de portada", "Set cover")}</button>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              {[[files.length >= 8, tx(locale, `${files.length}/8 fotos recomendadas`, `${files.length}/8 recommended photos`)], [files.length > 0, tx(locale, "Portada elegida", "Cover set")]].map(([ok, t]) => (
                <div key={String(t)} className={cn("flex items-center gap-2 rounded-lg border px-3 py-2", ok ? "border-[#2F6F4E55] text-ok" : "border-line text-ink/65")}>{ok ? <CheckCircle2 size={16} /> : <span className="h-4 w-4 rounded-full border-2 border-current" />}{t as string}</div>
              ))}
            </div>
            {files.length === 0 && <p className="text-sm text-ink/65">{tx(locale, "Puedes continuar sin fotos y subirlas después desde «Mis inmuebles».", "You can continue without photos and add them later from “My properties”.")}</p>}
          </div>
        )}

        {step === 4 && (
          <div className="np-in space-y-5">
            <h1 className="font-display text-3xl font-semibold">{tx(locale, "Precio y descripción", "Price & description")}</h1>
            <div className="rounded-np border border-line bg-white p-5">
              <div className="flex items-center gap-2 font-display font-semibold"><Sparkles size={17} className="text-coral" /> PlaceEstimate · {zone?.name}</div>
              {estimate ? (
                <>
                  <div className="mt-2 font-display text-3xl font-semibold">{money(estimate.low, locale)} – {money(estimate.high, locale)}</div>
                  <div className="text-sm text-ink/65">{tx(locale, "Valor medio", "Mid value")} {money(estimate.mid, locale)} · {tx(locale, "confianza", "confidence")} {Math.round(estimate.confidence * 100)} % · {estimate.comparables.length} {tx(locale, "comparables", "comparables")}</div>
                </>
              ) : (
                <div className="mt-2 flex items-center gap-2 text-ink/65"><Loader2 size={16} className="animate-spin" /> {tx(locale, "Calculando…", "Calculating…")}</div>
              )}
              <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
                <Field label={tx(locale, "Tu precio (USD)", "Your price (USD)")}><input className={inputCls} type="number" min={1} value={d.price} onChange={(e) => set({ price: Math.max(0, +e.target.value) })} /></Field>
                {estimate && (
                  <div className="self-end pb-2.5 text-sm">
                    {d.price > estimate.high ? <span className="font-semibold text-warn">{tx(locale, "Por encima del rango", "Above range")}</span> : d.price < estimate.low ? <span className="font-semibold text-ok">{tx(locale, "Por debajo: venta rápida", "Below: quick sale")}</span> : <span className="font-semibold text-ok">{tx(locale, "Dentro del rango ✓", "Within range ✓")}</span>}
                  </div>
                )}
              </div>
              {fxVes > 0 && <div className="mt-2 text-xs text-ink/65">≈ Bs. {num(Math.round(d.price * fxVes), locale)} ({tx(locale, "tasa referencial", "reference rate")})</div>}
            </div>
            <div className="rounded-np border border-line bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-display font-semibold">{tx(locale, "Título y descripción (ES / EN)", "Title & description (ES / EN)")}</div>
                <Button size="sm" variant="navy" onClick={writeAI} disabled={writing}>
                  {writing ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} className="text-coral" />} {tx(locale, "Redactar con IA", "Write with AI")}
                </Button>
              </div>
              <div className="mt-3 flex gap-2">
                {(["es", "en"] as Locale[]).map((x) => (
                  <button key={x} onClick={() => setLang(x)} className={cn("rounded-full px-3 py-0.5 text-xs font-bold", lang === x ? "bg-navy text-ivory" : "bg-black/5")}>{x.toUpperCase()}</button>
                ))}
              </div>
              <input
                className={cn(inputCls, "mt-3")}
                placeholder={tx(locale, "Título", "Title")}
                aria-label={tx(locale, "Título", "Title")}
                value={lang === "es" ? d.copy.title_es : d.copy.title_en}
                onChange={(e) => set({ copy: { ...d.copy, [lang === "es" ? "title_es" : "title_en"]: e.target.value } })}
              />
              <textarea
                className={cn(inputCls, "mt-2 h-32 py-2")}
                placeholder={tx(locale, "Describe tu inmueble… o deja que la IA lo haga.", "Describe your place… or let AI do it.")}
                aria-label={tx(locale, "Descripción", "Description")}
                value={lang === "es" ? d.copy.body_es : d.copy.body_en}
                onChange={(e) => set({ copy: { ...d.copy, [lang === "es" ? "body_es" : "body_en"]: e.target.value } })}
              />
              <div className="mt-2 text-xs text-ink/65">{tx(locale, "Si lo dejas vacío, generamos un texto base al publicar.", "Leave empty and we’ll generate a base text on publish.")}</div>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="np-in space-y-5">
            <h1 className="font-display text-3xl font-semibold">{tx(locale, "Revisa y publica", "Review & publish")}</h1>
            {dup && (
              <div className="flex items-center gap-2 rounded-np border border-warn/60 bg-[#C9862A14] p-3 text-sm" role="alert">
                <AlertTriangle size={18} className="text-warn" />
                <span>
                  {tx(locale, "Con estos datos ya existe un anuncio:", "A listing with these details already exists:")}{" "}
                  <Link className="font-semibold text-coral underline" href={`/${locale}/listing/${dup.slug}`}>{dup.title}</Link>
                </span>
              </div>
            )}
            <div className="overflow-hidden rounded-np border border-line bg-white">
              <div className="grid sm:grid-cols-[260px_1fr]">
                {files.length ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previews[cover]} alt="" className="aspect-[4/3] w-full object-cover" />
                ) : (
                  <PropertyArt scene={d.kind === "house" ? "house-dusk" : "tower-day"} seed="wiz" className="aspect-[4/3] w-full" />
                )}
                <div className="p-5">
                  <div className="font-display text-2xl font-semibold">{money(d.price, locale)}</div>
                  <div className="font-semibold">{(lang === "es" ? d.copy.title_es : d.copy.title_en) || tx(locale, "(título automático)", "(auto title)")}</div>
                  <div className="text-sm text-ink/65">{d.addr?.main}, {d.addr?.zone}, {d.addr?.city}</div>
                  <div className="mt-2 text-sm">{d.beds} {tx(locale, "hab", "bd")} · {d.baths} {tx(locale, "baños", "ba")} · {d.m2} m² · {d.parking} {tx(locale, "puestos", "parking")}</div>
                  <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#F26B4D14] px-2.5 py-1 text-xs font-bold text-coral-hover">{d.mode === "AGENCY" ? tx(locale, "Inventario de la agencia", "Agency inventory") : d.mode === "FSBO" ? tx(locale, "Publicación directa (FSBO)", "For sale by owner") : tx(locale, "Encargo a agencia", "Agency mandate")}</div>
                </div>
              </div>
            </div>
            <div className="rounded-np border border-line bg-white p-5">
              <div className="flex items-center justify-between"><span className="font-display font-semibold">{tx(locale, "Calidad de la ficha", "Listing quality")}</span><span className="font-display text-2xl font-semibold text-ok">{quality}/100</span></div>
              <Progress value={quality} tone="ok" className="mt-2" />
              <ul className="mt-3 grid gap-1.5 text-sm sm:grid-cols-2">
                {[[files.length >= 8, tx(locale, "8+ fotos (+35)", "8+ photos (+35)")], [!!(d.copy.title_en && d.copy.body_en), tx(locale, "Bilingüe ES/EN (+20)", "Bilingual ES/EN (+20)")], [!!d.addr, tx(locale, "Geolocalizado (+20)", "Geolocated (+20)")], [false, tx(locale, "Plano (+15, después)", "Floor plan (+15, later)")]].map(([ok, t]) => (
                  <li key={String(t)} className={cn("flex items-center gap-2", ok ? "text-ok" : "text-ink/65")}>{ok ? <Check size={15} /> : <span className="h-3.5 w-3.5 rounded-full border-2 border-current" />}{t as string}</li>
                ))}
              </ul>
            </div>
            <label className="flex items-start gap-2 text-sm text-ink/65"><input type="checkbox" aria-label="confirm" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} className="mt-1 accent-[#F26B4D]" /> {tx(locale, "Confirmo que soy el propietario o tengo autorización para publicar.", "I confirm I’m the owner or authorised to list.")}</label>
            {!user && <p className="rounded-lg bg-[#F26B4D0D] px-3 py-2 text-sm">{tx(locale, "Te pediremos iniciar sesión para publicar. Tu borrador se conserva.", "We’ll ask you to sign in to publish. Your draft is kept.")}</p>}
            {err && <div className="rounded-lg bg-[#B423181A] px-3 py-2 text-sm text-danger" role="alert">{err}</div>}
          </div>
        )}

        <div className="mt-8 flex items-center justify-between border-t border-line pt-5">
          <Button variant="ghost" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}><ArrowLeft size={16} /> {tx(locale, "Atrás", "Back")}</Button>
          {step < 5 ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canNext}>{tx(locale, "Continuar", "Continue")} <ArrowRight size={16} /></Button>
          ) : (
            <Button size="lg" onClick={publish} disabled={!!busy || !confirm || !d.addr}>
              {busy && <Loader2 size={16} className="animate-spin" />}
              {busy === "photos" ? tx(locale, "Subiendo fotos…", "Uploading photos…") : d.mode === "MANDATE" ? tx(locale, "Enviar encargo", "Send request") : tx(locale, "Publicar ahora", "Publish now")}
            </Button>
          )}
        </div>
      </div>

      <aside className="hidden lg:block">
        <div className="sticky top-24 space-y-4">
          <div className="overflow-hidden rounded-np border border-line bg-white">
            {files.length ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previews[cover]} alt="" className="aspect-[4/3] w-full object-cover" />
            ) : (
              <PropertyArt scene={d.kind === "house" ? "house-dusk" : "tower-day"} seed="ph" className="aspect-[4/3] w-full opacity-40" />
            )}
            <div className="p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-ink/65">{tx(locale, "Vista previa", "Preview")}</div>
              <div className="font-display text-xl font-semibold">{money(d.price, locale)}</div>
              <div className="text-sm">{d.beds} {tx(locale, "hab", "bd")} · {d.baths} {tx(locale, "baños", "ba")} · {d.m2} m²</div>
              <div className="text-sm text-ink/65">{d.addr ? `${d.addr.zone}, ${d.addr.city}` : tx(locale, "Dirección pendiente", "Address pending")}</div>
            </div>
          </div>
          <div className="rounded-np bg-navy p-4 text-ivory">
            <div className="flex items-center gap-2 font-display font-semibold"><Sparkles size={16} className="text-coral" /> PlaceEstimate</div>
            <div className="mt-1 font-display text-2xl">{estimate ? money(estimate.mid, locale) : "—"}</div>
            <div className="text-xs text-mist">{tx(locale, "Se actualiza mientras completas", "Updates as you go")}</div>
          </div>
          <Link href={`/${locale}/owner/listings`} className="block text-center text-sm text-ink/65 hover:text-coral"><MapPin size={13} className="inline" /> {tx(locale, "Guardar y salir", "Save & exit")}</Link>
        </div>
      </aside>
    </div>
  );
}


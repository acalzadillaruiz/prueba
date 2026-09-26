"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Building2, Check, CheckCircle2, GripVertical, ImagePlus, Loader2, MapPin, Search, ShieldCheck, Sparkles, Star, User } from "lucide-react";
import { heuristicEstimate, heuristicWriteListing } from "@newplace/ai";
import type { Amenity, Kind, Listing, Locale, Scene } from "@/types/domain";
import { PropertyArt } from "@/components/art/PropertyArt";
import { NightMap } from "@/components/map/NightMap";
import { Button, Field, Progress, inputCls } from "@/components/ui";
import { AMENITY_LABEL, lbl, money, num, tx } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { ZONES, zoneByName } from "@/mock/zones";
import { LISTINGS } from "@/mock/listings";
import { AGENCIES } from "@/mock/people";

const STEPS: [string, string][] = [
  ["Tipo", "Type"],
  ["Dirección", "Address"],
  ["Características", "Details"],
  ["Fotos", "Photos"],
  ["Precio", "Price"],
  ["Revisión", "Review"],
];

const SUGGESTIONS = [
  { main: "Av. San Juan Bosco, Edif. Mirasol", sub: "Altamira, Chacao, Miranda, Venezuela", zone: "Altamira", lat: 10.4972, lng: -66.8497 },
  { main: "Av. San Juan Bosco con 2da Transversal", sub: "Altamira, Caracas, Venezuela", zone: "Altamira", lat: 10.4981, lng: -66.8489 },
  { main: "Plaza Francia (Altamira)", sub: "Chacao, Miranda, Venezuela", zone: "Altamira", lat: 10.4963, lng: -66.8497 },
];

const UPLOAD: Scene[] = ["living", "kitchen", "bedroom", "bath", "terrace", "tower-day", "bedroom", "lobby", "living"];

export function OwnerWizard({ locale }: { locale: Locale }) {
  const sp = useSearchParams();
  const [step, setStep] = useState(Number(sp.get("step") ?? 0));
  const [mode, setMode] = useState<"FSBO" | "AGENCY">("FSBO");
  const [op, setOp] = useState("SALE");
  const [kind, setKind] = useState<Kind>("apartment");
  const [q, setQ] = useState(step >= 1 ? SUGGESTIONS[0].main : "");
  const [addr, setAddr] = useState<(typeof SUGGESTIONS)[number] | null>(step >= 1 ? SUGGESTIONS[0] : null);
  const [m2, setM2] = useState(118);
  const [beds, setBeds] = useState(3);
  const [baths, setBaths] = useState(2);
  const [parking, setParking] = useState(2);
  const [year, setYear] = useState(2004);
  const [amen, setAmen] = useState<Amenity[]>(["generator", "waterTank", "security", "elevator", "terrace"]);
  const [photos, setPhotos] = useState<number>(step >= 3 ? 9 : 0);
  const [cover, setCover] = useState(0);
  const [price, setPrice] = useState(185000);
  const [copy, setCopy] = useState<ReturnType<typeof heuristicWriteListing> | null>(step >= 5 ? heuristicWriteListing({ kind: "apartment", zone: "Altamira", city: "Caracas", areaM2: 118, beds: 3, baths: 2, parking: 2, amenities: [], highlights: "Terraza techada con vista a El Ávila y planta eléctrica del edificio." }) : null);
  const [writing, setWriting] = useState(false);
  const [lang, setLang] = useState<Locale>(locale);
  const [agency, setAgency] = useState("ag-andes");
  const [published, setPublished] = useState(false);

  const zone = addr ? zoneByName(addr.zone) : zoneByName("Altamira");
  const estimate = useMemo(
    () =>
      heuristicEstimate({
        zone: zone.name,
        zonePricePerM2: zone.salePpm,
        areaM2: m2,
        beds,
        baths,
        parking,
        yearBuilt: year,
        amenities: amen,
        luxury: false,
        lat: addr?.lat ?? zone.lat,
        lng: addr?.lng ?? zone.lng,
        pool: LISTINGS.filter((l) => l.listingType === "SALE" && l.city === "Caracas" && !l.luxury).map((l) => ({ id: l.id, title: l.title_es, zone: l.zone, areaM2: l.areaM2, priceAmount: l.priceAmount, lat: l.lat, lng: l.lng })),
      }),
    [zone, m2, beds, baths, parking, year, amen, addr],
  );
  const quality = Math.min(100, (photos >= 8 ? 35 : photos * 4) + (copy ? 20 : 0) + (addr ? 20 : 0) + 15 + (amen.length >= 4 ? 10 : 5));

  const writeAI = () => {
    setWriting(true);
    setTimeout(() => {
      setCopy(heuristicWriteListing({ kind, zone: zone.name, city: zone.city, areaM2: m2, beds, baths, parking, amenities: amen, highlights: tx(locale, "Terraza techada con vista a El Ávila y planta eléctrica del edificio.", "Covered terrace facing El Ávila and full-building generator.") }));
      setWriting(false);
    }, 900);
  };

  const opt = (active: boolean) => cn("rounded-np border p-4 text-left transition-colors duration-np", active ? "border-coral bg-[#F26B4D0D] ring-1 ring-coral" : "border-line bg-white hover:border-navy/30");
  const stepper = (label: string, v: number, set: (n: number) => void) => (
    <div className="flex items-center justify-between rounded-np border border-line bg-white px-4 py-3">
      <span className="font-semibold">{label}</span>
      <div className="flex items-center gap-3">
        <button onClick={() => set(Math.max(0, v - 1))} className="h-8 w-8 rounded-full border border-line text-lg">−</button>
        <span className="w-5 text-center font-display text-lg">{v}</span>
        <button onClick={() => set(v + 1)} className="h-8 w-8 rounded-full border border-line text-lg">+</button>
      </div>
    </div>
  );

  if (published)
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <CheckCircle2 size={56} className="mx-auto text-ok" />
        <h1 className="mt-4 font-display text-3xl font-semibold">{mode === "FSBO" ? tx(locale, "¡Publicado en Altamira!", "Live in Altamira!") : tx(locale, "Encargo enviado", "Request sent")}</h1>
        <p className="mt-2 text-ink/60">
          {mode === "FSBO"
            ? tx(locale, "Tu anuncio pasó la revisión automática (anti-duplicados OK) y ya aparece en el mapa.", "Your listing passed automated checks (no duplicates) and is live on the map.")
            : tx(locale, "Andes Prime asignará un agente en menos de 24 h. Estado: SOLICITADO.", "Andes Prime will assign an agent within 24 h. Status: REQUESTED.")}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button href={`/${locale}/owner/listings`}>{tx(locale, "Ver mis inmuebles", "My properties")}</Button>
          <Button href={`/${locale}/search?type=SALE&zone=Altamira`} variant="outline">{tx(locale, "Ver en el mapa", "See on map")}</Button>
        </div>
      </div>
    );

  return (
    <div className="mx-auto grid max-w-[1200px] gap-8 px-4 py-8 md:px-6 lg:grid-cols-[1fr_340px]">
      <div>
        <div className="mb-6">
          <div className="mb-3 flex items-center justify-between text-sm">
            <span className="font-display font-semibold">{tx(locale, `Paso ${step + 1} de 6`, `Step ${step + 1} of 6`)} · {tx(locale, STEPS[step][0], STEPS[step][1])}</span>
            <span className="text-ink/50">{tx(locale, "Se guarda automáticamente", "Autosaved")}</span>
          </div>
          <div className="grid grid-cols-6 gap-1.5">
            {STEPS.map((s, i) => (
              <button key={i} onClick={() => setStep(i)} className="text-left">
                <div className={cn("h-1.5 rounded-full", i <= step ? "bg-coral" : "bg-black/10")} />
                <div className={cn("mt-1.5 hidden text-xs sm:block", i === step ? "font-semibold text-ink" : "text-ink/45")}>{tx(locale, s[0], s[1])}</div>
              </button>
            ))}
          </div>
        </div>

        {step === 0 && (
          <div className="np-in space-y-6">
            <h1 className="font-display text-3xl font-semibold">{tx(locale, "¿Cómo quieres vender o alquilar?", "How do you want to sell or rent?")}</h1>
            <div className="grid gap-3 sm:grid-cols-2">
              <button className={opt(mode === "FSBO")} onClick={() => setMode("FSBO")}>
                <User className="text-coral" />
                <div className="mt-2 font-display text-lg font-semibold">{tx(locale, "Publicar yo mismo", "List it myself")}</div>
                <div className="text-sm text-ink/60">{tx(locale, "Gratis. Tú gestionas visitas y ofertas.", "Free. You handle tours and offers.")}</div>
              </button>
              <button className={opt(mode === "AGENCY")} onClick={() => setMode("AGENCY")}>
                <Building2 className="text-coral" />
                <div className="mt-2 font-display text-lg font-semibold">{tx(locale, "Encargar a una agencia", "Hire an agency")}</div>
                <div className="text-sm text-ink/60">{tx(locale, "Un agente verificado se encarga de todo.", "A verified agent handles everything.")}</div>
              </button>
            </div>
            {mode === "AGENCY" && (
              <div className="grid gap-2 sm:grid-cols-3">
                {AGENCIES.map((a) => (
                  <button key={a.id} onClick={() => setAgency(a.id)} className={opt(agency === a.id)}>
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg font-display text-xs font-bold text-navy" style={{ background: a.color }}>{a.initials}</span>
                      <span className="font-semibold">{a.name}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-1 text-xs text-ink/55">{a.verified && <ShieldCheck size={12} className="text-ok" />} {a.verified ? tx(locale, "Verificada", "Verified") : tx(locale, "En verificación", "Pending verification")} · {a.commissionPct} %</div>
                  </button>
                ))}
              </div>
            )}
            <div>
              <div className="mb-2 font-semibold">{tx(locale, "Operación", "Operation")}</div>
              <div className="flex flex-wrap gap-2">
                {[["SALE", "Venta", "Sale"], ["LONG_RENT", "Alquiler", "Rent"], ["SHORT_RENT", "Vacacional", "Vacation"], ["COMMERCIAL", "Comercial", "Commercial"]].map(([k, es, en]) => (
                  <button key={k} onClick={() => setOp(k)} className={cn("rounded-full border px-4 py-2 font-display text-sm", op === k ? "border-navy bg-navy text-ivory" : "border-line bg-white")}>{tx(locale, es, en)}</button>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-2 font-semibold">{tx(locale, "Tipo de inmueble", "Property type")}</div>
              <div className="flex flex-wrap gap-2">
                {([["apartment", "Apartamento", "Apartment"], ["house", "Casa", "House"], ["penthouse", "Penthouse", "Penthouse"], ["townhouse", "Townhouse", "Townhouse"], ["office", "Oficina", "Office"], ["land", "Terreno", "Land"]] as [Kind, string, string][]).map(([k, es, en]) => (
                  <button key={k} onClick={() => setKind(k)} className={cn("rounded-full border px-4 py-2 font-display text-sm", kind === k ? "border-navy bg-navy text-ivory" : "border-line bg-white")}>{tx(locale, es, en)}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="np-in space-y-5">
            <h1 className="font-display text-3xl font-semibold">{tx(locale, "¿Dónde está?", "Where is it?")}</h1>
            <div className="flex gap-2">
              <select className={cn(inputCls, "w-40")} defaultValue="VE"><option value="VE">🇻🇪 Venezuela</option><option value="CO">🇨🇴 Colombia</option><option value="ES">🇪🇸 España</option><option value="US">🇺🇸 USA</option></select>
              <div className="relative flex-1">
                <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
                <input className={cn(inputCls, "pl-10")} value={q} onChange={(e) => { setQ(e.target.value); setAddr(null); }} placeholder={tx(locale, "Escribe la dirección…", "Type the address…")} />
                {q.length > 2 && !addr && (
                  <div className="np-in absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-np border border-line bg-white shadow-np">
                    {SUGGESTIONS.map((s) => (
                      <button key={s.main} onClick={() => { setAddr(s); setQ(s.main); }} className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-ivory">
                        <MapPin size={17} className="mt-0.5 text-coral" />
                        <span><span className="block font-semibold">{s.main}</span><span className="text-sm text-ink/55">{s.sub}</span></span>
                      </button>
                    ))}
                    <div className="border-t border-line px-4 py-1.5 text-right text-[10px] text-ink/40">Google Places Autocomplete · VE</div>
                  </div>
                )}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label={tx(locale, "Piso / apto", "Floor / unit")}><input className={inputCls} defaultValue="Piso 6, apto 6-B" /></Field>
              <Field label={tx(locale, "Urbanización", "Neighborhood")}><input className={inputCls} value={addr?.zone ?? ""} readOnly /></Field>
              <Field label={tx(locale, "Ciudad", "City")}><input className={inputCls} value={addr ? "Caracas" : ""} readOnly /></Field>
            </div>
            <NightMap listings={[]} locale={locale} focus={addr ?? { lat: 10.4965, lng: -66.8505 }} initialScale={4} className="h-72 rounded-np" controls={false} key={addr?.main ?? "none"} />
            {addr && (
              <div className="np-in flex flex-wrap items-center gap-3 rounded-np border border-[#2F6F4E55] bg-[#2F6F4E0D] p-3 text-sm">
                <CheckCircle2 size={18} className="text-ok" />
                <span className="font-semibold">{tx(locale, "Geocodificado", "Geocoded")}: {addr.lat.toFixed(4)}, {addr.lng.toFixed(4)}</span>
                <span className="text-ink/60">· {tx(locale, "Sin duplicados (fingerprint lat/lng + m² + dirección)", "No duplicates (fingerprint lat/lng + m² + address)")}</span>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="np-in space-y-5">
            <h1 className="font-display text-3xl font-semibold">{tx(locale, "Cuéntanos cómo es", "Tell us about it")}</h1>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={tx(locale, "Superficie construida (m²)", "Built area (m²)")}><input className={inputCls} type="number" value={m2} onChange={(e) => setM2(+e.target.value)} /></Field>
              <Field label={tx(locale, "Año de construcción", "Year built")}><input className={inputCls} type="number" value={year} onChange={(e) => setYear(+e.target.value)} /></Field>
              {stepper(tx(locale, "Habitaciones", "Bedrooms"), beds, setBeds)}
              {stepper(tx(locale, "Baños", "Bathrooms"), baths, setBaths)}
              {stepper(tx(locale, "Puestos", "Parking"), parking, setParking)}
            </div>
            <div>
              <div className="mb-2 font-semibold">{tx(locale, "Amenidades", "Amenities")}</div>
              <div className="flex flex-wrap gap-2">
                {(["generator", "waterTank", "security", "elevator", "terrace", "pool", "gym", "view", "garden", "bbq", "pets", "furnished"] as Amenity[]).map((a) => {
                  const on = amen.includes(a);
                  return (
                    <button key={a} onClick={() => setAmen(on ? amen.filter((x) => x !== a) : [...amen, a])} className={cn("inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-semibold", on ? "border-navy bg-navy text-ivory" : "border-line bg-white")}>
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
            <button onClick={() => setPhotos(9)} className="flex w-full flex-col items-center rounded-np border-2 border-dashed border-line bg-white py-10 hover:border-coral">
              <ImagePlus size={30} className="text-coral" />
              <span className="mt-2 font-display font-semibold">{tx(locale, "Arrastra tus fotos o haz clic", "Drag your photos or click")}</span>
              <span className="text-sm text-ink/55">JPG / PNG / HEIC · {tx(locale, "mínimo 8, ideal 20", "min 8, ideal 20")}</span>
            </button>
            {photos > 0 && (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {UPLOAD.slice(0, photos).map((s, i) => (
                  <div key={i} className={cn("np-in group relative overflow-hidden rounded-lg ring-2", cover === i ? "ring-coral" : "ring-transparent")} style={{ animationDelay: `${i * 60}ms` }}>
                    <PropertyArt scene={s} seed={"up" + i} className="aspect-[4/3] w-full" />
                    <span className="absolute left-1.5 top-1.5 rounded bg-navy/80 px-1.5 text-xs font-bold text-ivory">{i + 1}</span>
                    <GripVertical size={16} className="absolute right-1.5 top-1.5 text-white drop-shadow" />
                    {cover === i ? (
                      <span className="absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 rounded-full bg-coral px-2 py-0.5 text-[11px] font-bold text-white"><Star size={11} /> {tx(locale, "Portada", "Cover")}</span>
                    ) : (
                      <button onClick={() => setCover(i)} className="absolute bottom-1.5 left-1.5 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-bold opacity-0 group-hover:opacity-100">{tx(locale, "Usar de portada", "Set cover")}</button>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div className="grid gap-2 text-sm sm:grid-cols-3">
              {[[photos >= 8, tx(locale, `${photos}/8 fotos mínimas`, `${photos}/8 min photos`)], [photos > 0, tx(locale, "Portada elegida", "Cover set")], [false, tx(locale, "Plano (opcional)", "Floor plan (optional)")]].map(([ok, t]) => (
                <div key={String(t)} className={cn("flex items-center gap-2 rounded-lg border px-3 py-2", ok ? "border-[#2F6F4E55] text-ok" : "border-line text-ink/55")}>{ok ? <CheckCircle2 size={16} /> : <span className="h-4 w-4 rounded-full border-2 border-current" />}{t as string}</div>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="np-in space-y-5">
            <h1 className="font-display text-3xl font-semibold">{tx(locale, "Precio y descripción", "Price & description")}</h1>
            <div className="rounded-np border border-line bg-white p-5">
              <div className="flex items-center gap-2 font-display font-semibold"><Sparkles size={17} className="text-coral" /> PlaceEstimate · {zone.name}</div>
              <div className="mt-2 font-display text-3xl font-semibold">{money(estimate.low, locale)} – {money(estimate.high, locale)}</div>
              <div className="text-sm text-ink/55">{tx(locale, "Valor medio", "Mid value")} {money(estimate.mid, locale)} · {tx(locale, "confianza", "confidence")} {Math.round(estimate.confidence * 100)} % · {estimate.comparables.length} {tx(locale, "comparables", "comparables")}</div>
              <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
                <Field label={tx(locale, "Tu precio (USD)", "Your price (USD)")}><input className={inputCls} type="number" value={price} onChange={(e) => setPrice(+e.target.value)} /></Field>
                <div className="self-end pb-2.5 text-sm">
                  {price > estimate.high ? <span className="font-semibold text-warn">{tx(locale, "Por encima del rango", "Above range")}</span> : price < estimate.low ? <span className="font-semibold text-ok">{tx(locale, "Por debajo: venta rápida", "Below: quick sale")}</span> : <span className="font-semibold text-ok">{tx(locale, "Dentro del rango ✓", "Within range ✓")}</span>}
                </div>
              </div>
              <div className="mt-2 text-xs text-ink/45">≈ Bs. {num(Math.round(price * 186.4), locale)} ({tx(locale, "tasa referencial", "reference rate")})</div>
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
              <input className={cn(inputCls, "mt-3")} placeholder={tx(locale, "Título", "Title")} value={copy ? (lang === "es" ? copy.title_es : copy.title_en) : ""} readOnly />
              <textarea className={cn(inputCls, "mt-2 h-32 py-2")} placeholder={tx(locale, "Describe tu inmueble… o deja que la IA lo haga.", "Describe your place… or let AI do it.")} value={copy ? (lang === "es" ? copy.body_es : copy.body_en) : ""} readOnly />
              {copy && <div className="mt-2 text-xs text-ink/50">{tx(locale, "Generado con modelo local · puedes editarlo", "Generated with local model · you can edit it")}</div>}
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="np-in space-y-5">
            <h1 className="font-display text-3xl font-semibold">{tx(locale, "Revisa y publica", "Review & publish")}</h1>
            <div className="overflow-hidden rounded-np border border-line bg-white">
              <div className="grid sm:grid-cols-[260px_1fr]">
                <PropertyArt scene={UPLOAD[cover]} seed={"up" + cover} className="aspect-[4/3] w-full" />
                <div className="p-5">
                  <div className="font-display text-2xl font-semibold">{money(price, locale)}</div>
                  <div className="font-semibold">{copy ? tx(locale, copy.title_es, copy.title_en) : "—"}</div>
                  <div className="text-sm text-ink/55">{addr?.main}, {zone.name}, Caracas</div>
                  <div className="mt-2 text-sm">{beds} {tx(locale, "hab", "bd")} · {baths} {tx(locale, "baños", "ba")} · {m2} m² · {parking} {tx(locale, "puestos", "parking")}</div>
                  <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#F26B4D14] px-2.5 py-1 text-xs font-bold text-coral-hover">{mode === "FSBO" ? tx(locale, "Publicación directa (FSBO)", "For sale by owner") : tx(locale, "Encargo a agencia", "Agency mandate")}</div>
                </div>
              </div>
            </div>
            <div className="rounded-np border border-line bg-white p-5">
              <div className="flex items-center justify-between"><span className="font-display font-semibold">{tx(locale, "Calidad de la ficha", "Listing quality")}</span><span className="font-display text-2xl font-semibold text-ok">{quality}/100</span></div>
              <Progress value={quality} tone="ok" className="mt-2" />
              <ul className="mt-3 grid gap-1.5 text-sm sm:grid-cols-2">
                {[[photos >= 8, tx(locale, "8+ fotos", "8+ photos")], [!!copy, tx(locale, "Bilingüe ES/EN", "Bilingual ES/EN")], [!!addr, tx(locale, "Geolocalizado", "Geolocated")], [false, tx(locale, "Plano (+15)", "Floor plan (+15)")]].map(([ok, t]) => (
                  <li key={String(t)} className={cn("flex items-center gap-2", ok ? "text-ok" : "text-ink/45")}>{ok ? <Check size={15} /> : <span className="h-3.5 w-3.5 rounded-full border-2 border-current" />}{t as string}</li>
                ))}
              </ul>
            </div>
            <label className="flex items-start gap-2 text-sm text-ink/65"><input type="checkbox" defaultChecked className="mt-1 accent-[#F26B4D]" /> {tx(locale, "Confirmo que soy el propietario o tengo autorización para publicar.", "I confirm I’m the owner or authorised to list.")}</label>
          </div>
        )}

        <div className="mt-8 flex items-center justify-between border-t border-line pt-5">
          <Button variant="ghost" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}><ArrowLeft size={16} /> {tx(locale, "Atrás", "Back")}</Button>
          {step < 5 ? (
            <Button onClick={() => setStep(step + 1)} disabled={(step === 1 && !addr) || (step === 3 && photos < 8)}>{tx(locale, "Continuar", "Continue")} <ArrowRight size={16} /></Button>
          ) : (
            <Button size="lg" onClick={() => setPublished(true)}>{mode === "FSBO" ? tx(locale, "Publicar ahora", "Publish now") : tx(locale, "Enviar encargo", "Send request")}</Button>
          )}
        </div>
      </div>

      <aside className="hidden lg:block">
        <div className="sticky top-24 space-y-4">
          <div className="overflow-hidden rounded-np border border-line bg-white">
            <PropertyArt scene={photos ? UPLOAD[cover] : "tower-day"} seed={photos ? "up" + cover : "ph"} className={cn("aspect-[4/3] w-full", !photos && "opacity-40")} />
            <div className="p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-ink/45">{tx(locale, "Vista previa", "Preview")}</div>
              <div className="font-display text-xl font-semibold">{money(price, locale)}</div>
              <div className="text-sm">{beds} {tx(locale, "hab", "bd")} · {baths} {tx(locale, "baños", "ba")} · {m2} m²</div>
              <div className="text-sm text-ink/55">{addr ? `${zone.name}, Caracas` : tx(locale, "Dirección pendiente", "Address pending")}</div>
            </div>
          </div>
          <div className="rounded-np bg-navy p-4 text-ivory">
            <div className="flex items-center gap-2 font-display font-semibold"><Sparkles size={16} className="text-coral" /> PlaceEstimate</div>
            <div className="mt-1 font-display text-2xl">{money(estimate.mid, locale)}</div>
            <div className="text-xs text-mist">{tx(locale, "Se actualiza mientras completas", "Updates as you go")}</div>
          </div>
          <Link href={`/${locale}/owner/listings`} className="block text-center text-sm text-ink/55 hover:text-coral">{tx(locale, "Guardar y salir", "Save & exit")}</Link>
        </div>
      </aside>
    </div>
  );
}

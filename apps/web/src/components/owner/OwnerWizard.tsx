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
import { AMENITY_LABEL, lbl, money, num, plural, tx } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { EMPTY_EXTRAS, ListingTypeFields, validateExtras, type ExtrasDraft } from "./ListingTypeFields";
import { listingQuality } from "@newplace/config";
import { EMPTY_ESSENTIALS, EssentialsFields, validateEssentials, type EssentialsDraft } from "./EssentialsFields";
import { essentialLabels } from "@/lib/essentials";
import { OwnerNextSteps } from "./OwnerNextSteps";

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
  luxury: boolean;
  /** Luxury only: hidden from public search, reachable by link (brief §5). */
  privateListing: boolean;
  extras: ExtrasDraft;
  /** Venezuelan essentials: planta, pozo, tanque, muelle, vistas. */
  ess: EssentialsDraft;
};
const DRAFT_KEY_BASE = "np-owner-draft-v1";
const RESIDENTIAL_KINDS: Kind[] = ["apartment", "house", "penthouse", "townhouse", "studio", "villa", "chalet"];
/** Bedrooms don't apply to these kinds; land has no bathrooms or parking either. */
const NO_BEDS: Kind[] = ["land", "office", "retail", "warehouse"];
const THIS_YEAR = new Date().getFullYear();
const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
/** "Av. X, Piso 6, Altamira, Caracas" — skips parts already contained in what's written (no "Altamira, Altamira"). */
function fullAddress(parts: (string | undefined | null)[]) {
  const out: string[] = [];
  for (const p of parts) {
    const v = (p ?? "").trim();
    if (v && !norm(out.join(" ")).includes(norm(v))) out.push(v);
  }
  return out.join(", ");
}
/**
 * What the owner wrote beyond the urbanización/city ("Av. San Juan Bosco, Res. Las Lomas" out of
 * "Av. San Juan Bosco, Res. Las Lomas, Altamira"). Picking only the zone leaves this empty, so the pin
 * would land at the zone centre and collide with every other "Altamira" listing.
 */
function streetPart(main: string, drop: (string | undefined | null)[]) {
  let t = ` ${norm(main).replace(/[^a-z0-9]+/g, " ")} `;
  for (const x of [...drop, "venezuela"]) {
    const w = norm(x ?? "").replace(/[^a-z0-9]+/g, " ").trim();
    if (w) t = t.split(` ${w} `).join(" ");
  }
  return t.replace(/\s+/g, " ").trim();
}

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
    // Nothing is pre-filled: a listing only ever shows what its owner actually wrote.
    m2: 0,
    beds: 0,
    baths: 0,
    parking: 0,
    year: 0,
    amen: [],
    price: 0,
    copy: { title_es: "", title_en: "", body_es: "", body_en: "" },
    agency: agencies.find((a) => a.verified)?.id ?? agencies[0]?.id ?? "",
    luxury: false,
    privateListing: false,
    extras: EMPTY_EXTRAS,
    ess: EMPTY_ESSENTIALS,
  });
  const set = (p: Partial<Draft>) => setD((x) => ({ ...x, ...p }));
  /** Switching operation clears the price: a sale's 150.000 must never become 150.000/month. */
  const setOp = (op: string) => setD((x) => ({ ...x, op, price: x.op === op ? x.price : 0 }));
  const [dupError, setDupError] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [cover, setCover] = useState(0);
  const [dup, setDup] = useState<{ title: string | null; slug: string | null } | null>(null);
  /** The owner says the possible duplicate is another unit: allowed, but the listing goes to manual review. */
  const [dupOverride, setDupOverride] = useState(false);
  const [checking, setChecking] = useState(false);
  const [estimate, setEstimate] = useState<EstimateResult | null>(null);
  const [writing, setWriting] = useState(false);
  const [lang, setLang] = useState<Locale>(locale);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<{ slug: string; id: string; mode: Draft["mode"]; pending?: boolean; dupReview?: boolean } | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [showExtrasErr, setShowExtrasErr] = useState(false);
  const [showDetailsErr, setShowDetailsErr] = useState(false);
  const [aiErr, setAiErr] = useState<string | null>(null);
  const [fileNote, setFileNote] = useState<string | null>(null);
  const [photoWarn, setPhotoWarn] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  const DRAFT_KEY = `${DRAFT_KEY_BASE}${staff ? "-agency" : ""}`;
  // restore draft after login redirect
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { d: Partial<Draft>; step: number };
        // Drafts saved by an older version may lack newer fields: keep the defaults for those.
        setD((x) => ({ ...x, ...saved.d, extras: { ...x.extras, ...saved.d.extras }, ess: { ...x.ess, ...saved.d.ess } }));
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
  // Luxury is a flag on residential listings (brief §5); not offered for commercial operations or land.
  const luxury = d.luxury && !listingType.startsWith("COMMERCIAL") && RESIDENTIAL_KINDS.includes(d.kind);
  const extras = validateExtras(locale, listingType, luxury, d.extras);
  const ess = validateEssentials(locale, d.ess);
  const address = fullAddress([d.addr?.main, d.unit, d.addr?.zone, d.addr?.city]);
  /** Address line sent to the API (and to the duplicate check): street/building + unit. */
  const apiAddress = d.addr ? `${d.addr.main}${d.unit.trim() ? `, ${d.unit.trim()}` : ""}` : "";
  const streetErr =
    d.addr && streetPart(d.addr.main, [d.addr.zone, d.addr.city, d.addr.state]).length < 7
      ? tx(locale, "Escribe la calle o el edificio, no solo la urbanización (por ejemplo «Av. San Juan Bosco, Res. Los Pinos»), y vuelve a elegir la zona en la lista.", "Write the street or building, not just the neighborhood (for example “Av. San Juan Bosco, Res. Los Pinos”), then pick the area from the list again.")
      : null;
  const hasBeds = !NO_BEDS.includes(d.kind);
  const hasBaths = d.kind !== "land";
  const beds = hasBeds ? d.beds : 0;
  const baths = hasBaths ? d.baths : 0;
  const parking = d.kind === "land" ? 0 : d.parking;
  // Step 2 checks, with the same bounds the API enforces (a bad year used to fail only at publish with a generic error).
  const detailsErr = {
    m2: !Number.isInteger(d.m2) || d.m2 < 1 || d.m2 > 1_000_000 ? tx(locale, "Escribe la superficie en m², un número entero mayor que 0.", "Enter the area in m², a whole number above 0.") : null,
    year: !Number.isInteger(d.year) || d.year < 1800 || d.year > THIS_YEAR + 5 ? tx(locale, `Año entre 1800 y ${THIS_YEAR + 5}.`, `Year between 1800 and ${THIS_YEAR + 5}.`) : null,
  };
  const detailsOk = !detailsErr.m2 && !detailsErr.year;
  const priceErr = !Number.isInteger(d.price) || d.price < 1 || d.price > 1_000_000_000 ? tx(locale, "Escribe un precio en USD mayor que 0, sin decimales.", "Enter a USD price above 0, no decimals.") : null;
  const priceUnit = listingType === "SHORT_RENT" ? tx(locale, " / noche", " / night") : listingType.includes("RENT") ? tx(locale, " / mes", " / month") : "";
  // duplicate check once the address is known
  // A different address or unit is a different question: the owner must confirm again.
  useEffect(() => setDupOverride(false), [apiAddress]);
  useEffect(() => {
    if (!d.addr) return setDup(null);
    setChecking(true);
    const t = setTimeout(() => {
      // Same address string (street + unit) the listing is created with; area 0 = not known yet (address-only check).
      api<{ duplicate: { title: string | null; slug: string | null } | null }>("capture/check", { method: "POST", json: { address: apiAddress, areaM2: d.m2 > 0 ? d.m2 : 0, lat: d.addr!.lat, lng: d.addr!.lng } })
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- apiAddress derives from d.addr + d.unit
  }, [d.addr, d.unit, d.m2]);

  // live PlaceEstimate (debounced)
  useEffect(() => {
    // No valuation from made-up numbers: wait until the owner has written the area.
    if (!zone || !d.m2) return setEstimate(null);
    const t = setTimeout(() => {
      api<{ estimate: EstimateResult }>("ai/estimate", {
        method: "POST",
        json: { kind: d.kind, zone: zone.name, listingType, areaM2: d.m2, beds, baths, parking, yearBuilt: d.year, amenities: d.amen, lat: d.addr?.lat, lng: d.addr?.lng },
      })
        .then((r) => setEstimate(r.estimate))
        .catch(() => {});
    }, 350);
    return () => clearTimeout(t);
  }, [zone, listingType, d.kind, d.m2, beds, baths, parking, d.year, d.amen, d.addr]);

  const writeAI = async () => {
    setWriting(true);
    setAiErr(null);
    try {
      const r = await api<{ copy: Copy }>("ai/write-listing", {
        method: "POST",
        json: { kind: d.kind, zone: d.addr?.zone ?? zone?.name ?? "", city: d.addr?.city ?? zone?.city ?? "Caracas", areaM2: d.m2, beds, baths, parking, amenities: d.amen },
      });
      set({ copy: r.copy });
    } catch (e) {
      setAiErr(`${tx(locale, "No pudimos escribir el texto", "We couldn’t write the text")}: ${(e as Error).message}`);
    } finally {
      setWriting(false);
    }
  };

  const quality = listingQuality({ photos: files.length, titleEn: d.copy.title_en, bodyEn: d.copy.body_en, located: !!d.addr });

  const publish = async () => {
    if (!requireLogin()) return;
    if (!d.addr || streetErr) return setStep(1);
    if (!detailsOk) {
      setShowDetailsErr(true);
      return setStep(2);
    }
    if (priceErr) return setStep(4);
    if (!extras.ok || !ess.ok) {
      setShowExtrasErr(true);
      return setStep(2);
    }
    setErr(null);
    setBusy("create");
    try {
      const created = await api<{ id: string; slug: string; review?: string }>("listings", {
        method: "POST",
        json: {
          mode: d.mode,
          agencyId: d.mode === "MANDATE" ? d.agency : undefined,
          listingType,
          kind: d.kind,
          address: apiAddress,
          zone: d.addr.zone,
          city: d.addr.city,
          state: d.addr.state ?? "",
          countryCode: d.addr.country ?? "VE",
          lat: d.addr.lat,
          lng: d.addr.lng,
          areaM2: d.m2,
          beds,
          baths,
          parking,
          yearBuilt: d.year,
          amenities: d.amen,
          priceAmount: d.price,
          luxury,
          privateListing: luxury && d.privateListing,
          ...extras.payload,
          ...ess.payload,
          ...(d.copy.title_es ? d.copy : {}),
          ...(dupOverride ? { dupOverride: true } : {}),
        },
      });
      if (files.length) {
        setBusy("photos");
        const ordered = [files[cover], ...files.filter((_, i) => i !== cover)];
        const fd = new FormData();
        ordered.forEach((f) => fd.append("files", f));
        // The listing already exists: a failed upload must not leave the draft behind (republishing it would hit the duplicate check).
        const r = await fetch(`/api/v1/listings/${created.id}/photos`, { method: "POST", body: fd }).catch(() => null);
        if (!r?.ok) {
          const msg = ((await r?.json().catch(() => null)) as { error?: { message?: string } } | null)?.error?.message;
          setPhotoWarn(tx(locale, `Tu anuncio ya está creado, pero las fotos no se subieron${msg ? ` (${msg})` : ""}. Puedes subirlas desde «Mis inmuebles».`, `Your listing is created, but the photos didn’t upload${msg ? ` (${msg})` : ""}. You can add them from “My properties”.`));
        }
      }
      sessionStorage.removeItem(DRAFT_KEY);
      setDone({ slug: created.slug, id: created.id, mode: d.mode, pending: created.review === "PENDING", dupReview: dupOverride });
      router.refresh();
    } catch (e) {
      if (e instanceof ApiClientError && e.code === "CONFLICT") {
        const dd = (e.details as { duplicateOf?: { title: string; slug: string } })?.duplicateOf;
        if (dd) setDup(dd);
        setDupOverride(false);
        setErr(tx(locale, "Este inmueble parece estar ya publicado en New Place. Si es otra unidad, indícalo abajo y lo revisaremos a mano.", "This property seems to be on New Place already. If it’s a different unit, say so below and we’ll review it by hand."));
      } else setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const opt = (active: boolean) => cn("rounded-[18px] p-4 text-left transition-shadow duration-np", active ? "bg-[#E6DDD2] shadow-[inset_0_0_0_2px_#1E1A18] dark:bg-white/10 dark:shadow-[inset_0_0_0_2px_#C9A574]" : "bg-white shadow-[inset_0_0_0_1px_#D8CBB7] hover:shadow-[inset_0_0_0_1px_#1E1A18]");
  const stepper = (label: string, v: number, onChange: (n: number) => void) => (
    <div className="flex items-center justify-between rounded-[18px] bg-white shadow-[0_8px_24px_rgba(30,26,24,.06)] px-4 py-3">
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
        <h1 className="mt-4 font-serif text-[36px] font-medium leading-[1.05] md:text-[44px]">{done.mode === "AGENCY" ? tx(locale, "Anuncio creado", "Listing created") : done.mode === "FSBO" ? (done.pending ? tx(locale, "Lo estamos revisando", "We’re reviewing it") : tx(locale, `Ya está publicado en ${d.addr?.zone}`, `Now live in ${d.addr?.zone}`)) : tx(locale, "Tu encargo va en camino", "Your request is on its way")}</h1>
        <p className="mt-2 text-muted">
          {done.mode === "AGENCY"
            ? user?.role === "AGENT" || done.pending
              ? tx(locale, "Queda pendiente de revisión antes de publicarse.", "It’s waiting for review before going live.")
              : tx(locale, "Ya está publicado y visible en el mapa.", "It’s live and on the map.")
            : done.dupReview && done.pending
            ? tx(locale, "Como se parece a otro anuncio, alguien de nuestro equipo lo revisará antes de publicarlo. Te escribimos por email en cuanto esté listo.", "Since it looks like another listing, someone from our team will check it before it goes live. We’ll email you as soon as it’s ready.")
            : done.mode === "FSBO" && done.pending
            ? tx(locale, "Como tu cuenta es nueva, alguien de nuestro equipo revisará el anuncio antes de publicarlo. Te escribimos por email en cuanto esté listo.", "Since your account is new, someone from our team will look over the listing before it goes live. We’ll email you as soon as it’s ready.")
            : done.mode === "FSBO"
            ? tx(locale, "Pasó nuestra revisión y ya aparece en el mapa, listo para que lo descubran.", "It passed our checks and is on the map, ready to be discovered.")
            : tx(locale, `${agencies.find((a) => a.id === d.agency)?.name} te asignará un agente y se pondrá en contacto contigo pronto.`, `${agencies.find((a) => a.id === d.agency)?.name} will assign you an agent and be in touch soon.`)}
        </p>
        {photoWarn && <p role="alert" className="mt-4 rounded-lg bg-[#8A5A0014] px-3 py-2 text-sm text-warn">{photoWarn}</p>}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {done.mode === "AGENCY" ? (
            <Button href={`/${locale}/agency/listings/${done.id}/edit`}>{tx(locale, "Editar en el panel", "Edit in dashboard")}</Button>
          ) : (
            <Button href={`/${locale}/owner/listings`}>{tx(locale, "Ver mis inmuebles", "My properties")}</Button>
          )}
          {done.mode === "FSBO" && !done.pending && <Button href={`/${locale}/listing/${done.slug}`} variant="outline" className="border-navy/70 bg-transparent text-navy hover:bg-[#E6DDD2]">{tx(locale, "Ver el anuncio", "View listing")}</Button>}
        </div>
        {done.mode === "FSBO" && <OwnerNextSteps locale={locale} slug={done.slug} title={(locale === "es" ? d.copy.title_es : d.copy.title_en || d.copy.title_es) || tx(locale, "mi casa", "my home")} live={!done.pending} />}
      </div>
    );

  const canNext = step === 1 ? !!d.addr && !streetErr && (!dup || dupOverride) : step === 4 ? !priceErr : true;
  const facts = [
    beds > 0 && plural(beds, locale, ["habitación", "habitaciones"], ["bedroom", "bedrooms"]),
    baths > 0 && plural(baths, locale, ["baño", "baños"], ["bathroom", "bathrooms"]),
    `${num(d.m2, locale)} m²`,
    parking > 0 && plural(parking, locale, ["puesto", "puestos"], ["parking space", "parking spaces"]),
  ].filter(Boolean).join(" · ");
  const extrasSummary = [
    extras.payload.shortRent && `${tx(locale, "Mín.", "Min.")} ${plural(extras.payload.shortRent.minNights, locale, ["noche", "noches"], ["night", "nights"])} · ${plural(extras.payload.shortRent.maxGuests, locale, ["huésped", "huéspedes"], ["guest", "guests"])} · ${tx(locale, "limpieza", "cleaning")} ${money(extras.payload.shortRent.cleaningFee, locale)}`,
    extras.payload.commercial && `${extras.payload.commercial.ceilingHeight} m ${tx(locale, "altura libre", "clear height")} · ${extras.payload.commercial.zoning}${extras.payload.commercial.loadingDock ? ` · ${tx(locale, "andén de carga", "loading dock")}` : ""}${extras.payload.commercial.capRate !== undefined ? ` · cap rate ${extras.payload.commercial.capRate} %` : ""}`,
    luxury && tx(locale, "Lujo", "Luxury"),
    luxury && d.privateListing && tx(locale, "privado (solo por enlace)", "private (link only)"),
    ...essentialLabels(ess.payload, locale).map((x) => x.label),
  ].filter(Boolean).join(" · ");

  return (
    <div className="mx-auto grid max-w-[1200px] gap-8 px-4 py-8 md:px-6 lg:grid-cols-[1fr_340px]">
      <div>
        <div className="mb-6">
          <div className="mb-3 flex items-center justify-between text-sm">
            <span className="font-display font-semibold">{tx(locale, `Paso ${step + 1} de 6`, `Step ${step + 1} of 6`)} · {tx(locale, STEPS[step][0], STEPS[step][1])}</span>
            <span className="text-muted">{tx(locale, "Tu borrador se guarda en este dispositivo", "Your draft is saved on this device")}</span>
          </div>
          <div className="grid grid-cols-6 gap-1.5">
            {STEPS.map((s, i) => (
              <button key={i} onClick={() => i <= step && setStep(i)} className="min-h-11 py-2 text-left" aria-label={tx(locale, s[0], s[1])} aria-current={i === step ? "step" : undefined}>
                <div className={cn("h-1.5 rounded-full", i <= step ? "bg-navy dark:bg-ivory" : "bg-black/10")} />
                <div className={cn("mt-1.5 hidden text-xs sm:block", i === step ? "font-semibold text-ink" : "text-muted")}>{tx(locale, s[0], s[1])}</div>
              </button>
            ))}
          </div>
        </div>

        {step === 0 && (
          <div className="np-in space-y-6">
            <h1 className="font-serif text-[36px] font-medium leading-[1.05] md:text-[44px]">{staff ? tx(locale, "Nuevo inmueble de la agencia", "New agency listing") : tx(locale, "¿Cómo quieres vender o alquilar?", "How do you want to sell or rent?")}</h1>
            {!staff && <div className="grid gap-3 sm:grid-cols-2">
              <button className={opt(d.mode === "FSBO")} onClick={() => set({ mode: "FSBO" })}>
                <User strokeWidth={1.6} className="text-navy dark:text-ivory" />
                <div className="mt-2 font-display text-lg font-semibold">{tx(locale, "Publicar yo mismo", "List it myself")}</div>
                <div className="text-sm text-muted">{tx(locale, "Gratis. Tú atiendes las visitas y las ofertas.", "Free. You handle tours and offers yourself.")}</div>
              </button>
              <button className={opt(d.mode === "MANDATE")} onClick={() => set({ mode: "MANDATE" })}>
                <Building2 strokeWidth={1.6} className="text-navy dark:text-ivory" />
                <div className="mt-2 font-display text-lg font-semibold">{tx(locale, "Encargar a una agencia", "Hire an agency")}</div>
                <div className="text-sm text-muted">{tx(locale, "Un agente verificado se encarga de todo.", "A verified agent handles everything.")}</div>
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
                    <div className="mt-1 flex items-center gap-1 text-xs text-muted">{a.verified && <ShieldCheck size={12} className="text-ok" />} {a.verified ? tx(locale, "Verificada", "Verified") : tx(locale, "En verificación", "Pending verification")} · {a.commissionPct} %</div>
                  </button>
                ))}
              </div>
            )}
            <div>
              <div className="mb-2 font-semibold">{tx(locale, "Operación", "Operation")}</div>
              <div className="flex flex-wrap gap-2">
                {[["SALE", "Venta", "Sale"], ["LONG_RENT", "Alquiler", "Rent"], ["SHORT_RENT", "Vacacional", "Vacation"], ["COMMERCIAL_SALE", "Comercial · venta", "Commercial · sale"], ["COMMERCIAL_RENT", "Comercial · alquiler", "Commercial · rent"]].map(([k, es, en]) => (
                  <button key={k} onClick={() => setOp(k)} aria-pressed={d.op === k} className={cn("rounded-full border px-4 py-2 font-display text-sm", d.op === k ? "border-navy bg-[#E6DDD2] text-navy ring-1 ring-navy dark:bg-white/10 dark:ring-[#C9A574]" : "border-line bg-white")}>{tx(locale, es, en)}</button>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-2 font-semibold">{tx(locale, "Tipo de inmueble", "Property type")}</div>
              <div className="flex flex-wrap gap-2">
                {([["apartment", "Apartamento", "Apartment"], ["house", "Casa", "House"], ["penthouse", "Penthouse", "Penthouse"], ["townhouse", "Townhouse", "Townhouse"], ["studio", "Estudio", "Studio"], ["office", "Oficina", "Office"], ["retail", "Local", "Retail"], ["warehouse", "Galpón", "Warehouse"], ["land", "Terreno", "Land"]] as [Kind, string, string][]).map(([k, es, en]) => (
                  <button key={k} onClick={() => set({ kind: k })} className={cn("rounded-full border px-4 py-2 font-display text-sm", d.kind === k ? "border-navy bg-[#E6DDD2] text-navy ring-1 ring-navy dark:bg-white/10 dark:ring-[#C9A574]" : "border-line bg-white")}>{tx(locale, es, en)}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="np-in space-y-5">
            <h1 className="font-serif text-[36px] font-medium leading-[1.05] md:text-[44px]">{tx(locale, "¿Dónde está?", "Where is it?")}</h1>
            <PlacesSearch locale={locale} zones={zones} value={d.addr} onPick={(p) => set({ addr: p })} />
            {streetErr && <p role="alert" className="-mt-2 text-sm text-danger" data-testid="street-error">{streetErr}</p>}
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
            {d.addr && <p className="text-xs text-muted">{tx(locale, "Toca el mapa para ajustar el punto exacto.", "Tap the map to fine-tune the exact point.")}</p>}
            {d.addr && !streetErr && (
              <div className={cn("np-in flex flex-wrap items-center gap-3 rounded-np border p-3 text-sm", dup && !dupOverride ? "border-warn/60 bg-[#8A5A0014]" : "border-[#2F6B4F55] bg-[#2F6B4F0D]")}>
                {checking ? <Loader2 size={18} className="animate-spin" /> : dup && !dupOverride ? <AlertTriangle size={18} className="text-warn" /> : <CheckCircle2 size={18} className="text-ok" />}
                <span className="font-semibold">{tx(locale, "Ubicación marcada en el mapa", "Location marked on the map")}</span>
                {dup ? (
                  <DupNotice locale={locale} dup={dup} override={dupOverride} onOverride={() => setDupOverride(true)} hasUnit={!!d.unit.trim()} />
                ) : dupError ? (
                  <span className="text-muted">· {tx(locale, "Ahora no pudimos comprobar si ya está publicado; lo revisaremos cuando publiques.", "We couldn’t check for duplicates right now; we’ll check again when you publish.")}</span>
                ) : (
                  <span className="text-muted">· {tx(locale, "Sin duplicados: no encontramos otro anuncio igual", "No duplicates: we found no matching listing")}</span>
                )}
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="np-in space-y-5">
            <h1 className="font-serif text-[36px] font-medium leading-[1.05] md:text-[44px]">{tx(locale, "Cuéntanos cómo es", "Tell us about it")}</h1>
            <div className="grid gap-3 sm:grid-cols-2">
              {/* Empty while typing is allowed (0); the step can't continue until the value is valid. */}
              <Field label={d.kind === "land" ? tx(locale, "Superficie del terreno (m²)", "Plot area (m²)") : tx(locale, "Superficie construida (m²)", "Built area (m²)")} error={showDetailsErr ? detailsErr.m2 ?? undefined : undefined}>
                <input className={inputCls} type="number" inputMode="numeric" min={1} step={1} value={d.m2 || ""} aria-invalid={showDetailsErr && !!detailsErr.m2} onChange={(e) => set({ m2: Math.max(0, Math.round(+e.target.value || 0)) })} />
              </Field>
              <Field label={tx(locale, "Año de construcción", "Year built")} error={showDetailsErr ? detailsErr.year ?? undefined : undefined}>
                <input className={inputCls} type="number" inputMode="numeric" min={1800} max={THIS_YEAR + 5} value={d.year || ""} aria-invalid={showDetailsErr && !!detailsErr.year} onChange={(e) => set({ year: Math.max(0, Math.round(+e.target.value || 0)) })} />
              </Field>
              {hasBeds && stepper(tx(locale, "Habitaciones", "Bedrooms"), d.beds, (v) => set({ beds: v }))}
              {hasBaths && stepper(tx(locale, "Baños", "Bathrooms"), d.baths, (v) => set({ baths: v }))}
              {d.kind !== "land" && stepper(tx(locale, "Puestos", "Parking"), d.parking, (v) => set({ parking: v }))}
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
            <div className="rounded-[18px] bg-white p-5 shadow-[0_8px_24px_rgba(30,26,24,.06)]">
              <EssentialsFields locale={locale} value={d.ess} onChange={(x) => set({ ess: x })} showErrors={showExtrasErr} />
            </div>
            {!listingType.startsWith("COMMERCIAL") && RESIDENTIAL_KINDS.includes(d.kind) && (
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input type="checkbox" checked={d.luxury} onChange={(e) => set({ luxury: e.target.checked })} className="h-4 w-4 accent-navy dark:accent-[#C9A574]" />
                {tx(locale, "Inmueble de lujo", "Luxury property")}
              </label>
            )}
            <ListingTypeFields locale={locale} listingType={listingType} luxury={luxury} value={d.extras} onChange={(x) => set({ extras: x })} showErrors={showExtrasErr} />
            {luxury && (
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" checked={d.privateListing} onChange={(e) => set({ privateListing: e.target.checked })} className="mt-0.5 h-4 w-4 shrink-0 accent-navy dark:accent-[#C9A574]" />
                <span>
                  <span className="font-semibold">{tx(locale, "Anuncio privado", "Private listing")}</span>
                  <span className="block text-muted">{tx(locale, "No aparece en el buscador ni en el mapa; solo quien tenga el enlace puede verlo.", "Hidden from search and the map; only people with the link can see it.")}</span>
                </span>
              </label>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="np-in space-y-5">
            <h1 className="font-serif text-[36px] font-medium leading-[1.05] md:text-[44px]">{tx(locale, "Fotos que venden", "Photos that sell")}</h1>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              data-testid="photo-input"
              onChange={(e) => {
                const all = Array.from(e.target.files ?? []);
                const list = all.filter((f) => f.size <= 12 * 1024 * 1024);
                setFileNote(all.length > list.length ? tx(locale, `${all.length - list.length} foto(s) pesan más de 12 MB y no pudimos añadirlas.`, `${all.length - list.length} photo(s) are over 12 MB, so we left them out.`) : null);
                setFiles((prev) => [...prev, ...list].slice(0, 30));
                e.target.value = "";
              }}
            />
            <button
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const all = Array.from(e.dataTransfer.files).filter((f) => ["image/jpeg", "image/png", "image/webp"].includes(f.type));
                const list = all.filter((f) => f.size <= 12 * 1024 * 1024);
                setFileNote(all.length > list.length ? tx(locale, `${all.length - list.length} foto(s) pesan más de 12 MB y no pudimos añadirlas.`, `${all.length - list.length} photo(s) are over 12 MB, so we left them out.`) : null);
                setFiles((prev) => [...prev, ...list].slice(0, 30));
              }}
              className="flex w-full flex-col items-center rounded-np border-2 border-dashed border-line bg-white py-10 hover:border-navy"
            >
              <ImagePlus size={30} strokeWidth={1.5} className="text-navy dark:text-ivory" />
              <span className="mt-2 font-display font-semibold">{tx(locale, "Arrastra tus fotos o elígelas", "Drop your photos or browse")}</span>
              <span className="text-sm text-muted">JPG / PNG / WebP · {tx(locale, "hasta 12 MB cada una · lo ideal, entre 8 y 20", "up to 12 MB each · 8 to 20 is ideal")}</span>
            </button>
            {fileNote && <p role="alert" className="text-sm font-semibold text-warn">{fileNote}</p>}
            {files.length > 0 && (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {previews.map((src, i) => (
                  <div key={src} className={cn("group relative overflow-hidden rounded-lg ring-2", cover === i ? "ring-navy" : "ring-transparent")}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" className="aspect-[4/3] w-full object-cover" />
                    <span className="absolute left-1.5 top-1.5 rounded bg-navy/80 px-1.5 text-xs font-bold text-ivory">{i + 1}</span>
                    <button onClick={() => { setFiles(files.filter((_, j) => j !== i)); if (cover >= i && cover > 0) setCover(cover - 1); }} className="absolute right-1.5 top-1.5 rounded-full bg-navy/70 p-0.5 text-white" aria-label={tx(locale, "Quitar", "Remove")}><X size={14} /></button>
                    {cover === i ? (
                      <span className="absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 rounded-full bg-navy px-2 py-0.5 text-[11px] font-bold text-ivory"><Star size={11} /> {tx(locale, "Portada", "Cover")}</span>
                    ) : (
                      <button onClick={() => setCover(i)} className="absolute bottom-1.5 left-1.5 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-bold">{tx(locale, "Usar de portada", "Set cover")}</button>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              {[[files.length >= 8, tx(locale, `${files.length}/8 fotos recomendadas`, `${files.length}/8 recommended photos`)], [files.length > 0, tx(locale, "Portada elegida", "Cover set")]].map(([ok, t]) => (
                <div key={String(t)} className={cn("flex items-center gap-2 rounded-lg border px-3 py-2", ok ? "border-[#2F6B4F55] text-ok" : "border-line text-muted")}>{ok ? <CheckCircle2 size={16} /> : <span className="h-4 w-4 rounded-full border-2 border-current" />}{t as string}</div>
              ))}
            </div>
            {files.length === 0 && <p className="text-sm text-muted">{tx(locale, "Puedes continuar sin fotos y subirlas después desde «Mis inmuebles».", "You can continue without photos and add them later from “My properties”.")}</p>}
          </div>
        )}

        {step === 4 && (
          <div className="np-in space-y-5">
            <h1 className="font-serif text-[36px] font-medium leading-[1.05] md:text-[44px]">{tx(locale, "Precio y descripción", "Price & description")}</h1>
            <div className="rounded-[18px] bg-white shadow-[0_8px_24px_rgba(30,26,24,.06)] p-5">
              <div className="flex items-center gap-2 font-display font-semibold"><Sparkles size={17} strokeWidth={1.6} /> PlaceEstimate · {zone?.name}</div>
              {estimate ? (
                <>
                  <div className="mt-2 font-serif text-[36px] font-medium leading-[1.05] md:text-[44px]">{money(estimate.low, locale)} – {money(estimate.high, locale)}</div>
                  <div className="text-sm text-muted">{tx(locale, "Valor medio", "Mid value")} {money(estimate.mid, locale)} · {tx(locale, "confianza", "confidence")} {Math.round(estimate.confidence * 100)} % · {estimate.comparables.length} {tx(locale, "comparables", "comparables")}</div>
                </>
              ) : (
                <div className="mt-2 flex items-center gap-2 text-muted"><Loader2 size={16} className="animate-spin" /> {tx(locale, "Calculando…", "Calculating…")}</div>
              )}
              <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
                <Field label={tx(locale, `Tu precio (USD${priceUnit})`, `Your price (USD${priceUnit})`)} error={priceErr ?? undefined}>
                  <input className={inputCls} type="number" inputMode="numeric" min={1} step={1} value={d.price || ""} aria-invalid={!!priceErr} onChange={(e) => set({ price: Math.max(0, Math.round(+e.target.value || 0)) })} />
                </Field>
                {estimate && (
                  <div className="self-end pb-2.5 text-sm">
                    {d.price > estimate.high ? <span className="font-semibold text-warn">{tx(locale, "Por encima del rango", "Above range")}</span> : d.price < estimate.low ? <span className="font-semibold text-ok">{tx(locale, "Por debajo: venta rápida", "Below: quick sale")}</span> : <span className="font-semibold text-ok">{tx(locale, "Dentro del rango ✓", "Within range ✓")}</span>}
                  </div>
                )}
              </div>
              {fxVes > 0 && <div className="mt-2 text-xs text-muted">≈ Bs. {num(Math.round(d.price * fxVes), locale)} ({tx(locale, "tasa referencial", "reference rate")})</div>}
            </div>
            <div className="rounded-[18px] bg-white shadow-[0_8px_24px_rgba(30,26,24,.06)] p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-display font-semibold">{tx(locale, "Título y descripción (ES / EN)", "Title & description (ES / EN)")}</div>
                <Button size="sm" variant="navy" onClick={writeAI} disabled={writing}>
                  {writing ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} className="text-[#C9A574]" />} {tx(locale, "Redactar con IA", "Write with AI")}
                </Button>
              </div>
              <div className="mt-3 flex gap-2">
                {(["es", "en"] as Locale[]).map((x) => (
                  <button key={x} onClick={() => setLang(x)} className={cn("rounded-full px-3 py-0.5 text-xs font-bold", lang === x ? "bg-[#E6DDD2] text-navy shadow-[inset_0_0_0_2px_#1E1A18]" : "bg-black/5")}>{x.toUpperCase()}</button>
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
                placeholder={tx(locale, "Cuenta qué lo hace especial… o deja que la IA te ayude.", "Tell people what makes it special… or let AI help.")}
                aria-label={tx(locale, "Descripción", "Description")}
                value={lang === "es" ? d.copy.body_es : d.copy.body_en}
                onChange={(e) => set({ copy: { ...d.copy, [lang === "es" ? "body_es" : "body_en"]: e.target.value } })}
              />
              {aiErr && <div role="alert" className="mt-2 rounded-xl border border-danger/25 bg-[#B3261E0D] px-3.5 py-2.5 text-sm text-danger">{aiErr}</div>}
              <div className="mt-2 text-xs text-muted">{tx(locale, "Si lo dejas en blanco, escribimos un primer texto por ti al publicar.", "Leave it blank and we’ll write a first draft for you when you publish.")}</div>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="np-in space-y-5">
            <h1 className="font-serif text-[36px] font-medium leading-[1.05] md:text-[44px]">{tx(locale, "Revisa y publica", "Review & publish")}</h1>
            {dup && (
              <div className={cn("flex flex-wrap items-center gap-2 rounded-np border p-3 text-sm", dupOverride ? "border-[#2F6B4F55] bg-[#2F6B4F0D]" : "border-warn/60 bg-[#8A5A0014]")} role="alert">
                {dupOverride ? <CheckCircle2 size={18} className="text-ok" /> : <AlertTriangle size={18} className="text-warn" />}
                <DupNotice locale={locale} dup={dup} override={dupOverride} onOverride={() => { setDupOverride(true); setErr(null); }} hasUnit={!!d.unit.trim()} />
              </div>
            )}
            <div className="overflow-hidden rounded-[18px] bg-white shadow-[0_8px_24px_rgba(30,26,24,.06)]">
              <div className="grid sm:grid-cols-[260px_1fr]">
                {files.length ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previews[cover]} alt="" className="aspect-[4/3] w-full object-cover" />
                ) : (
                  <PropertyArt scene={d.kind === "house" ? "house-dusk" : "tower-day"} seed="wiz" className="aspect-[4/3] w-full" />
                )}
                <div className="p-5">
                  <div className="font-display text-2xl font-semibold">{money(d.price, locale)}<span className="text-sm font-normal text-muted">{priceUnit}</span></div>
                  <div className="font-semibold">{(lang === "es" ? d.copy.title_es : d.copy.title_en) || tx(locale, "(título automático)", "(auto title)")}</div>
                  <div className="text-sm text-muted" data-testid="review-address">{address}</div>
                  <div className="mt-2 text-sm" data-testid="review-facts">{facts}</div>
                  {extrasSummary && <div className="mt-1 text-sm text-muted">{extrasSummary}</div>}
                  <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#E6DDD2] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[.12em] text-navy">{d.mode === "AGENCY" ? tx(locale, "Inventario de la agencia", "Agency inventory") : d.mode === "FSBO" ? tx(locale, "Publicado por el propietario", "Listed by the owner") : tx(locale, "Encargo a agencia", "Agency mandate")}</div>
                </div>
              </div>
            </div>
            <div className="rounded-[18px] bg-white shadow-[0_8px_24px_rgba(30,26,24,.06)] p-5">
              <div className="flex items-center justify-between"><span className="font-display font-semibold">{tx(locale, "Calidad del anuncio", "Listing quality")}</span><span className="font-display text-2xl font-semibold text-ok">{quality}/100</span></div>
              <Progress value={quality} tone="ok" className="mt-2" />
              <ul className="mt-3 grid gap-1.5 text-sm sm:grid-cols-2">
                {[[files.length >= 8, tx(locale, "8+ fotos (+35)", "8+ photos (+35)")], [!!(d.copy.title_en && d.copy.body_en), tx(locale, "Bilingüe ES/EN (+20)", "Bilingual ES/EN (+20)")], [!!d.addr, tx(locale, "Geolocalizado (+20)", "Geolocated (+20)")], [false, tx(locale, "Plano (+15, después)", "Floor plan (+15, later)")]].map(([ok, t]) => (
                  <li key={String(t)} className={cn("flex items-center gap-2", ok ? "text-ok" : "text-muted")}>{ok ? <Check size={15} /> : <span className="h-3.5 w-3.5 rounded-full border-2 border-current" />}{t as string}</li>
                ))}
              </ul>
            </div>
            <label className="flex items-start gap-2 text-sm text-muted"><input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-navy dark:accent-[#C9A574]" /> {tx(locale, "Confirmo que soy el propietario o tengo autorización para publicar.", "I confirm I’m the owner or authorised to list.")}</label>
            {!confirm && <p className="text-xs text-muted">{tx(locale, "Marca la casilla para poder publicar.", "Tick the box to publish.")}</p>}
            {!user && <p className="rounded-lg bg-[#8E3B220D] px-3 py-2 text-sm">{tx(locale, "Para publicar te pediremos que entres a tu cuenta. Tu borrador no se pierde.", "We’ll ask you to sign in before publishing. Your draft stays safe.")}</p>}
            {err && <div className="rounded-xl border border-danger/25 bg-[#B3261E0D] px-3.5 py-2.5 text-sm text-danger" role="alert">{err}</div>}
          </div>
        )}

        <div className="mt-8 flex items-center justify-between border-t border-line pt-5">
          <Button variant="ghost" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}><ArrowLeft size={16} /> {tx(locale, "Atrás", "Back")}</Button>
          {step < 5 ? (
            <Button
              onClick={() => {
                if (step === 2 && (!extras.ok || !ess.ok || !detailsOk)) {
                  setShowExtrasErr(true);
                  setShowDetailsErr(true);
                  return;
                }
                setStep(step + 1);
              }}
              disabled={!canNext}
            >{tx(locale, "Continuar", "Continue")} <ArrowRight size={16} /></Button>
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
          <div className="overflow-hidden rounded-[18px] bg-white shadow-[0_8px_24px_rgba(30,26,24,.06)]">
            {files.length ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previews[cover]} alt="" className="aspect-[4/3] w-full object-cover" />
            ) : (
              <PropertyArt scene={d.kind === "house" ? "house-dusk" : "tower-day"} seed="ph" className="aspect-[4/3] w-full opacity-40" />
            )}
            <div className="p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted">{tx(locale, "Vista previa", "Preview")}</div>
              <div className="font-display text-xl font-semibold">{d.price ? <>{money(d.price, locale)}<span className="text-sm font-normal text-muted">{priceUnit}</span></> : <span className="text-muted">{tx(locale, "Precio pendiente", "Price to come")}</span>}</div>
              <div className="text-sm">{d.m2 ? facts : <span className="text-muted">{tx(locale, "Aquí verás los datos de tu casa", "Your home's details will show here")}</span>}</div>
              <div className="text-sm text-muted">{d.addr ? fullAddress([d.addr.zone, d.addr.city]) : tx(locale, "Dirección pendiente", "Address pending")}</div>
            </div>
          </div>
          <div className="rounded-np bg-navy p-4 text-ivory">
            <div className="flex items-center gap-2 font-display font-semibold"><Sparkles size={16} className="text-[#C9A574]" /> PlaceEstimate</div>
            <div className="mt-1 font-display text-2xl">{estimate ? money(estimate.mid, locale) : "—"}</div>
            <div className="text-xs text-mist">{tx(locale, "Cambia a medida que avanzas", "Updates as you go")}</div>
          </div>
          <Link href={`/${locale}/owner/listings`} className="block text-center text-sm text-muted underline-offset-4 hover:text-navy hover:underline"><MapPin size={13} className="inline" /> {tx(locale, "Guardar y salir", "Save & exit")}</Link>
        </div>
      </aside>
    </div>
  );
}

/** "Possible duplicate" notice with the way out: the owner can say it's another unit (→ manual review). */
function DupNotice({ locale, dup, override, onOverride, hasUnit }: { locale: Locale; dup: { title: string | null; slug: string | null }; override: boolean; onOverride: () => void; hasUnit: boolean }) {
  const link = dup.slug ? <Link className="font-semibold text-navy underline underline-offset-4" href={`/${locale}/listing/${dup.slug}`}>{dup.title}</Link> : tx(locale, "un anuncio que está en revisión o no es público.", "a listing that’s under review or not public.");
  if (override)
    return (
      <span data-testid="dup-override">
        · {tx(locale, "Entendido: es otra unidad. Alguien de nuestro equipo lo revisará antes de publicarlo.", "Got it: it’s a different unit. Someone from our team will check it before it goes live.")}
      </span>
    );
  return (
    <span className="flex flex-1 flex-wrap items-center gap-x-3 gap-y-2">
      <span>
        · {tx(locale, "Puede que ya esté publicado:", "It may already be listed:")} {link}
        {!hasUnit && <span className="block text-xs text-muted">{tx(locale, "Si es otro apartamento o casa, escribe arriba el piso / apto / casa.", "If it’s another flat or house, add the floor / unit above.")}</span>}
      </span>
      <button type="button" onClick={onOverride} className="rounded-full border border-navy/70 bg-white px-3 py-1.5 font-display text-sm font-semibold text-navy hover:bg-[#E6DDD2]">
        {tx(locale, "No es la misma casa — es otra unidad", "Not the same home — it’s another unit")}
      </button>
    </span>
  );
}

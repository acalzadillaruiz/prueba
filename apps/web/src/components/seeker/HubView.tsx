"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Bell, CalendarCheck, Check, CircleDollarSign, FileCheck2, Heart, Loader2 } from "lucide-react";
import type { PrequalInput } from "@newplace/config";
import type { Lead, Listing, Locale, Tour } from "@/types/domain";
import { listingPhoto } from "@/lib/photos";
import { PropertyArt } from "@/components/art/PropertyArt";
import { Avatar, Badge, Button, Card, Progress } from "@/components/ui";
import { useApp } from "@/lib/store";
import { Empty, k } from "@/components/agency/kit";
import { api } from "@/lib/api";
import { dateTime, money, tx } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { HubMessages, type HubThread } from "./HubMessages";
import { HubOffers, type HubOffer } from "./HubOffers";

type HubTour = Tour & { agentName: string; agentHue: number };

export interface HubData {
  /** Upcoming only (start ≥ now, requested or confirmed). */
  tours: HubTour[];
  pastTours: HubTour[];
  requests: Lead[];
  listings: Listing[];
  savedIds: string[];
  searches: { id: string; name: string; newCount: number }[];
  threads: HubThread[];
  offers: HubOffer[];
  /** Listings the buyer can bid on (lead or tour, still available). */
  offerable: string[];
  prequal: PrequalInput | null;
}

const PREQUAL_DEFAULT: PrequalInput = { price: 180000, downPct: 30, years: 15, ratePct: 10.5 };

export function HubView({ locale, data }: { locale: Locale; data: HubData }) {
  const { user } = useApp();
  const me = user ?? { name: "—", initials: "?", hue: 200 };
  const byId = new Map(data.listings.map((l) => [l.id, l]));
  const listingById = (id: string) => byId.get(id);
  const saved = data.savedIds;
  const myTours = data.tours;
  // Leads that already have a tour (upcoming or past) are shown through the tour.
  const extraLeads = data.requests.filter((r) => ![...data.tours, ...data.pastTours].some((t) => t.leadId === r.id));
  const SAVED_SEARCHES = data.searches;
  const [savedPrequal, setSavedPrequal] = useState<PrequalInput | null>(data.prequal);
  const init = data.prequal ?? PREQUAL_DEFAULT;
  const [price, setPrice] = useState(init.price);
  const [down, setDown] = useState(init.downPct);
  const [years, setYears] = useState(init.years);
  const [ratePct, setRatePct] = useState(init.ratePct);
  const [prequalBusy, setPrequalBusy] = useState(false);
  const [prequalErr, setPrequalErr] = useState<string | null>(null);
  const [offerCount, setOfferCount] = useState(data.offers.length);
  const loan = price * (1 - down / 100);
  const n = years * 12;
  const r = ratePct / 100 / 12;
  const monthly = r === 0 ? loan / n : (loan * r) / (1 - Math.pow(1 + r, -n));
  const dirty = !savedPrequal || savedPrequal.price !== price || savedPrequal.downPct !== down || savedPrequal.years !== years || savedPrequal.ratePct !== ratePct;
  const savePrequal = async () => {
    setPrequalBusy(true);
    setPrequalErr(null);
    const prequal = { price, downPct: down, years, ratePct };
    try {
      await api("me", { method: "PATCH", json: { prequal } });
      setSavedPrequal(prequal);
    } catch (e) {
      setPrequalErr((e as Error).message);
    } finally {
      setPrequalBusy(false);
    }
  };
  const tourCount = myTours.length + data.pastTours.length + extraLeads.length;
  const steps = [
    { done: SAVED_SEARCHES.length > 0, t: tx(locale, "Define tu búsqueda", "Define your search"), d: tx(locale, `${SAVED_SEARCHES.length} alertas activas`, `${SAVED_SEARCHES.length} active alerts`) },
    { done: saved.length > 0, t: tx(locale, "Guarda y compara", "Save and compare"), d: `${saved.length} ${tx(locale, "guardados", "saved")}` },
    { done: tourCount > 0, t: tx(locale, "Visita tus favoritos", "Tour your favorites"), d: `${tourCount} ${tx(locale, "visitas", "tours")}` },
    { done: !!savedPrequal, t: tx(locale, "Precalificación (simulada)", "Pre-qualification (mock)"), d: savedPrequal ? tx(locale, `Hasta ${money(savedPrequal.price, locale)}`, `Up to ${money(savedPrequal.price, locale)}`) : tx(locale, "Sin compromiso", "No commitment") },
    { done: offerCount > 0, t: tx(locale, "Haz una oferta", "Make an offer"), d: offerCount > 0 ? tx(locale, `${offerCount} ${offerCount === 1 ? "oferta" : "ofertas"}`, `${offerCount} ${offerCount === 1 ? "offer" : "offers"}`) : tx(locale, "Con tu agente", "With your agent") },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  return (
    <div className="mx-auto max-w-[1280px] px-4 py-10 md:px-6">
      <div className="flex flex-wrap items-center gap-4">
        <Avatar initials={me.initials} hue={me.hue} size={56} />
        <div>
          <div className={k.eyebrow}>Homebuyer Hub</div>
          <h1 className="mt-1 font-serif text-[40px] font-medium leading-[1.05] md:text-[48px]">{tx(locale, `Hola, ${me.name.split(" ")[0]}`, `Hi, ${me.name.split(" ")[0]}`)}</h1>
        </div>
        <div className="ml-auto w-full max-w-xs">
          <div className="mb-1 flex justify-between text-sm"><span className="font-semibold">{tx(locale, "Tu avance", "Your progress")}</span><span className="text-muted">{doneCount}/5</span></div>
          <Progress value={(doneCount / 5) * 100} tone="ok" />
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {/* next steps */}
        <Card className={cn(k.card, "border-0 p-5 lg:col-span-1")}>
          <h2 className="font-serif text-[24px] font-medium leading-tight">{tx(locale, "Siguientes pasos", "Next steps")}</h2>
          <ol className="mt-4 space-y-3">
            {steps.map((s, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className={cn("mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold", s.done ? "bg-ok text-white" : "border-2 border-line text-muted")}>{s.done ? <Check size={14} /> : i + 1}</span>
                <div>
                  <div className={cn("font-semibold", s.done && "text-muted line-through")}>{s.t}</div>
                  <div className="text-sm text-muted">{s.d}</div>
                </div>
              </li>
            ))}
          </ol>
        </Card>

        {/* tours */}
        <Card className={cn(k.card, "border-0 p-5 lg:col-span-2")}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-serif text-[24px] font-medium leading-tight"><CalendarCheck size={18} strokeWidth={1.6} className="text-navy/70 dark:text-ivory/70" /> {tx(locale, "Mis visitas y solicitudes", "My tours & requests")}</h2>
            <Badge tone="ok">{tx(locale, "Recordatorio por email", "Email reminders on")}</Badge>
          </div>
          <div className="mt-4 space-y-3">
            {extraLeads.map((ld) => {
              const l = listingById(ld.listingId);
              if (!l) return null;
              return (
                <div key={ld.id} className="np-in flex flex-wrap items-center gap-4 rounded-2xl bg-[#F6F2EA] p-3 sm:flex-nowrap dark:bg-white/[.05]">
                  <PropertyArt scene={l.scenes[0]} seed={l.id} photo={listingPhoto(l, 0)} className="h-16 w-24 shrink-0 rounded-lg" />
                  <div className="min-w-0 flex-1">
                    <div className="line-clamp-1 font-semibold">{tx(locale, l.title_es, l.title_en)}</div>
                    <div className="line-clamp-1 text-sm text-muted">{ld.message}</div>
                  </div>
                  <Badge tone={ld.stage === "NEW" ? "warn" : "ok"}>{ld.stage === "NEW" ? tx(locale, "Esperando respuesta", "Awaiting reply") : tx(locale, "En contacto", "In contact")}</Badge>
                </div>
              );
            })}
            {myTours.map((t) => <TourRow key={t.id} t={t} l={listingById(t.listingId)} locale={locale} />)}
            {myTours.length === 0 && extraLeads.length === 0 && (
              <Empty className="py-6"
                title={tx(locale, "Sin visitas próximas", "No upcoming tours")}
                body={tx(locale, "Pide una visita desde cualquier ficha con los horarios reales del agente.", "Book a tour from any listing using the agent’s real calendar.")}
                cta={<Button href={`/${locale}/search`} size="sm" variant="outline" className={k.outline}>{tx(locale, "Buscar inmuebles", "Browse homes")}</Button>}
              />
            )}
            {data.pastTours.length > 0 && (
              <div className="pt-2">
                <div className={cn("mb-2", k.label)}>{tx(locale, "Visitas pasadas", "Past tours")}</div>
                <div className="space-y-3 opacity-80">
                  {data.pastTours.map((t) => <TourRow key={t.id} t={t} l={listingById(t.listingId)} locale={locale} past />)}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* messages */}
        <HubMessages locale={locale} threads={data.threads} meId={user?.id ?? ""} listingById={listingById} />

        {/* preapproval mock */}
        <Card className={cn(k.card, "border-0 p-5")}>
          <h2 className="flex items-center gap-2 font-serif text-[24px] font-medium leading-tight"><CircleDollarSign size={18} strokeWidth={1.6} className="text-navy/70 dark:text-ivory/70" /> {tx(locale, "Precalificación (simulada)", "Pre-qualification (mock)")}</h2>
          <p className="mt-1 text-xs text-muted">{tx(locale, "Referencial. New Place no origina créditos.", "For reference. New Place does not originate loans.")}</p>
          <div className="mt-4 space-y-4 text-sm">
            <label className="block"><div className="flex justify-between"><span>{tx(locale, "Precio", "Price")}</span><b>{money(price, locale)}</b></div><input type="range" min={50000} max={500000} step={5000} value={price} onChange={(e) => setPrice(+e.target.value)} className="w-full accent-navy dark:accent-[#C9A574]" aria-label={tx(locale, "Precio", "Price")} /></label>
            <label className="block"><div className="flex justify-between"><span>{tx(locale, "Inicial", "Down payment")}</span><b>{down} %</b></div><input type="range" min={10} max={70} value={down} onChange={(e) => setDown(+e.target.value)} className="w-full accent-navy dark:accent-[#C9A574]" aria-label={tx(locale, "Inicial (%)", "Down payment (%)")} /></label>
            <label className="block"><div className="flex justify-between"><span>{tx(locale, "Plazo", "Term")}</span><b>{years} {tx(locale, "años", "yrs")}</b></div><input type="range" min={5} max={25} value={years} onChange={(e) => setYears(+e.target.value)} className="w-full accent-navy dark:accent-[#C9A574]" aria-label={tx(locale, "Plazo (años)", "Term (years)")} /></label>
            <label className="block"><div className="flex justify-between"><span>{tx(locale, "Tasa anual", "Annual rate")}</span><b>{ratePct.toLocaleString(locale === "es" ? "es-VE" : "en-US")} %</b></div><input type="range" min={0} max={30} step={0.5} value={ratePct} onChange={(e) => setRatePct(+e.target.value)} className="w-full accent-navy dark:accent-[#C9A574]" aria-label={tx(locale, "Tasa anual (%)", "Annual rate (%)")} /></label>
          </div>
          <div className="mt-4 rounded-np bg-navy p-4 text-ivory">
            <div className="text-xs text-mist">{tx(locale, `Cuota estimada (${ratePct.toLocaleString("es-VE")} % anual)`, `Est. payment (${ratePct}% APR)`)}</div>
            <div className="font-display text-3xl font-semibold">{money(Math.round(monthly), locale)}<span className="text-sm font-normal text-mist"> / {tx(locale, "mes", "mo")}</span></div>
          </div>
          <Button className={cn("mt-3 w-full", k.outline)} variant="outline" onClick={savePrequal} disabled={prequalBusy || !dirty}>
            {prequalBusy ? <Loader2 size={16} className="animate-spin" /> : savedPrequal && !dirty ? <Check size={16} /> : <FileCheck2 size={16} />}
            {savedPrequal && !dirty ? tx(locale, "Precalificación guardada", "Pre-qualification saved") : tx(locale, "Guardar y generar carta", "Save and generate letter")}
          </Button>
          {prequalErr && <div role="alert" className="mt-2 rounded-xl border border-danger/25 bg-[#B3261E0D] px-3.5 py-2.5 text-sm text-danger">{prequalErr}</div>}
          {savedPrequal && (
            <div className="np-in mt-3 rounded-np border border-dashed border-line p-3 text-xs leading-relaxed text-ink/70" data-testid="prequal-letter">
              <b>{tx(locale, "Carta de precalificación (simulada)", "Pre-qualification letter (mock)")}</b>
              <br />
              {tx(
                locale,
                `${me.name} califica de forma preliminar para un inmueble de hasta ${money(savedPrequal.price, locale)} con ${savedPrequal.downPct} % de inicial a ${savedPrequal.years} años. Documento sin validez bancaria.`,
                `${me.name} is preliminarily qualified for a home up to ${money(savedPrequal.price, locale)} with ${savedPrequal.downPct}% down over ${savedPrequal.years} years. Not a bank document.`,
              )}
            </div>
          )}
        </Card>

        {/* offers */}
        <HubOffers locale={locale} offers={data.offers} offerable={data.offerable} listingById={listingById} onChange={setOfferCount} />

        {/* saved + alerts */}
        <div className="space-y-6">
          <Card className={cn(k.card, "border-0 p-5")}>
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-serif text-[24px] font-medium leading-tight"><Heart size={18} strokeWidth={1.6} className="text-navy/70 dark:text-ivory/70" /> {tx(locale, "Guardados", "Saved")}</h2>
              <Link href={`/${locale}/saved`} className={cn("text-sm", k.link)}>{tx(locale, "Ver todo", "See all")}</Link>
            </div>
            <div className="mt-4 space-y-3">
              {saved.length === 0 && <p className="text-sm text-muted">{tx(locale, "Toca el corazón en cualquier ficha para guardarla.", "Tap the heart on any listing to save it.")}</p>}
              {saved.slice(0, 4).map((id) => {
                const l = listingById(id);
                if (!l) return null;
                return (
                  <Link key={id} href={`/${locale}/listing/${l.slug}`} className="flex items-center gap-3">
                    <PropertyArt scene={l.scenes[0]} seed={l.id} photo={listingPhoto(l, 0)} className="h-12 w-16 shrink-0 rounded-md" />
                    <div className="min-w-0">
                      <div className="line-clamp-1 text-sm font-semibold">{tx(locale, l.title_es, l.title_en)}</div>
                      <div className="text-sm text-muted">{money(l.priceAmount, locale)} · {l.zone}</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </Card>
          <Card className={cn(k.card, "border-0 p-5")}>
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-serif text-[24px] font-medium leading-tight"><Bell size={18} strokeWidth={1.6} className="text-navy/70 dark:text-ivory/70" /> {tx(locale, "Alertas", "Alerts")}</h2>
              <Link href={`/${locale}/alerts`} className={cn("text-sm", k.link)}>{tx(locale, "Gestionar", "Manage")}</Link>
            </div>
            {SAVED_SEARCHES.length === 0 && <p className="mt-3 text-sm text-muted">{tx(locale, "Guarda una búsqueda desde el mapa y te avisamos.", "Save a search from the map and we’ll let you know.")}</p>}
            {SAVED_SEARCHES.map((s) => (
              <div key={s.id} className="mt-3 flex items-center justify-between gap-2 text-sm">
                <span className="line-clamp-1">{s.name}</span>
                {s.newCount > 0 && <Badge className="bg-[#E6DDD2] text-navy dark:bg-white/10">+{s.newCount}</Badge>}
              </div>
            ))}
          </Card>
        </div>
      </div>
      <div className="mt-8 flex justify-center">
        <Button href={`/${locale}/search`} variant="navy" size="lg">{tx(locale, "Seguir buscando en el mapa", "Keep searching the map")} <ArrowRight size={16} /></Button>
      </div>
    </div>
  );
}

function TourRow({ t, l, locale, past }: { t: HubTour; l: Listing | undefined; locale: Locale; past?: boolean }) {
  if (!l) return null;
  const initials = t.agentName.split(" ").map((p) => p[0]).slice(0, 2).join("");
  const status = past
    ? t.status === "CANCELLED"
      ? { tone: "danger" as const, label: tx(locale, "Cancelada", "Cancelled") }
      : { tone: "mist" as const, label: tx(locale, "Realizada", "Done") }
    : t.status === "CONFIRMED"
      ? { tone: "ok" as const, label: tx(locale, "Confirmada", "Confirmed") }
      : { tone: "warn" as const, label: tx(locale, "Solicitada", "Requested") };
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-np border border-line p-3 sm:flex-nowrap">
      <PropertyArt scene={l.scenes[0]} seed={l.id} photo={listingPhoto(l, 0)} className="h-16 w-24 shrink-0 rounded-lg" />
      <div className="min-w-0 flex-1">
        <Link href={`/${locale}/listing/${l.slug}`} className="line-clamp-1 font-semibold hover:underline">{tx(locale, l.title_es, l.title_en)}</Link>
        <div className="text-sm text-muted">{l.address}</div>
        <div className="mt-0.5 flex items-center gap-1.5 text-sm"><Avatar initials={initials} hue={t.agentHue} size={18} /> {t.agentName}</div>
      </div>
      <div className="w-full sm:w-auto sm:text-right">
        <div className={cn("font-display font-semibold first-letter:uppercase", past && "text-muted")}>{dateTime(t.start, locale)}</div>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>
    </div>
  );
}

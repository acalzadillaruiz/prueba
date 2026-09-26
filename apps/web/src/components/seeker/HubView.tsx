"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Bell, CalendarCheck, Check, CircleDollarSign, FileCheck2, Heart, KeyRound, MessageSquare, Video } from "lucide-react";
import type { Lead, Listing, Locale, Tour } from "@/types/domain";
import { listingPhoto } from "@/lib/photos";
import { PropertyArt } from "@/components/art/PropertyArt";
import { Avatar, Badge, Button, Card, Progress } from "@/components/ui";
import { useApp } from "@/lib/store";
import { ago, dateTime, money, tx } from "@/lib/i18n";
import { cn } from "@/lib/cn";

export interface HubData {
  tours: (Tour & { agentName: string; agentHue: number })[];
  requests: Lead[];
  listings: Listing[];
  savedIds: string[];
  searches: { id: string; name: string; newCount: number }[];
  lastMessage: { from: string; body: string; at: string } | null;
}

export function HubView({ locale, data }: { locale: Locale; data: HubData }) {
  const { user } = useApp();
  const me = user ?? { name: "—", initials: "?", hue: 200 };
  const byId = new Map(data.listings.map((l) => [l.id, l]));
  const listingById = (id: string) => byId.get(id);
  const saved = data.savedIds;
  const myTours = data.tours;
  const extraLeads = data.requests.filter((r) => !data.tours.some((t) => t.leadId === r.id));
  const SAVED_SEARCHES = data.searches;
  const [letter, setLetter] = useState(false);
  const [price, setPrice] = useState(180000);
  const [down, setDown] = useState(30);
  const [years, setYears] = useState(15);
  const rate = 0.105;
  const loan = price * (1 - down / 100);
  const n = years * 12;
  const r = rate / 12;
  const monthly = (loan * r) / (1 - Math.pow(1 + r, -n));
  const steps = [
    { done: SAVED_SEARCHES.length > 0, t: tx(locale, "Define tu búsqueda", "Define your search"), d: tx(locale, `${SAVED_SEARCHES.length} alertas activas`, `${SAVED_SEARCHES.length} active alerts`) },
    { done: saved.length > 0, t: tx(locale, "Guarda y compara", "Save and compare"), d: `${saved.length} ${tx(locale, "guardados", "saved")}` },
    { done: myTours.length + extraLeads.length > 0, t: tx(locale, "Visita tus favoritos", "Tour your favorites"), d: `${myTours.length + extraLeads.length} ${tx(locale, "visitas", "tours")}` },
    { done: letter, t: tx(locale, "Precalificación (simulada)", "Pre-qualification (mock)"), d: tx(locale, "Sin compromiso", "No commitment") },
    { done: false, t: tx(locale, "Haz una oferta", "Make an offer"), d: tx(locale, "Con tu agente", "With your agent") },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  return (
    <div className="mx-auto max-w-[1280px] px-4 py-10 md:px-6">
      <div className="flex flex-wrap items-center gap-4">
        <Avatar initials={me.initials} hue={me.hue} size={56} />
        <div>
          <div className="text-sm text-ink/55">Homebuyer Hub</div>
          <h1 className="font-display text-3xl font-semibold">{tx(locale, `Hola, ${me.name.split(" ")[0]}`, `Hi, ${me.name.split(" ")[0]}`)}</h1>
        </div>
        <div className="ml-auto w-full max-w-xs">
          <div className="mb-1 flex justify-between text-sm"><span className="font-semibold">{tx(locale, "Tu avance", "Your progress")}</span><span className="text-ink/55">{doneCount}/5</span></div>
          <Progress value={(doneCount / 5) * 100} />
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {/* next steps */}
        <Card className="p-5 lg:col-span-1">
          <div className="font-display text-lg font-semibold">{tx(locale, "Siguientes pasos", "Next steps")}</div>
          <ol className="mt-4 space-y-3">
            {steps.map((s, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className={cn("mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold", s.done ? "bg-ok text-white" : "border-2 border-line text-ink/40")}>{s.done ? <Check size={14} /> : i + 1}</span>
                <div>
                  <div className={cn("font-semibold", s.done && "text-ink/50 line-through")}>{s.t}</div>
                  <div className="text-sm text-ink/55">{s.d}</div>
                </div>
              </li>
            ))}
          </ol>
        </Card>

        {/* tours */}
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-display text-lg font-semibold"><CalendarCheck size={18} className="text-coral" /> {tx(locale, "Mis visitas y solicitudes", "My tours & requests")}</div>
            <Badge tone="ok">{tx(locale, "Recordatorio por email", "Email reminders on")}</Badge>
          </div>
          <div className="mt-4 space-y-3">
            {extraLeads.map((ld) => {
              const l = listingById(ld.listingId);
              if (!l) return null;
              return (
                <div key={ld.id} className="np-in flex flex-wrap items-center gap-4 rounded-np border border-coral/40 bg-[#F26B4D0A] p-3 sm:flex-nowrap">
                  <PropertyArt scene={l.scenes[0]} seed={l.id} photo={listingPhoto(l, 0)} className="h-16 w-24 shrink-0 rounded-lg" />
                  <div className="min-w-0 flex-1">
                    <div className="line-clamp-1 font-semibold">{tx(locale, l.title_es, l.title_en)}</div>
                    <div className="line-clamp-1 text-sm text-ink/60">{ld.message}</div>
                  </div>
                  <Badge tone={ld.stage === "NEW" ? "warn" : "ok"}>{ld.stage === "NEW" ? tx(locale, "Esperando respuesta", "Awaiting reply") : tx(locale, "En contacto", "In contact")}</Badge>
                </div>
              );
            })}
            {myTours.map((t) => {
              const l = listingById(t.listingId);
              if (!l) return null;
              const a = { name: t.agentName, hue: t.agentHue, initials: t.agentName.split(" ").map((p) => p[0]).slice(0, 2).join("") };
              return (
                <div key={t.id} className="flex flex-wrap items-center gap-4 rounded-np border border-line p-3 sm:flex-nowrap">
                  <PropertyArt scene={l.scenes[0]} seed={l.id} photo={listingPhoto(l, 0)} className="h-16 w-24 shrink-0 rounded-lg" />
                  <div className="min-w-0 flex-1">
                    <div className="line-clamp-1 font-semibold">{tx(locale, l.title_es, l.title_en)}</div>
                    <div className="text-sm text-ink/60">{l.address}</div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-sm"><Avatar initials={a.initials} hue={a.hue} size={18} /> {a.name}</div>
                  </div>
                  <div className="w-full sm:w-auto sm:text-right">
                    <div className="font-display font-semibold capitalize">{dateTime(t.start, locale)}</div>
                    <Badge tone={t.status === "CONFIRMED" ? "ok" : "warn"}>{t.status === "CONFIRMED" ? tx(locale, "Confirmada", "Confirmed") : tx(locale, "Solicitada", "Requested")}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* preapproval mock */}
        <Card className="p-5">
          <div className="flex items-center gap-2 font-display text-lg font-semibold"><CircleDollarSign size={18} className="text-coral" /> {tx(locale, "Precalificación (simulada)", "Pre-qualification (mock)")}</div>
          <p className="mt-1 text-xs text-ink/50">{tx(locale, "Referencial. New Place no origina créditos.", "For reference. New Place does not originate loans.")}</p>
          <div className="mt-4 space-y-4 text-sm">
            <label className="block"><div className="flex justify-between"><span>{tx(locale, "Precio", "Price")}</span><b>{money(price, locale)}</b></div><input type="range" min={50000} max={500000} step={5000} value={price} onChange={(e) => setPrice(+e.target.value)} className="w-full accent-[#F26B4D]" /></label>
            <label className="block"><div className="flex justify-between"><span>{tx(locale, "Inicial", "Down payment")}</span><b>{down} %</b></div><input type="range" min={10} max={70} value={down} onChange={(e) => setDown(+e.target.value)} className="w-full accent-[#F26B4D]" /></label>
            <label className="block"><div className="flex justify-between"><span>{tx(locale, "Plazo", "Term")}</span><b>{years} {tx(locale, "años", "yrs")}</b></div><input type="range" min={5} max={25} value={years} onChange={(e) => setYears(+e.target.value)} className="w-full accent-[#F26B4D]" /></label>
          </div>
          <div className="mt-4 rounded-np bg-navy p-4 text-ivory">
            <div className="text-xs text-mist">{tx(locale, "Cuota estimada (10,5 % anual)", "Est. payment (10.5% APR)")}</div>
            <div className="font-display text-3xl font-semibold">{money(Math.round(monthly), locale)}<span className="text-sm font-normal text-mist"> / {tx(locale, "mes", "mo")}</span></div>
          </div>
          <Button className="mt-3 w-full" variant="outline" onClick={() => setLetter(true)}><FileCheck2 size={16} /> {tx(locale, "Generar carta (mock)", "Generate letter (mock)")}</Button>
          {letter && (
            <div className="np-in mt-3 rounded-np border border-dashed border-line p-3 text-xs leading-relaxed text-ink/70">
              <b>{tx(locale, "Carta de precalificación (simulada)", "Pre-qualification letter (mock)")}</b>
              <br />
              {tx(locale, `${me.name} califica de forma preliminar para un inmueble de hasta ${money(price, locale)} con ${down} % de inicial a ${years} años. Documento sin validez bancaria.`, `${me.name} is preliminarily qualified for a home up to ${money(price, locale)} with ${down}% down over ${years} years. Not a bank document.`)}
            </div>
          )}
        </Card>

        {/* saved */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-display text-lg font-semibold"><Heart size={18} className="text-coral" /> {tx(locale, "Guardados", "Saved")}</div>
            <Link href={`/${locale}/saved`} className="text-sm font-semibold text-coral">{tx(locale, "Ver todo", "See all")}</Link>
          </div>
          <div className="mt-4 space-y-3">
            {saved.slice(0, 4).map((id) => {
              const l = listingById(id);
              if (!l) return null;
              return (
                <Link key={id} href={`/${locale}/listing/${l.slug}`} className="flex items-center gap-3">
                  <PropertyArt scene={l.scenes[0]} seed={l.id} photo={listingPhoto(l, 0)} className="h-12 w-16 shrink-0 rounded-md" />
                  <div className="min-w-0">
                    <div className="line-clamp-1 text-sm font-semibold">{tx(locale, l.title_es, l.title_en)}</div>
                    <div className="text-sm text-ink/55">{money(l.priceAmount, locale)} · {l.zone}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </Card>

        {/* alerts + messages */}
        <div className="space-y-6">
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-display text-lg font-semibold"><Bell size={18} className="text-coral" /> {tx(locale, "Alertas", "Alerts")}</div>
              <Link href={`/${locale}/alerts`} className="text-sm font-semibold text-coral">{tx(locale, "Gestionar", "Manage")}</Link>
            </div>
            {SAVED_SEARCHES.map((s) => (
              <div key={s.id} className="mt-3 flex items-center justify-between text-sm">
                <span className="line-clamp-1">{s.name}</span>
                {s.newCount > 0 && <Badge tone="coral">+{s.newCount}</Badge>}
              </div>
            ))}
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-2 font-display text-lg font-semibold"><MessageSquare size={18} className="text-coral" /> {tx(locale, "Mensajes", "Messages")}</div>
            {data.lastMessage ? (
              <div className="mt-3 flex items-start gap-3">
                <Avatar initials={data.lastMessage.from.split(" ").map((p) => p[0]).slice(0, 2).join("")} hue={340} size={34} />
                <div className="text-sm">
                  <div className="font-semibold">{data.lastMessage.from} <span className="font-normal text-ink/50">· {ago(data.lastMessage.at, locale)}</span></div>
                  <div className="text-ink/65">{data.lastMessage.body}</div>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-ink/55">{tx(locale, "Aún no tienes mensajes. Escribe desde cualquier ficha.", "No messages yet. Write from any listing.")}</p>
            )}
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="outline"><Video size={14} /> {tx(locale, "Videollamada", "Video call")}</Button>
              <Button size="sm" variant="outline"><KeyRound size={14} /> {tx(locale, "Documentos", "Documents")}</Button>
            </div>
          </Card>
        </div>
      </div>
      <div className="mt-8 flex justify-center">
        <Button href={`/${locale}/search`} variant="navy" size="lg">{tx(locale, "Seguir buscando en el mapa", "Keep searching the map")} <ArrowRight size={16} /></Button>
      </div>
    </div>
  );
}

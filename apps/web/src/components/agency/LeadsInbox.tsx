"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarPlus, Clock, Mail, MessageCircle, Phone, RefreshCw, Send, Sparkles, Star, Target } from "lucide-react";
import { heuristicLeadScore, type NextAction } from "@newplace/ai";
import type { Lead, LeadStage, Locale } from "@/types/domain";
import { AdminShell } from "@/components/layout/AdminShell";
import { listingPhoto } from "@/lib/photos";
import { PropertyArt } from "@/components/art/PropertyArt";
import { Avatar, Badge, Button } from "@/components/ui";
import { useDemo } from "@/lib/store";
import { listingById } from "@/mock/listings";
import { userById } from "@/mock/people";
import { ago, money, priceSuffix, tx } from "@/lib/i18n";
import { cn } from "@/lib/cn";

const STAGES: [LeadStage, string, string][] = [
  ["NEW", "Nuevo", "New"],
  ["CONTACTED", "Contactado", "Contacted"],
  ["TOUR", "Visita", "Tour"],
  ["OFFER", "Oferta", "Offer"],
  ["WON", "Ganado", "Won"],
  ["LOST", "Perdido", "Lost"],
];

const ACTION: Record<NextAction, [string, string, React.ElementType]> = {
  CALL: ["Llamar ahora", "Call now", Phone],
  WHATSAPP_NOTE: ["Nota por WhatsApp", "WhatsApp note", MessageCircle],
  PROPOSE_TOUR: ["Proponer visita", "Propose tour", CalendarPlus],
  SEND_SIMILARS: ["Enviar similares", "Send similar homes", Send],
  NURSE: ["Nutrir con contenido", "Nurture", Mail],
};

const minsAgo = (iso: string) => Math.round((Date.parse("2026-09-26T18:00:00Z") - Date.parse(iso)) / 60000);

function ScoreRing({ score }: { score: number }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 80 80" className="h-20 w-20">
      <circle cx={40} cy={40} r={r} fill="none" stroke="#22304a" strokeWidth={7} />
      <circle cx={40} cy={40} r={r} fill="none" stroke={score >= 70 ? "#F26B4D" : score >= 45 ? "#D4AF77" : "#8AA4B5"} strokeWidth={7} strokeDasharray={`${(score / 100) * c} ${c}`} strokeLinecap="round" transform="rotate(-90 40 40)" />
      <text x={40} y={46} textAnchor="middle" fontSize={20} fontWeight={700} fill="#F7F4EF" fontFamily="var(--font-display)">{score}</text>
    </svg>
  );
}

function Sla({ lead, locale }: { lead: Lead; locale: Locale }) {
  const m = minsAgo(lead.createdAt);
  if (lead.stage !== "NEW") return lead.firstResponseMin ? <span className="text-[11px] text-mist">{tx(locale, "resp.", "resp.")} {lead.firstResponseMin} min</span> : null;
  const left = 15 - m;
  const pct = Math.max(0, Math.min(100, (m / 15) * 100));
  return (
    <div className="w-20">
      <div className={cn("text-right text-[11px] font-bold", left > 5 ? "text-[#7FD3A8]" : left > 0 ? "text-[#F2B866]" : "text-[#FF8A7A]")}>{left > 0 ? `${left} min` : tx(locale, "SLA vencido", "SLA breached")}</div>
      <div className="mt-1 h-1 rounded-full bg-white/10"><div className={cn("h-full rounded-full", left > 5 ? "bg-ok" : left > 0 ? "bg-warn" : "bg-danger")} style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

export function LeadsInbox({ locale }: { locale: Locale }) {
  const { leads, userId } = useDemo();
  const me = userById(userId ?? undefined);
  const scoped = leads.filter((l) => l.agencyId === "ag-andes" && (me?.role !== "AGENT" || l.agentId === me.id));
  const [stage, setStage] = useState<LeadStage | "ALL">("ALL");
  const [selId, setSelId] = useState<string | null>(null);
  const [stages, setStages] = useState<Record<string, LeadStage>>({});
  const [sent, setSent] = useState<Record<string, string[]>>({});
  const [draft, setDraft] = useState("");
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 15000);
    return () => clearInterval(t);
  }, []);

  const withScore = useMemo(
    () =>
      scoped.map((l) => {
        const listing = listingById(l.listingId)!;
        const s = heuristicLeadScore({ createdMinutesAgo: minsAgo(l.createdAt), budget: l.budget, listingPrice: listing.priceAmount, source: l.source, messages: l.messages, hasPhone: !!l.phone, toursRequested: l.toursRequested });
        return { ...l, stage: stages[l.id] ?? l.stage, listing, ...s };
      }),
    [scoped, stages],
  );
  const list = withScore.filter((l) => stage === "ALL" || l.stage === stage).sort((a, b) => (a.stage === "NEW" ? 0 : 1) - (b.stage === "NEW" ? 0 : 1) || b.score - a.score);
  const sel = withScore.find((l) => l.id === (selId ?? list[0]?.id));
  const A = sel ? ACTION[sel.nextAction] : null;
  const ActionIcon = A ? A[2] : Phone;

  return (
    <AdminShell locale={locale} area="agency" title={tx(locale, "Leads", "Leads")} actions={<span className="hidden items-center gap-1.5 text-xs text-mist md:flex"><RefreshCw size={12} /> {tx(locale, "auto cada 15 s", "auto every 15 s")}{tick > 0 && " ·"}</span>}>
      <div className="mb-4 flex flex-wrap gap-2">
        {[["ALL", "Todos", "All"] as const, ...STAGES].map(([k, es, en]) => {
          const n = k === "ALL" ? withScore.length : withScore.filter((l) => l.stage === k).length;
          return (
            <button key={k} onClick={() => setStage(k)} className={cn("flex items-center gap-2 rounded-full border px-3.5 py-1.5 font-display text-sm", stage === k ? "border-coral bg-coral text-white" : "border-navy-line text-ivory/80 hover:bg-white/5")}>
              {tx(locale, es, en)} <span className={cn("rounded-full px-1.5 text-xs", stage === k ? "bg-white/25" : "bg-white/10")}>{n}</span>
            </button>
          );
        })}
      </div>
      <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
        <div className="overflow-hidden rounded-np border border-navy-line bg-navy-card">
          {list.map((l) => (
            <button key={l.id} onClick={() => setSelId(l.id)} className={cn("flex w-full items-start gap-3 border-b border-navy-line px-4 py-3 text-left transition-colors duration-np", sel?.id === l.id ? "bg-white/[.06]" : "hover:bg-white/[.03]")}>
              <div className="relative">
                <Avatar initials={l.name.split(" ").map((p) => p[0]).slice(0, 2).join("")} hue={(l.name.length * 37) % 360} size={38} />
                {l.stage === "NEW" && <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-navy-card bg-coral" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-semibold">{l.name}</span>
                  {l.id.startsWith("ld-new") && <Badge className="bg-coral text-white">{tx(locale, "Nuevo", "New")}</Badge>}
                </div>
                <div className="truncate text-xs text-mist">{tx(locale, l.listing.title_es, l.listing.title_en)}</div>
                <div className="mt-1 truncate text-sm text-ivory/70">{l.message}</div>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <span className={cn("rounded-md px-1.5 py-0.5 font-display text-sm font-bold", l.score >= 70 ? "bg-[#F26B4D33] text-coral" : l.score >= 45 ? "bg-[#D4AF7733] text-gold" : "bg-white/10 text-mist")}>{l.score}</span>
                <Sla lead={l} locale={locale} />
              </div>
            </button>
          ))}
        </div>

        {sel && A && (
          <div className="np-in space-y-4" key={sel.id}>
            <div className="rounded-np border border-navy-line bg-navy-card p-5">
              <div className="flex flex-wrap items-start gap-4">
                <Avatar initials={sel.name.split(" ").map((p) => p[0]).slice(0, 2).join("")} hue={(sel.name.length * 37) % 360} size={52} />
                <div className="min-w-0 flex-1">
                  <div className="font-display text-xl font-semibold">{sel.name}</div>
                  <div className="text-sm text-mist">{sel.email}{sel.phone && ` · ${sel.phone}`}</div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <Badge tone="dark">{sel.source.replace("_", " ")}</Badge>
                    {sel.budget && <Badge tone="dark">{tx(locale, "Presupuesto", "Budget")} {money(sel.budget, locale)}</Badge>}
                    <Badge tone="dark"><Clock size={11} /> {ago(sel.createdAt, locale)}</Badge>
                  </div>
                </div>
                <select value={sel.stage} onChange={(e) => setStages({ ...stages, [sel.id]: e.target.value as LeadStage })} className="h-9 rounded-lg border border-navy-line bg-navy-2 px-3 text-sm">
                  {STAGES.map(([k, es, en]) => <option key={k} value={k}>{tx(locale, es, en)}</option>)}
                </select>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
              <div className="rounded-np border border-coral/40 bg-gradient-to-br from-[#F26B4D1f] to-transparent p-5">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-coral"><Sparkles size={14} /> {tx(locale, "Score IA · siguiente mejor acción", "AI score · next best action")}</div>
                <div className="mt-3 flex items-center gap-4">
                  <ScoreRing score={sel.score} />
                  <div>
                    <div className="font-display text-xl font-semibold">{tx(locale, A[0], A[1])}</div>
                    <div className="text-sm text-mist">{sel.reason}</div>
                    <div className="mt-1 font-mono text-[11px] text-mist/70">nextAction: {sel.nextAction}</div>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => { setStages({ ...stages, [sel.id]: sel.nextAction === "PROPOSE_TOUR" ? "TOUR" : "CONTACTED" }); setSent({ ...sent, [sel.id]: [...(sent[sel.id] ?? []), sel.nextAction === "PROPOSE_TOUR" ? tx(locale, "Te propongo el lunes 28 a las 10:00. ¿Te funciona?", "How about Monday 28th at 10:00?") : tx(locale, "¡Hola! Soy Valentina de Andes Prime. ¿Hablamos ahora?", "Hi! Valentina from Andes Prime here. Can we talk now?")] }); }}>
                    <ActionIcon size={15} /> {tx(locale, A[0], A[1])}
                  </Button>
                  <Button size="sm" variant="dark-outline"><Star size={14} /> {tx(locale, "Marcar prioridad", "Flag priority")}</Button>
                </div>
                <div className="mt-4 text-[11px] text-mist">{tx(locale, "Modelo local (HeuristicProvider) · recencia + encaje de presupuesto + origen + interacción", "Local model (HeuristicProvider) · recency + budget fit + source + engagement")}</div>
              </div>

              <div className="rounded-np border border-navy-line bg-navy-card p-4">
                <div className="flex gap-3">
                  <PropertyArt scene={sel.listing.scenes[0]} seed={sel.listing.id} photo={listingPhoto(sel.listing, 0)} className="h-20 w-28 shrink-0 rounded-lg" />
                  <div className="min-w-0">
                    <div className="line-clamp-1 font-semibold">{tx(locale, sel.listing.title_es, sel.listing.title_en)}</div>
                    <div className="text-sm text-mist">{sel.listing.zone} · {money(sel.listing.priceAmount, locale)}{priceSuffix(sel.listing, locale)}</div>
                    <div className="mt-1 text-xs text-mist">PlaceEstimate {money(sel.listing.estimate.mid, locale)} · {tx(locale, "encaje", "fit")} {sel.budget ? Math.round((sel.budget / sel.listing.priceAmount) * 100) : "—"} %</div>
                  </div>
                </div>
                <div className="mt-4 text-xs font-bold uppercase tracking-wider text-mist">{tx(locale, "Historial", "Timeline")}</div>
                <ol className="mt-2 space-y-2 border-l border-navy-line pl-4 text-sm">
                  <li className="relative"><span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-coral" />{tx(locale, "Lead creado desde", "Lead created from")} {sel.source === "TOUR_REQUEST" ? tx(locale, "solicitud de visita", "tour request") : tx(locale, "formulario de ficha", "listing form")} <span className="text-mist">· {ago(sel.createdAt, locale)}</span></li>
                  <li className="relative"><span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-mist" />{tx(locale, "Asignado automáticamente a", "Auto-assigned to")} {userById(sel.agentId)?.name}</li>
                  <li className="relative"><span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-mist" />{tx(locale, "Email de confirmación en outbox", "Confirmation email queued")}</li>
                </ol>
              </div>
            </div>

            <div className="rounded-np border border-navy-line bg-navy-card">
              <div className="flex items-center gap-2 border-b border-navy-line px-4 py-3 font-display font-semibold"><MessageCircle size={16} className="text-coral" /> {tx(locale, "Conversación", "Conversation")}</div>
              <div className="space-y-3 p-4">
                <div className="max-w-[80%] rounded-2xl rounded-bl-md bg-white/[.06] px-3.5 py-2 text-sm">{sel.message}<div className="mt-1 text-[10px] text-mist">{ago(sel.createdAt, locale)}</div></div>
                {(sent[sel.id] ?? []).map((m, i) => (
                  <div key={i} className="np-in ml-auto max-w-[80%] rounded-2xl rounded-br-md bg-coral px-3.5 py-2 text-sm text-white">{m}<div className="mt-1 text-[10px] text-white/70">{tx(locale, "ahora", "now")} · Valentina</div></div>
                ))}
              </div>
              <form className="flex gap-2 border-t border-navy-line p-3" onSubmit={(e) => { e.preventDefault(); if (!draft) return; setSent({ ...sent, [sel.id]: [...(sent[sel.id] ?? []), draft] }); setDraft(""); }}>
                <input value={draft} onChange={(e) => setDraft(e.target.value)} className="h-10 flex-1 rounded-full border border-navy-line bg-navy-2 px-4 text-sm focus:border-coral focus:outline-none" placeholder={tx(locale, "Responder… (plantillas con /)", "Reply… (templates with /)")} />
                <button className="flex h-10 w-10 items-center justify-center rounded-full bg-coral text-white"><Send size={16} /></button>
              </form>
            </div>
          </div>
        )}
        {!sel && <div className="rounded-np border border-dashed border-navy-line p-10 text-center text-mist"><Target className="mx-auto mb-2" />{tx(locale, "Sin leads en esta etapa", "No leads in this stage")}</div>}
      </div>
    </AdminShell>
  );
}

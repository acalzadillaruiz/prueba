"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { CalendarPlus, Clock, Mail, MessageCircle, Phone, RefreshCw, Send, Sparkles, Star, Target } from "lucide-react";
import type { NextAction } from "@newplace/ai";
import type { Lead, LeadStage, Listing, Locale } from "@/types/domain";
import { api } from "@/lib/api";

import { AdminShell } from "@/components/layout/AdminShell";
import { listingPhoto } from "@/lib/photos";
import { PropertyArt } from "@/components/art/PropertyArt";
import { Avatar, Badge, Button } from "@/components/ui";
import { ago, dateTime, money, priceSuffix, tx } from "@/lib/i18n";
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

const minsAgo = (iso: string) => Math.round((Date.now() - Date.parse(iso)) / 60000);

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
  if (lead.stage !== "NEW") return lead.firstResponseMin != null ? <span className="text-[11px] text-mist">{tx(locale, "resp.", "resp.")} {lead.firstResponseMin} min</span> : null;
  const left = 15 - m;
  const pct = Math.max(0, Math.min(100, (m / 15) * 100));
  return (
    <div className="w-20">
      <div className={cn("text-right text-[11px] font-bold", left > 5 ? "text-[#7FD3A8]" : left > 0 ? "text-[#F2B866]" : "text-[#FF8A7A]")}>{left > 0 ? `${left} min` : tx(locale, "SLA vencido", "SLA breached")}</div>
      <div className="mt-1 h-1 rounded-full bg-white/10"><div className={cn("h-full rounded-full", left > 5 ? "bg-ok" : left > 0 ? "bg-warn" : "bg-danger")} style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

type ScoredLead = Lead & { score?: number | null; nextAction?: string | null; reason?: string | null; priority?: boolean };
type Detail = { lead: ScoredLead; events: { type: string; data: unknown; at: string }[]; messages: { id: string; from: string; body: string; at: string; mine: boolean }[] };

const stageLabel = (locale: Locale, st: string) => {
  const s = STAGES.find(([k]) => k === st);
  return s ? (locale === "es" ? s[1] : s[2]) : st;
};

const SOURCE_LABEL: Record<string, Record<Locale, string>> = {
  TOUR_REQUEST: { es: "Pidió visita", en: "Tour request" },
  LISTING_FORM: { es: "Formulario de la ficha", en: "Listing form" },
  WHATSAPP_NOTE: { es: "WhatsApp", en: "WhatsApp" },
  REFERRAL: { es: "Referido", en: "Referral" },
  ALERT: { es: "Alerta de búsqueda", en: "Search alert" },
};

export function LeadsInbox({ locale, initial, listings, agents }: { locale: Locale; initial: ScoredLead[]; listings: Listing[]; agents: Record<string, string> }) {
  const stageName = (st: string) => stageLabel(locale, st);
  const qc = useQueryClient();
  const router = useRouter();
  const byId = useMemo(() => new Map(listings.map((l) => [l.id, l])), [listings]);
  const list = useQuery({ queryKey: ["leads", "all"], queryFn: () => api<{ items: ScoredLead[] }>("leads").then((r) => r.items), initialData: initial, refetchInterval: 15_000 });
  const [stage, setStage] = useState<LeadStage | "ALL">("ALL");
  const [selId, setSelId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const leads = list.data;
  const visible = leads
    .filter((l) => stage === "ALL" || l.stage === stage)
    .sort((a, b) => (a.stage === "NEW" ? 0 : 1) - (b.stage === "NEW" ? 0 : 1) || Number(!!b.priority) - Number(!!a.priority) || (b.score ?? 0) - (a.score ?? 0));
  const sel = leads.find((l) => l.id === (selId ?? visible[0]?.id));
  const detail = useQuery({ queryKey: ["lead", sel?.id], queryFn: () => api<Detail>(`leads/${sel!.id}`), enabled: !!sel, refetchInterval: 15_000 });
  const listing = sel ? byId.get(sel.listingId) : undefined;
  const A = ACTION[(sel?.nextAction as NextAction) ?? "NURSE"] ?? ACTION.NURSE;
  const ActionIcon = A[2];
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["leads"] });
    qc.invalidateQueries({ queryKey: ["lead", sel?.id] });
    router.refresh();
  };
  const [error, setError] = useState<string | null>(null);
  const run = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    setError(null);
    try {
      await fn();
      refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };
  const doNextAction = () =>
    run("action", async () => {
      if (!sel) return;
      if (sel.nextAction === "PROPOSE_TOUR" && listing) {
        const slots = await api<{ days: { hours: { iso: string; available: boolean }[] }[] }>(`listings/${listing.id}/slots`);
        const first = slots.days.flatMap((d) => d.hours).find((h) => h.available);
        if (first) {
          await api(`leads/${sel.id}/tour`, { method: "POST", json: { start: first.iso } });
          const when = dateTime(first.iso, locale);
          await api(`leads/${sel.id}/messages`, { method: "POST", json: { body: tx(locale, `¡Hola ${sel.name.split(" ")[0]}! Te confirmo la visita el ${when}. ¿Te funciona?`, `Hi ${sel.name.split(" ")[0]}! Your tour is set for ${when}. Does that work?`) } });
          return;
        }
      }
      const text =
        sel.nextAction === "SEND_SIMILARS"
          ? tx(locale, "Te comparto 3 inmuebles similares dentro de tu presupuesto. ¿Te gustaría visitarlos?", "Here are 3 similar homes within your budget. Want to see them?")
          : tx(locale, `¡Hola ${sel.name.split(" ")[0]}! Soy de la agencia. ¿Te llamo ahora para resolver tus dudas?`, `Hi ${sel.name.split(" ")[0]}! This is your agent. Can I call you now?`);
      await api(`leads/${sel.id}/messages`, { method: "POST", json: { body: text } });
    });

  return (
    <AdminShell locale={locale} area="agency" title={tx(locale, "Leads", "Leads")} actions={<span className="hidden items-center gap-1.5 text-xs text-mist md:flex"><RefreshCw size={12} className={list.isFetching ? "animate-spin" : ""} /> {tx(locale, "auto cada 15 s", "auto every 15 s")}</span>}>
      <div className="mb-4 flex flex-wrap gap-2">
        {[["ALL", "Todos", "All"] as const, ...STAGES].map(([k, es, en]) => {
          const n = k === "ALL" ? leads.length : leads.filter((l) => l.stage === k).length;
          return (
            <button key={k} onClick={() => setStage(k)} className={cn("flex items-center gap-2 rounded-full border px-3.5 py-1.5 font-display text-sm", stage === k ? "border-coral bg-coral-cta text-white" : "border-navy-line text-ivory/80 hover:bg-white/5")}>
              {tx(locale, es, en)} <span className={cn("rounded-full px-1.5 text-xs", stage === k ? "bg-white/25" : "bg-white/10")}>{n}</span>
            </button>
          );
        })}
      </div>
      {error && <div className="mb-3 rounded-lg bg-[#B423181A] px-3 py-2 text-sm text-danger" role="alert">{error}</div>}
      <div className="grid gap-4 [&>*]:min-w-0 xl:grid-cols-[420px_1fr]">
        <div className="overflow-hidden rounded-np border border-navy-line bg-navy-card">
          {visible.map((l) => {
            const lst = byId.get(l.listingId);
            const score = l.score ?? 0;
            return (
              <button
                key={l.id}
                onClick={() => {
                  setSelId(l.id);
                  // On phones/tablets the detail sits under the list: bring it into view.
                  if (window.innerWidth < 1280) requestAnimationFrame(() => document.getElementById("lead-detail")?.scrollIntoView({ behavior: "smooth", block: "start" }));
                }} className={cn("flex w-full items-start gap-3 border-b border-navy-line px-4 py-3 text-left transition-colors duration-np", sel?.id === l.id ? "bg-white/[.06]" : "hover:bg-white/[.03]")}>
                <div className="relative">
                  <Avatar initials={l.name.split(" ").map((p) => p[0]).slice(0, 2).join("")} hue={(l.name.length * 37) % 360} size={38} />
                  {l.stage === "NEW" && <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-navy-card bg-coral" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-semibold">{l.name}</span>
                    {l.priority && <Star size={13} className="fill-gold text-gold" />}
                    {minsAgo(l.createdAt) < 60 && l.stage === "NEW" && <Badge className="bg-coral-cta text-white">{tx(locale, "Nuevo", "New")}</Badge>}
                  </div>
                  <div className="truncate text-xs text-mist">{lst ? tx(locale, lst.title_es, lst.title_en) : ""}</div>
                  <div className="mt-1 truncate text-sm text-ivory/70">{l.message}</div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span className={cn("rounded-md px-1.5 py-0.5 font-display text-sm font-bold", score >= 70 ? "bg-[#F26B4D33] text-coral" : score >= 45 ? "bg-[#D4AF7733] text-gold" : "bg-white/10 text-mist")}>{score}</span>
                  <Sla lead={l} locale={locale} />
                </div>
              </button>
            );
          })}
          {visible.length === 0 && <div className="p-8 text-center text-sm text-mist">{tx(locale, "Sin leads en esta etapa", "No leads in this stage")}</div>}
        </div>

        {sel ? (
          <div className="np-in scroll-mt-28 space-y-4" key={sel.id} id="lead-detail">
            <div className="rounded-np border border-navy-line bg-navy-card p-5">
              <div className="flex flex-wrap items-start gap-4">
                <Avatar initials={sel.name.split(" ").map((p) => p[0]).slice(0, 2).join("")} hue={(sel.name.length * 37) % 360} size={52} />
                <div className="min-w-0 flex-1">
                  <div className="font-display text-xl font-semibold">{sel.name}</div>
                  <div className="text-sm text-mist">{sel.email}{sel.phone && ` · ${sel.phone}`}</div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <Badge tone="dark">{SOURCE_LABEL[sel.source]?.[locale] ?? sel.source}</Badge>
                    {sel.budget && <Badge tone="dark">{tx(locale, "Presupuesto", "Budget")} {money(sel.budget, locale)}</Badge>}
                    <Badge tone="dark"><Clock size={11} /> {ago(sel.createdAt, locale)}</Badge>
                    {sel.agentId && agents[sel.agentId] && <Badge tone="dark">{agents[sel.agentId]}</Badge>}
                  </div>
                </div>
                <select value={sel.stage} aria-label={tx(locale, "Etapa", "Stage")} onChange={(e) => run("stage", () => api(`leads/${sel.id}`, { method: "PATCH", json: { stage: e.target.value } }))} className="h-9 rounded-lg border border-navy-line bg-navy-2 px-3 text-sm">
                  {STAGES.map(([k, es, en]) => <option key={k} value={k}>{tx(locale, es, en)}</option>)}
                </select>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
              <div className="rounded-np border border-coral/40 bg-gradient-to-br from-[#F26B4D1f] to-transparent p-5">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-coral"><Sparkles size={14} /> {tx(locale, "Score IA · siguiente mejor acción", "AI score · next best action")}</div>
                <div className="mt-3 flex items-center gap-4">
                  <ScoreRing score={sel.score ?? 0} />
                  <div>
                    <div className="font-display text-xl font-semibold">{tx(locale, A[0], A[1])}</div>
                    <div className="text-sm text-mist">{sel.reason}</div>
                    <div className="mt-1 font-mono text-[11px] text-mist/70">nextAction: {sel.nextAction}</div>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" onClick={doNextAction} disabled={busy === "action"}>
                    <ActionIcon size={15} /> {tx(locale, A[0], A[1])}
                  </Button>
                  <Button size="sm" variant="dark-outline" onClick={() => run("prio", () => api(`leads/${sel.id}`, { method: "PATCH", json: { priority: !sel.priority } }))}>
                    <Star size={14} className={sel.priority ? "fill-gold text-gold" : ""} /> {sel.priority ? tx(locale, "Prioritario", "Priority") : tx(locale, "Marcar prioridad", "Flag priority")}
                  </Button>
                  <Button size="sm" variant="dark-ghost" onClick={() => run("rescore", () => api("ai/lead-score", { method: "POST", json: { leadId: sel.id } }))}>
                    <RefreshCw size={13} /> {tx(locale, "Recalcular", "Re-score")}
                  </Button>
                </div>
              </div>

              <div className="rounded-np border border-navy-line bg-navy-card p-4">
                {listing && (
                  <div className="flex gap-3">
                    <PropertyArt scene={listing.scenes[0]} seed={listing.id} photo={listingPhoto(listing, 0)} className="h-20 w-28 shrink-0 rounded-lg" />
                    <div className="min-w-0">
                      <div className="line-clamp-1 font-semibold">{tx(locale, listing.title_es, listing.title_en)}</div>
                      <div className="text-sm text-mist">{listing.zone} · {money(listing.priceAmount, locale)}{priceSuffix(listing, locale)}</div>
                      <div className="mt-1 text-xs text-mist">PlaceEstimate {money(listing.estimate.mid, locale)} · {tx(locale, "encaje", "fit")} {sel.budget ? Math.round((sel.budget / listing.priceAmount) * 100) : "—"} %</div>
                    </div>
                  </div>
                )}
                <div className="mt-4 text-xs font-bold uppercase tracking-wider text-mist">{tx(locale, "Historial", "Timeline")}</div>
                <ol className="mt-2 space-y-2 border-l border-navy-line pl-4 text-sm">
                  {(detail.data?.events ?? []).map((e, i) => (
                    <li key={i} className="relative">
                      <span className={cn("absolute -left-[21px] top-1.5 h-2 w-2 rounded-full", i === 0 ? "bg-coral" : "bg-mist")} />
                      {e.type === "CREATED" ? tx(locale, "Lead creado", "Lead created") : e.type === "STAGE" ? `${tx(locale, "Etapa", "Stage")}: ${stageName((e.data as { from: string }).from)} → ${stageName((e.data as { to: string }).to)}` : e.type === "TOUR" ? tx(locale, "Visita agendada", "Tour booked") : tx(locale, "Mensaje enviado", "Message sent")}{" "}
                      <span className="text-mist">· {ago(e.at, locale)}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            <div className="rounded-np border border-navy-line bg-navy-card">
              <div className="flex items-center gap-2 border-b border-navy-line px-4 py-3 font-display font-semibold"><MessageCircle size={16} className="text-coral" /> {tx(locale, "Conversación", "Conversation")}</div>
              <div className="max-h-80 space-y-3 overflow-y-auto p-4 scrollbar-thin">
                <div className="max-w-[80%] rounded-2xl rounded-bl-md bg-white/[.06] px-3.5 py-2 text-sm">{sel.message}<div className="mt-1 text-[10px] text-mist">{ago(sel.createdAt, locale)}</div></div>
                {(detail.data?.messages ?? []).filter((m) => m.body !== sel.message).map((m) => (
                  <div key={m.id} className={cn("max-w-[80%] rounded-2xl px-3.5 py-2 text-sm", m.mine ? "np-in ml-auto rounded-br-md bg-coral-cta text-white" : "rounded-bl-md bg-white/[.06]")}>
                    {m.body}
                    <div className={cn("mt-1 text-[10px]", m.mine ? "text-white/70" : "text-mist")}>{ago(m.at, locale)} · {m.from}</div>
                  </div>
                ))}
              </div>
              <form
                className="flex gap-2 border-t border-navy-line p-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!draft.trim()) return;
                  const body = draft;
                  setDraft("");
                  run("msg", () => api(`leads/${sel.id}/messages`, { method: "POST", json: { body } }));
                }}
              >
                <input value={draft} onChange={(e) => setDraft(e.target.value)} className="h-10 flex-1 rounded-full border border-navy-line bg-navy-2 px-4 text-sm focus:border-coral focus:outline-none" placeholder={tx(locale, "Responder… (se envía también por email)", "Reply… (also sent by email)")} aria-label={tx(locale, "Respuesta", "Reply")} />
                <button className="flex h-10 w-10 items-center justify-center rounded-full bg-coral-cta text-white" aria-label={tx(locale, "Enviar", "Send")}><Send size={16} /></button>
              </form>
            </div>
          </div>
        ) : (
          <div className="rounded-np border border-dashed border-navy-line p-10 text-center text-mist"><Target className="mx-auto mb-2" />{tx(locale, "Sin leads todavía", "No leads yet")}</div>
        )}
      </div>
    </AdminShell>
  );
}

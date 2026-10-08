"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Archive, CalendarPlus, Clock, Loader2, Mail, MessageCircle, MessageSquareText, Phone, RefreshCw, Search, Send, Sparkles, Star, UserRoundCog, X } from "lucide-react";
import type { NextAction } from "@newplace/ai";
import type { Lead, LeadStage, Listing, Locale } from "@/types/domain";
import { api } from "@/lib/api";

import { AdminShell } from "@/components/layout/AdminShell";
import { listingPhoto } from "@/lib/photos";
import { PropertyArt } from "@/components/art/PropertyArt";
import { Button } from "@/components/ui";
import { Chip, Count, Empty, Initials, Pill, k, tab } from "./kit";
import { ago, dateTime, money, priceSuffix, tx } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { caracasInputToIso, isoToCaracasInput } from "@/lib/caracas-time";
import { HubMessages, type HubThread } from "@/components/seeker/HubMessages";
import { useApp } from "@/lib/store";
import { BulkResult, runSequential, type Bulk } from "./bulk";
import { QUICK_REPLIES, fillReply } from "@/lib/quick-replies";

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
      <circle cx={40} cy={40} r={r} fill="none" strokeWidth={6} className="stroke-[#E6DDD2] dark:stroke-white/10" />
      <circle cx={40} cy={40} r={r} fill="none" strokeWidth={6} strokeDasharray={`${(score / 100) * c} ${c}`} strokeLinecap="round" transform="rotate(-90 40 40)" className={score >= 45 ? "stroke-navy dark:stroke-ivory" : "stroke-[#81776F]"} />
      <text x={40} y={47} textAnchor="middle" fontSize={22} fontWeight={600} letterSpacing="-1" fontFamily="var(--font-display)" className="fill-navy dark:fill-ivory">{score}</text>
    </svg>
  );
}

function Sla({ lead, locale }: { lead: Lead; locale: Locale }) {
  const m = minsAgo(lead.createdAt);
  if (lead.stage !== "NEW") return lead.firstResponseMin != null ? <span className={cn("text-[11px]", k.muted)}>{tx(locale, "resp.", "resp.")} {lead.firstResponseMin} min</span> : null;
  const left = 15 - m;
  const pct = Math.max(0, Math.min(100, (m / 15) * 100));
  return (
    <div className="w-20">
      <div className={cn("text-right text-[11px] font-semibold", left > 5 ? k.okText : left > 0 ? k.warnText : k.dangerText)} suppressHydrationWarning>{left > 0 ? `${left} min` : tx(locale, "A destiempo", "Overdue")}</div>
      <div className="mt-1 h-1 rounded-full bg-[#ECE6DA] dark:bg-white/10"><div className={cn("h-full rounded-full", left > 5 ? "bg-ok" : left > 0 ? "bg-warn" : "bg-danger")} style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

type ScoredLead = Lead & { score?: number | null; nextAction?: string | null; reason?: string | null; priority?: boolean };
type Detail = { lead: ScoredLead; events: { type: string; data: unknown; at: string }[]; messages: { id: string; from: string; body: string; at: string; mine: boolean }[]; agents: { id: string; name: string }[] | null };
type Slots = { agentId: string | null; days: { date: string; hours: { hour: number; iso: string; available: boolean }[] }[] };

/** Accent- and case-insensitive text for the inbox search. */
const fold = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

function TourPicker({ locale, listingId, agentId, busy, onPropose, onClose }: { locale: Locale; listingId: string; agentId?: string | null; busy: boolean; onPropose: (iso: string) => void; onClose: () => void }) {
  const slots = useQuery({ queryKey: ["slots", listingId, agentId], queryFn: () => api<Slots>(`listings/${listingId}/slots${agentId ? `?agent=${agentId}` : ""}`) });
  const [pick, setPick] = useState<string | null>(null);
  const [custom, setCustom] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const days = (slots.data?.days ?? []).map((d) => ({ ...d, hours: d.hours.filter((h) => h.available) })).filter((d) => d.hours.length);
  const minInput = isoToCaracasInput(Date.now() + 5 * 60e3);
  return (
    <div className={cn("np-in mt-4 rounded-xl border p-4", k.line, k.soft)} role="group" aria-label={tx(locale, "Proponer visita", "Propose a tour")}>
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">{tx(locale, "Horarios libres del agente", "Agent’s free slots")}</div>
        <button type="button" onClick={onClose} className={cn("rounded-full p-1.5", k.muted, k.hover)} aria-label={tx(locale, "Cerrar", "Close")}><X size={14} /></button>
      </div>
      {slots.isLoading ? (
        <div className={cn("mt-2 flex items-center gap-2 text-xs", k.muted)}><Loader2 size={13} className="animate-spin" /> {tx(locale, "Cargando agenda…", "Loading calendar…")}</div>
      ) : days.length ? (
        <div className="mt-2 max-h-40 space-y-2 overflow-y-auto scrollbar-thin">
          {days.map((d) => (
            <div key={d.date}>
              <div className={cn("text-[11px] first-letter:uppercase", k.muted)}>{dateTime(d.date, locale, { weekday: "long", day: "numeric", month: "short" })}</div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {d.hours.map((h) => (
                  <button key={h.iso} type="button" aria-pressed={pick === h.iso} onClick={() => { setPick(h.iso); setCustom(""); setErr(null); }} className={cn(tab(pick === h.iso), "px-3 py-1 text-[13px]")}>
                    {dateTime(h.iso, locale, { hour: "2-digit", minute: "2-digit" })}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={cn("mt-2 text-xs", k.muted)}>{tx(locale, "Sin horarios libres publicados en los próximos días. Propón una hora libre abajo.", "No free published slots in the coming days. Propose any time below.")}</div>
      )}
      <label className={cn("mt-3 block text-xs", k.muted)}>
        {tx(locale, "…u otra fecha y hora (Caracas)", "…or another date & time (Caracas)")}
        <input type="datetime-local" min={minInput} value={custom} onChange={(e) => { setCustom(e.target.value); setPick(null); setErr(null); }} className={cn(k.input, "mt-1")} />
      </label>
      {err && <div role="alert" className={cn("mt-2 text-xs font-semibold", k.dangerText)}>{err}</div>}
      <Button
        size="sm"
        className={cn("mt-3", k.primary)}
        disabled={busy || (!pick && !custom)}
        onClick={() => {
          const iso = pick ?? caracasInputToIso(custom);
          if (!iso || Date.parse(iso) <= Date.now()) return setErr(tx(locale, "Elige una fecha y hora futura.", "Pick a future date and time."));
          onPropose(iso);
        }}
      >
        {busy ? <Loader2 size={14} className="animate-spin" /> : <CalendarPlus size={14} />} {tx(locale, "Proponer y avisar al cliente", "Propose and notify the client")}
      </Button>
    </div>
  );
}

const BOX = "mt-0.5 h-[18px] w-[18px] shrink-0 cursor-pointer accent-navy dark:accent-[#C9A574]";

function SelectAll({ checked, indeterminate, onChange, label }: { checked: boolean; indeterminate: boolean; onChange: () => void; label: string }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return <input ref={ref} type="checkbox" className={cn(BOX, "mt-0")} checked={checked} onChange={onChange} aria-label={label} />;
}

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

export function LeadsInbox({ locale, initial, listings, agents, assignable = [], threads, meId }: { locale: Locale; initial: ScoredLead[]; listings: Listing[]; agents: Record<string, string>; /** Agents a manager can hand leads to (empty for agents). */ assignable?: { id: string; name: string }[]; threads?: HubThread[]; meId?: string }) {
  const { user } = useApp();
  const manager = user?.role === "AGENCY_OWNER" || user?.role === "BACKOFFICE" || user?.role === "SUPERADMIN";
  const stageName = (st: string) => stageLabel(locale, st);
  const qc = useQueryClient();
  const router = useRouter();
  const byId = useMemo(() => new Map(listings.map((l) => [l.id, l])), [listings]);
  const list = useQuery({ queryKey: ["leads", "all"], queryFn: () => api<{ items: ScoredLead[] }>("leads").then((r) => r.items), initialData: initial, refetchInterval: 15_000 });
  const [stage, setStage] = useState<LeadStage | "ALL">("ALL");
  const [selId, setSelId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [tourOpen, setTourOpen] = useState(false);
  const replyRef = useRef<HTMLInputElement>(null);
  const leads = list.data;
  const needle = fold(q.trim());
  const matches = (l: ScoredLead) => {
    if (!needle) return true;
    const lst = byId.get(l.listingId);
    return fold([l.name, l.email, l.phone ?? "", (l.phone ?? "").replace(/\D/g, ""), lst?.title_es ?? "", lst?.title_en ?? ""].join(" ")).includes(needle);
  };
  const found = leads.filter(matches);
  const visible = found
    .filter((l) => stage === "ALL" || l.stage === stage)
    .sort((a, b) => (a.stage === "NEW" ? 0 : 1) - (b.stage === "NEW" ? 0 : 1) || Number(!!b.priority) - Number(!!a.priority) || (b.score ?? 0) - (a.score ?? 0));
  // The open detail is always one of the listed leads: when the search or the stage filter hides it, it closes.
  const sel = visible.find((l) => l.id === selId) ?? visible[0];
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
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [bulk, setBulk] = useState<Bulk | null>(null);
  const [archiveAsk, setArchiveAsk] = useState(false);
  const visibleKey = visible.map((l) => l.id).join(",");
  useEffect(() => {
    // Selection only holds listed leads (search / stage filter changes drop the hidden ones).
    setPicked((cur) => {
      const ids = new Set(visibleKey.split(","));
      const keep = new Set([...cur].filter((id) => ids.has(id)));
      return keep.size === cur.size ? cur : keep;
    });
  }, [visibleKey]);
  const chosen = visible.filter((l) => picked.has(l.id));
  const allOn = visible.length > 0 && chosen.length === visible.length;
  const toggle = (id: string) => setPicked((cur) => {
    const n = new Set(cur);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    return n;
  });
  const runBulk = async (label: string, call: (l: ScoredLead) => Promise<unknown> | null) => {
    setError(null);
    setArchiveAsk(false);
    const ok = await runSequential(label, chosen, (l) => l.name, call, setBulk);
    setPicked((cur) => new Set([...cur].filter((id) => !ok.includes(id))));
    qc.invalidateQueries({ queryKey: ["leads"] });
    qc.invalidateQueries({ queryKey: ["lead"] });
    router.refresh();
  };
  const patchLead = (id: string, json: object) => api(`leads/${id}`, { method: "PATCH", json });
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
  const proposeTour = (iso: string) =>
    run("tour", async () => {
      if (!sel) return;
      await api(`leads/${sel.id}/tour`, { method: "POST", json: { start: iso } });
      const when = dateTime(iso, locale);
      await api(`leads/${sel.id}/messages`, { method: "POST", json: { body: tx(locale, `¡Hola ${sel.name.split(" ")[0]}! Te confirmo la visita el ${when}. ¿Te funciona?`, `Hi ${sel.name.split(" ")[0]}! Your tour is set for ${when}. Does that work?`) } });
      setTourOpen(false);
    });
  const doNextAction = () => {
    if (sel?.nextAction === "PROPOSE_TOUR" && listing) return setTourOpen(true);
    return run("action", async () => {
      if (!sel) return;
      const text =
        sel.nextAction === "SEND_SIMILARS"
          ? tx(locale, "Te comparto 3 inmuebles similares dentro de tu presupuesto. ¿Te gustaría visitarlos?", "Here are 3 similar homes within your budget. Want to see them?")
          : sel.nextAction === "NURSE"
            ? tx(locale, `¡Hola ${sel.name.split(" ")[0]}! Te comparto la guía de la zona y el PlaceEstimate del inmueble. Cuando quieras, coordinamos una visita.`, `Hi ${sel.name.split(" ")[0]}! Here is the area guide and the home’s PlaceEstimate. Whenever you like, we can set up a tour.`)
            : tx(locale, `¡Hola ${sel.name.split(" ")[0]}! Soy de la agencia. ¿Te llamo ahora para resolver tus dudas?`, `Hi ${sel.name.split(" ")[0]}! This is your agent. Can I call you now?`);
      await api(`leads/${sel.id}/messages`, { method: "POST", json: { body: text } });
    });
  };
  const eventText = (e: Detail["events"][number]) => {
    const d = (e.data ?? {}) as { from?: string; to?: string; auto?: boolean; start?: string; toName?: string };
    if (e.type === "CREATED") return tx(locale, "Lead creado", "Lead created");
    if (e.type === "STAGE") return `${tx(locale, "Etapa", "Stage")}: ${stageName(d.from ?? "")} → ${stageName(d.to ?? "")}${d.auto ? ` (${tx(locale, "al responder", "on reply")})` : ""}`;
    if (e.type === "TOUR") return d.start ? `${tx(locale, "Visita agendada", "Tour booked")} · ${dateTime(d.start, locale)}` : tx(locale, "Visita agendada", "Tour booked");
    if (e.type === "ASSIGN") return `${tx(locale, "Reasignado a", "Reassigned to")} ${d.toName ?? agents[d.to ?? ""] ?? "—"}`;
    return tx(locale, "Mensaje enviado", "Message sent");
  };

  return (
    <AdminShell locale={locale} area="agency" title={tx(locale, "Leads", "Leads")} actions={<span className={cn("hidden items-center gap-1.5 text-xs md:flex", k.muted)}><RefreshCw size={12} className={list.isFetching ? "animate-spin" : ""} /> {tx(locale, "auto cada 15 s", "auto every 15 s")}</span>}>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="relative w-[28rem] max-w-full">
          <Search size={15} className={cn("absolute left-3.5 top-1/2 -translate-y-1/2", k.muted)} />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} className={cn(k.input, "rounded-full pl-10")} placeholder={tx(locale, "Buscar por nombre, email, teléfono o inmueble…", "Search by name, email, phone or listing…")} aria-label={tx(locale, "Buscar leads", "Search leads")} />
        </div>
        {needle && <span className={cn("text-sm", k.muted)}>{found.length} / {leads.length}</span>}
      </div>
      {/* Up to lg (1024 px included): one horizontally scrolling row (snap + faded edges, like Inmuebles) instead of chips wrapping onto 3 rows. */}
      <div
        role="group"
        aria-label={tx(locale, "Filtrar por etapa", "Filter by stage")}
        data-testid="stage-chips"
        className="-mx-4 mb-4 flex snap-x snap-mandatory scroll-px-4 gap-2 overflow-x-auto px-4 py-0.5 [mask-image:linear-gradient(to_right,transparent,#000_14px,#000_calc(100%-28px),transparent)] [scrollbar-width:none] xl:mx-0 xl:flex-wrap xl:overflow-visible xl:px-0 xl:[mask-image:none] [&::-webkit-scrollbar]:hidden"
      >
        {[["ALL", "Todos", "All"] as const, ...STAGES].map(([key, es, en]) => {
          const n = key === "ALL" ? found.length : found.filter((l) => l.stage === key).length;
          return (
            <button
              key={key}
              onClick={(e) => {
                setStage(key);
                e.currentTarget.scrollIntoView({ block: "nearest", inline: "nearest" });
              }}
              aria-pressed={stage === key}
              className={cn(tab(stage === key), "shrink-0 snap-start whitespace-nowrap max-sm:min-h-10")}
            >
              {tx(locale, es, en)} <Count>{n}</Count>
            </button>
          );
        })}
      </div>
      {error && <div className={cn("mb-3", k.err)} role="alert">{error}</div>}
      <div className="grid gap-4 [&>*]:min-w-0 xl:grid-cols-[420px_1fr]">
        <div className={cn("overflow-hidden self-start", k.card)}>
          {visible.length > 0 && (
            <label className={cn("flex min-h-11 cursor-pointer items-center gap-2.5 border-b px-4 py-2 text-sm", k.line, k.soft)}>
              <SelectAll checked={allOn} indeterminate={chosen.length > 0 && !allOn} onChange={() => setPicked(allOn ? new Set() : new Set(visible.map((l) => l.id)))} label={tx(locale, `Seleccionar los ${visible.length} visibles`, `Select all ${visible.length} visible`)} />
              <span className={k.muted}>{chosen.length ? tx(locale, `${chosen.length} de ${visible.length} seleccionados`, `${chosen.length} of ${visible.length} selected`) : tx(locale, `Seleccionar los ${visible.length} visibles`, `Select all ${visible.length} visible`)}</span>
            </label>
          )}
          {visible.map((l) => {
            const lst = byId.get(l.listingId);
            const score = l.score ?? 0;
            return (
              <div key={l.id} className={cn("flex items-stretch border-b last:border-b-0", k.line, sel?.id === l.id ? "bg-[#E6DDD2] shadow-[inset_3px_0_0_#1E1A18] dark:bg-white/[.07] dark:shadow-[inset_3px_0_0_#C9A574]" : picked.has(l.id) ? k.soft : k.hover)}>
              <label className="flex shrink-0 cursor-pointer items-start py-3.5 pl-4 pr-1">
                <input type="checkbox" className={BOX} checked={picked.has(l.id)} onChange={() => toggle(l.id)} aria-label={tx(locale, `Seleccionar ${l.name}`, `Select ${l.name}`)} />
              </label>
              <button
                onClick={() => {
                  setSelId(l.id);
                  // On phones/tablets the detail sits under the list: bring it into view.
                  if (window.innerWidth < 1280) requestAnimationFrame(() => document.getElementById("lead-detail")?.scrollIntoView({ behavior: "smooth", block: "start" }));
                }} className="flex min-w-0 flex-1 items-start gap-3 py-3.5 pl-2 pr-4 text-left transition-colors duration-np">
                <div className="relative">
                  <Initials name={l.name} size={40} />
                  {l.stage === "NEW" && <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-navy dark:border-navy-card dark:bg-[#C9A574]" />}
                </div>
                <div className="min-w-0 flex-1">
                  {/* Phones: the name gets the full row; the badges (Nuevo / Interés / SLA) drop to a line of their own. */}
                  <div className="flex items-center gap-2">
                    <span className="truncate font-semibold">{l.name}</span>
                    {l.priority && <Star size={13} className="shrink-0 fill-gold text-gold" />}
                    {minsAgo(l.createdAt) < 60 && l.stage === "NEW" && <Pill tone="neutral" className="max-sm:hidden">{tx(locale, "Nuevo", "New")}</Pill>}
                  </div>
                  <div className={cn("truncate text-xs", k.muted)}>{lst ? tx(locale, lst.title_es, lst.title_en) : ""}</div>
                  <div className="mt-1 truncate text-sm text-navy/75 dark:text-ivory/70">{l.message}</div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 sm:hidden">
                    {minsAgo(l.createdAt) < 60 && l.stage === "NEW" && <Pill tone="neutral">{tx(locale, "Nuevo", "New")}</Pill>}
                    <Chip className={score < 45 ? "bg-transparent text-muted shadow-[inset_0_0_0_1px_#D8CBB7] dark:text-mist" : ""}>{tx(locale, "Interés", "Interest")} {score}</Chip>
                    <Sla lead={l} locale={locale} />
                  </div>
                </div>
                <div className="hidden flex-col items-end gap-1.5 sm:flex">
                  <Chip className={score < 45 ? "bg-transparent text-muted shadow-[inset_0_0_0_1px_#D8CBB7] dark:text-mist" : ""}>{tx(locale, "Interés", "Interest")} {score}</Chip>
                  <Sla lead={l} locale={locale} />
                </div>
              </button>
              </div>
            );
          })}
          {visible.length === 0 && <div className={cn("p-8 text-center text-sm", k.muted)}>{needle ? tx(locale, "Ningún lead coincide con la búsqueda", "No leads match your search") : tx(locale, "Sin leads en esta etapa", "No leads in this stage")}</div>}
        </div>

        {sel ? (
          <div className="np-in scroll-mt-28 space-y-4" key={sel.id} id="lead-detail">
            <div className={cn(k.card, "p-5 md:p-6")}>
              <div className="flex flex-wrap items-start gap-4">
                <Initials name={sel.name} size={56} />
                <div className="min-w-0 flex-1 basis-[260px]">
                  <h2 className={k.title}>{sel.name}</h2>
                  <div className={cn("text-sm", k.muted)}>{sel.email}{sel.phone && ` · ${sel.phone}`}</div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <Chip>{SOURCE_LABEL[sel.source]?.[locale] ?? sel.source}</Chip>
                    {sel.budget && <Chip>{tx(locale, "Presupuesto", "Budget")} {money(sel.budget, locale)}</Chip>}
                    <Chip className="gap-1"><Clock size={11} /> {ago(sel.createdAt, locale)}</Chip>
                    {sel.agentId && agents[sel.agentId] && <Chip>{agents[sel.agentId]}</Chip>}
                  </div>
                </div>
                {detail.data?.agents && (
                  <label className={cn("flex items-center gap-2 text-xs", k.muted)}>
                    <UserRoundCog size={15} />
                    <span className="sr-only">{tx(locale, "Agente asignado", "Assigned agent")}</span>
                    <select
                      value={sel.agentId || ""}
                      disabled={busy === "assign"}
                      aria-label={tx(locale, "Agente asignado", "Assigned agent")}
                      onChange={(e) => run("assign", () => api(`leads/${sel.id}`, { method: "PATCH", json: { agentId: e.target.value } }))}
                      className={k.select}
                    >
                      {!sel.agentId && <option value="">{tx(locale, "Sin asignar", "Unassigned")}</option>}
                      {sel.agentId && !detail.data.agents.some((a) => a.id === sel.agentId) && <option value={sel.agentId}>{agents[sel.agentId] ?? "—"}</option>}
                      {detail.data.agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </label>
                )}
                <select value={sel.stage} aria-label={tx(locale, "Etapa", "Stage")} onChange={(e) => run("stage", () => api(`leads/${sel.id}`, { method: "PATCH", json: { stage: e.target.value } }))} className={k.select}>
                  {STAGES.map(([k, es, en]) => <option key={k} value={k}>{tx(locale, es, en)}</option>)}
                </select>
              </div>
            </div>

            <div className="grid gap-4 [&>*]:min-w-0 2xl:grid-cols-[1fr_1.2fr]">
              <div className={cn(k.card, "p-5 md:p-6")}>
                <div className={cn("flex items-center gap-2", k.label)}><Sparkles size={14} /> {tx(locale, "Interés · siguiente mejor acción", "Interest · next best action")}</div>
                <div className="mt-3 flex items-center gap-4">
                  <span title={tx(locale, "Interés del cliente (0–100), estimado por la IA", "Client interest (0–100), estimated by AI")}><ScoreRing score={sel.score ?? 0} /></span>
                  <div>
                    <div className={k.title} data-testid="next-action" data-action={sel.nextAction ?? ""}>{tx(locale, A[0], A[1])}</div>
                    <div className={cn("text-sm", k.muted)}>{sel.reason}</div>
                    <div className={cn("mt-1 text-[11px] opacity-80", k.muted)}>{tx(locale, "Siguiente acción sugerida por la IA", "Next action suggested by AI")}</div>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" className={k.primary} onClick={doNextAction} disabled={busy === "action"}>
                    <ActionIcon size={15} /> {tx(locale, A[0], A[1])}
                  </Button>
                  {sel.nextAction !== "PROPOSE_TOUR" && listing && (
                    <Button size="sm" variant="outline" className={k.outline} onClick={() => setTourOpen(!tourOpen)} aria-expanded={tourOpen}>
                      <CalendarPlus size={14} /> {tx(locale, "Proponer visita", "Propose tour")}
                    </Button>
                  )}
                  <Button size="sm" variant="outline" className={k.outline} onClick={() => run("prio", () => api(`leads/${sel.id}`, { method: "PATCH", json: { priority: !sel.priority } }))}>
                    <Star size={14} className={sel.priority ? "fill-gold text-gold" : ""} /> {sel.priority ? tx(locale, "Prioritario", "Priority") : tx(locale, "Marcar prioridad", "Flag priority")}
                  </Button>
                  <Button size="sm" variant="ghost" className={k.ghost} onClick={() => run("rescore", () => api("ai/lead-score", { method: "POST", json: { leadId: sel.id } }))}>
                    <RefreshCw size={13} /> {tx(locale, "Recalcular", "Re-score")}
                  </Button>
                </div>
                {tourOpen && listing && <TourPicker agentId={sel?.agentId} locale={locale} listingId={listing.id} busy={busy === "tour"} onPropose={proposeTour} onClose={() => setTourOpen(false)} />}
              </div>

              <div className={cn(k.card, "p-5")}>
                {listing && (
                  <div className="flex gap-3">
                    <PropertyArt scene={listing.scenes[0]} seed={listing.id} photo={listingPhoto(listing, 0)} className="h-20 w-28 shrink-0 rounded-xl" />
                    <div className="min-w-0">
                      <div className="line-clamp-1 font-semibold">{tx(locale, listing.title_es, listing.title_en)}</div>
                      <div className={cn("text-sm", k.muted)}>{listing.zone} · {money(listing.priceAmount, locale)}{priceSuffix(listing, locale)}</div>
                      <div className={cn("mt-1 text-xs", k.muted)}>PlaceEstimate {money(listing.estimate.mid, locale)} · {tx(locale, "encaje", "fit")} {sel.budget ? Math.round((sel.budget / listing.priceAmount) * 100) : "—"} %</div>
                    </div>
                  </div>
                )}
                <div className={cn("mt-5", k.label)}>{tx(locale, "Historial", "Timeline")}</div>
                <ol className={cn("mt-2 space-y-2 border-l pl-4 text-sm", k.line)}>
                  {(detail.data?.events ?? []).map((e, i) => (
                    <li key={i} className="relative">
                      <span className={cn("absolute -left-[21px] top-1.5 h-2 w-2 rounded-full", i === 0 ? "bg-navy dark:bg-ivory" : "bg-[#C9C1B2] dark:bg-mist")} />
                      {eventText(e)}{" "}
                      <span className={k.muted}>· {ago(e.at, locale)}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            <div className={k.card}>
              <div className={cn("flex items-center gap-2 border-b px-5 py-4", k.line)}><MessageCircle size={17} strokeWidth={1.6} /> <span className={k.titleSm}>{tx(locale, "Conversación", "Conversation")}</span></div>
              <div className="max-h-80 space-y-3 overflow-y-auto p-4 scrollbar-thin">
                <div className={cn("max-w-[80%] rounded-2xl rounded-bl-md px-3.5 py-2 text-sm", k.soft)}>{sel.message}<div className={cn("mt-1 text-[10px]", k.muted)}>{ago(sel.createdAt, locale)}</div></div>
                {(detail.data?.messages ?? []).filter((m) => m.body !== sel.message).map((m) => (
                  <div key={m.id} className={cn("max-w-[80%] rounded-2xl px-3.5 py-2 text-sm", m.mine ? "np-in ml-auto rounded-br-md bg-navy text-ivory dark:bg-ivory dark:text-navy" : cn("rounded-bl-md", k.soft))}>
                    {m.body}
                    <div className={cn("mt-1 text-[10px]", m.mine ? "opacity-70" : k.muted)}>{ago(m.at, locale)} · {m.from}</div>
                  </div>
                ))}
              </div>
              <div className={cn("flex flex-wrap items-center gap-1.5 border-t px-3 pt-3", k.line)} role="group" aria-label={tx(locale, "Respuestas rápidas", "Quick replies")}>
                <MessageSquareText size={14} className={k.muted} aria-hidden />
                {QUICK_REPLIES.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    className={cn(tab(false), "px-3 py-1 text-[13px]")}
                    title={fillReply(tx(locale, r.es, r.en), sel.name)}
                    onClick={() => {
                      const text = fillReply(tx(locale, r.es, r.en), sel.name);
                      setDraft((d) => (d.trim() ? `${d.trimEnd()} ${text}` : text));
                      requestAnimationFrame(() => replyRef.current?.focus());
                    }}
                  >
                    {tx(locale, r.label[0], r.label[1])}
                  </button>
                ))}
              </div>
              <form
                className={cn("flex gap-2 p-3", k.line)}
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!draft.trim()) return;
                  const body = draft;
                  setDraft("");
                  // On failure the reply is put back in the box (the error shows above) instead of being lost.
                  run("msg", () => api(`leads/${sel.id}/messages`, { method: "POST", json: { body } }).catch((e) => { setDraft(body); throw e; }));
                }}
              >
                <input ref={replyRef} value={draft} onChange={(e) => setDraft(e.target.value)} className={cn(k.input, "h-11 flex-1 rounded-full px-4 md:h-11")} placeholder={tx(locale, "Responder… (se envía también por email)", "Reply… (also sent by email)")} aria-label={tx(locale, "Respuesta", "Reply")} />
                <button className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-navy text-ivory hover:bg-navy-2 dark:bg-ivory dark:text-navy" aria-label={tx(locale, "Enviar", "Send")}><Send size={16} /></button>
              </form>
            </div>
          </div>
        ) : (
          <div className={k.card}>
            {leads.length ? (
              <Empty title={tx(locale, "Ningún lead abierto", "No lead open")} body={needle ? tx(locale, "Ningún lead coincide con la búsqueda. Prueba con otro nombre, email o teléfono.", "No leads match your search. Try another name, email or phone.") : tx(locale, "No hay leads en esta etapa.", "There are no leads in this stage.")} />
            ) : (
              <Empty title={tx(locale, "Sin leads todavía", "No leads yet")} body={tx(locale, "Cuando alguien escriba o pida una visita desde una ficha, aparecerá aquí con su nivel de interés.", "When someone writes or books a tour from a listing, it shows up here with its interest level.")} />
            )}
          </div>
        )}
      </div>
      {bulk && !chosen.length && (
        <div className={cn("mt-4", bulk.failed.length ? k.warnBox : k.okBox)} role="status" aria-live="polite">
          <BulkResult locale={locale} bulk={bulk} onClose={() => setBulk(null)} />
        </div>
      )}
      {chosen.length > 0 && (
        <div className="sticky bottom-3 z-20 mt-4" role="region" aria-label={tx(locale, "Acciones en lote", "Bulk actions")}>
          <div className={cn(k.card, "flex flex-wrap items-center gap-2 p-3 shadow-[0_12px_32px_rgba(30,26,24,.18)] ring-1 ring-[#E6DDD2] md:gap-3 md:px-4")}>
            <span className="text-sm font-semibold">{tx(locale, `${chosen.length} ${chosen.length === 1 ? "lead seleccionado" : "leads seleccionados"}`, `${chosen.length} ${chosen.length === 1 ? "lead" : "leads"} selected`)}</span>
            {manager && assignable.length > 0 && (
              <select value="" disabled={bulk?.running} onChange={(e) => {
                const to = e.target.value;
                const name = assignable.find((a) => a.id === to)?.name ?? "";
                if (to) runBulk(tx(locale, `Asignar a ${name}`, `Assign to ${name}`), (l) => (l.agentId === to ? null : patchLead(l.id, { agentId: to })));
              }} className={cn(k.select, "h-10")} aria-label={tx(locale, "Asignar los leads seleccionados a…", "Assign selected leads to…")}>
                <option value="" disabled>{tx(locale, "Asignar a…", "Assign to…")}</option>
                {assignable.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            )}
            <select value="" disabled={bulk?.running} onChange={(e) => {
              const to = e.target.value as LeadStage;
              if (to) runBulk(tx(locale, `Cambiar a ${stageName(to)}`, `Move to ${stageName(to)}`), (l) => (l.stage === to ? null : patchLead(l.id, { stage: to })));
            }} className={cn(k.select, "h-10")} aria-label={tx(locale, "Cambiar el estado de los seleccionados a…", "Change status of selected to…")}>
              <option value="" disabled>{tx(locale, "Cambiar estado a…", "Change status to…")}</option>
              {STAGES.map(([key, es, en]) => <option key={key} value={key}>{tx(locale, es, en)}</option>)}
            </select>
            {!archiveAsk ? (
              <Button size="sm" variant="outline" className={cn(k.outline, "min-h-10")} disabled={bulk?.running} onClick={() => setArchiveAsk(true)} title={tx(locale, "Los marca como perdidos y salen de la bandeja activa", "Marks them as lost so they leave the active inbox")}>
                <Archive size={14} /> {tx(locale, "Archivar", "Archive")}
              </Button>
            ) : (
              <span role="group" aria-label={tx(locale, "Confirmar archivo", "Confirm archive")} className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-semibold">{tx(locale, `¿Archivar ${chosen.length}? Pasan a «Perdido».`, `Archive ${chosen.length}? They move to "Lost".`)}</span>
                <Button size="sm" variant="navy" className={cn(k.navy, "min-h-10")} disabled={bulk?.running} onClick={() => runBulk(tx(locale, "Archivar", "Archive"), (l) => (l.stage === "LOST" ? null : patchLead(l.id, { stage: "LOST" })))}>{tx(locale, "Sí, archivar", "Yes, archive")}</Button>
                <Button size="sm" variant="ghost" className={cn(k.ghost, "min-h-10")} onClick={() => setArchiveAsk(false)}>{tx(locale, "Cancelar", "Cancel")}</Button>
              </span>
            )}
            <Button size="sm" variant="ghost" className={cn(k.ghost, "ml-auto min-h-10")} disabled={bulk?.running} onClick={() => setPicked(new Set())}><X size={14} /> {tx(locale, "Quitar selección", "Clear selection")}</Button>
            {bulk && (
              <div className="w-full text-sm" role="status" aria-live="polite">
                <BulkResult locale={locale} bulk={bulk} onClose={() => setBulk(null)} />
              </div>
            )}
          </div>
        </div>
      )}
      {/* Direct chats ("Contactar" on a listing) with this advisor; lead conversations stay in the inbox above. */}
      {threads && meId && <HubMessages locale={locale} threads={threads} meId={meId} listings={listings} direct className="mt-6 block" />}
    </AdminShell>
  );
}

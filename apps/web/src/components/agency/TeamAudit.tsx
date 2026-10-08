"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ArrowUpDown, Eye, Loader2, Lock, MessageSquare } from "lucide-react";
import type { Locale } from "@/types/domain";
import { AdminShell } from "@/components/layout/AdminShell";
import { Empty, Initials, Panel, Pill, k, tab } from "./kit";
import type { AdvisorRow, ChatDetail, ChatSummary } from "@/server/team-audit";
import { AUDIT_PERIODS, dash, formatMinutes, type AuditPeriod } from "@/lib/team-metrics";
import { api } from "@/lib/api";
import { ago, dateTime, tx } from "@/lib/i18n";
import { cn } from "@/lib/cn";

type SortKey = "name" | "captures" | "closings" | "leads" | "answered" | "respMedianMin" | "slaPct" | "toursBooked" | "toursDone" | "leadToTourPct" | "quality" | "lastSeenAt";
type Advisor = { id: string; name: string; role: string };

const tnum = "[font-feature-settings:'lnum','tnum'] tabular-nums";

export function TeamAuditView({ locale, days, rows, advisors, threads, agentId }: { locale: Locale; days: AuditPeriod; rows: AdvisorRow[]; advisors: Advisor[]; threads: ChatSummary[]; agentId: string | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();
  const go = (next: { d?: AuditPeriod; agent?: string | null }) => {
    const q = new URLSearchParams();
    const d = next.d ?? days;
    const agent = next.agent === undefined ? agentId : next.agent;
    if (d !== 30) q.set("d", String(d));
    if (agent) q.set("agent", agent);
    start(() => router.push(`${pathname}${q.size ? `?${q}` : ""}`, { scroll: false }));
  };
  return (
    <AdminShell
      locale={locale}
      area="agency"
      title={tx(locale, "Auditoría del equipo", "Team audit")}
      actions={
        <div role="group" aria-label={tx(locale, "Periodo", "Period")} className="flex items-center gap-1.5">
          {AUDIT_PERIODS.map((p) => (
            <button key={p} type="button" className={tab(p === days)} aria-pressed={p === days} onClick={() => go({ d: p })}>
              {tx(locale, `${p} días`, `${p} days`)}
            </button>
          ))}
          {pending && <Loader2 size={16} className="animate-spin text-muted dark:text-mist" aria-label={tx(locale, "Cargando", "Loading")} />}
        </div>
      }
    >
      <div className="space-y-6">
        <Performance locale={locale} days={days} rows={rows} />
        <Chats locale={locale} advisors={advisors} threads={threads} agentId={agentId} onAgent={(a) => go({ agent: a })} pending={pending} />
      </div>
    </AdminShell>
  );
}

function Performance({ locale, days, rows }: { locale: Locale; days: AuditPeriod; rows: AdvisorRow[] }) {
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "leads", dir: -1 });
  const sorted = useMemo(() => {
    const val = (r: AdvisorRow): number | string | null => (sort.key === "name" ? r.name.toLowerCase() : sort.key === "lastSeenAt" ? new Date(r.lastSeenAt).getTime() : r[sort.key]);
    return [...rows].sort((a, b) => {
      const va = val(a);
      const vb = val(b);
      // "No data" always sinks to the bottom, whatever the direction.
      if (va == null && vb == null) return a.name.localeCompare(b.name);
      if (va == null) return 1;
      if (vb == null) return -1;
      return (va < vb ? -1 : va > vb ? 1 : 0) * sort.dir || a.name.localeCompare(b.name);
    });
  }, [rows, sort]);
  const th = (key: SortKey, label: string, right = true, title?: string) => {
    const on = sort.key === key;
    const Icon = on ? (sort.dir === 1 ? ArrowUp : ArrowDown) : ArrowUpDown;
    return (
      <th className={cn("px-3 py-3", right && "text-right")} aria-sort={on ? (sort.dir === 1 ? "ascending" : "descending") : "none"} title={title}>
        <button
          type="button"
          onClick={() => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : key === "name" || key === "respMedianMin" ? 1 : -1 }))}
          className={cn("inline-flex items-center gap-1 rounded uppercase tracking-[.12em] hover:text-navy dark:hover:text-ivory", on && "text-navy dark:text-ivory", right && "flex-row-reverse")}
        >
          <Icon size={12} aria-hidden className={on ? "" : "opacity-50"} />
          {label}
        </button>
      </th>
    );
  };
  const cell = cn("whitespace-nowrap px-3 py-3 text-right", tnum);
  const n = (v: number) => <span className={cn(k.num, "tracking-normal")}>{v}</span>;
  const metric = (label: string, value: React.ReactNode) => (
    <div className="min-w-0">
      <dt className="truncate text-[10px] font-semibold uppercase tracking-[.1em] text-muted dark:text-mist">{label}</dt>
      <dd className={cn("mt-0.5 text-[16px] leading-tight", tnum)}>{value}</dd>
    </div>
  );
  const sortOptions: [SortKey, string][] = [
    ["leads", tx(locale, "Leads", "Leads")],
    ["answered", tx(locale, "Respondidos", "Answered")],
    ["respMedianMin", tx(locale, "1.ª respuesta (más rápida)", "1st response (fastest)")],
    ["slaPct", "En 15 min"],
    ["toursBooked", tx(locale, "Visitas", "Tours")],
    ["toursDone", tx(locale, "Visitas realizadas", "Tours done")],
    ["leadToTourPct", tx(locale, "Lead → visita", "Lead → tour")],
    ["captures", tx(locale, "Captaciones", "Captures")],
    ["closings", tx(locale, "Cierres", "Closings")],
    ["quality", tx(locale, "Calidad", "Quality")],
    ["lastSeenAt", tx(locale, "Último acceso", "Last seen")],
    ["name", tx(locale, "Nombre", "Name")],
  ];
  return (
    <Panel
      eyebrow={tx(locale, `Últimos ${days} días`, `Last ${days} days`)}
      title={tx(locale, "Desempeño por asesor", "Performance by advisor")}
      bodyClass="-mx-5 md:-mx-6"
    >
      {rows.length === 0 ? (
        <Empty title={tx(locale, "Aún no hay asesores", "No advisors yet")} body={tx(locale, "Invita agentes desde Equipo: aquí verás sus leads, visitas y cierres en cuanto empiecen a trabajar.", "Invite agents from Team: their leads, tours and closings will show up here once they start working.")} />
      ) : (
        <>
          {/* Phones: one card per advisor with every metric; tablets and up keep the sortable table. */}
          <div className="px-5 md:hidden">
            <div className="flex items-center gap-2 text-sm">
              <label htmlFor="audit-sort" className={cn("shrink-0", k.muted)}>{tx(locale, "Ordenar por", "Sort by")}</label>
              <select
                id="audit-sort"
                className={cn(k.select, "h-10 min-w-0 flex-1")}
                value={sort.key}
                onChange={(e) => {
                  const key = e.target.value as SortKey;
                  setSort({ key, dir: key === "name" || key === "respMedianMin" ? 1 : -1 });
                }}
              >
                {sortOptions.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
              <button
                type="button"
                onClick={() => setSort((s) => ({ ...s, dir: s.dir === 1 ? -1 : 1 }))}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-navy shadow-[inset_0_0_0_1px_#D8CBB7] dark:text-ivory dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,.18)]"
                aria-label={sort.dir === 1 ? tx(locale, "Orden ascendente (cambiar a descendente)", "Ascending order (switch to descending)") : tx(locale, "Orden descendente (cambiar a ascendente)", "Descending order (switch to ascending)")}
              >
                {sort.dir === 1 ? <ArrowUp size={16} aria-hidden /> : <ArrowDown size={16} aria-hidden />}
              </button>
            </div>
            <ul className="mt-3 space-y-3" aria-label={tx(locale, `Desempeño por asesor, últimos ${days} días`, `Performance by advisor, last ${days} days`)}>
              {sorted.map((r) => (
                <li key={r.id} className={cn("rounded-2xl border p-4", k.line)}>
                  <div className="flex items-start gap-3">
                    <Initials name={r.name} size={40} />
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold leading-snug">{r.name}</div>
                      <div className={cn("truncate text-xs", k.muted)}>{r.role === "AGENCY_OWNER" ? tx(locale, "Dueño · con cartera asignada", "Owner · with assigned listings") : r.email}</div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                        {r.suspended ? <Pill tone="danger">{tx(locale, "Suspendido", "Suspended")}</Pill> : r.verified ? <Pill tone="ok">{tx(locale, "Verificado", "Verified")}</Pill> : <Pill tone="warn">{tx(locale, "Sin verificar", "Unverified")}</Pill>}
                        <span className={cn("text-xs", k.muted)} title={dateTime(r.lastSeenAt, locale)}>{tx(locale, "Último acceso", "Last seen")} {ago(r.lastSeenAt, locale)}</span>
                      </div>
                    </div>
                  </div>
                  <dl className={cn("mt-3 grid grid-cols-3 gap-x-2 gap-y-3 rounded-xl px-3 py-3", k.soft)}>
                    {metric(tx(locale, "Leads", "Leads"), n(r.leads))}
                    {metric(tx(locale, "Respondidos", "Answered"), n(r.answered))}
                    {metric(
                      "En 15 min",
                      <span className={cn(k.num, "tracking-normal", r.slaPct != null && (r.slaPct >= 80 ? k.okText : r.slaPct < 50 ? k.dangerText : k.warnText))}>{dash(r.slaPct, " %")}</span>,
                    )}
                    {metric(
                      tx(locale, "1.ª respuesta", "1st response"),
                      <>
                        <span className={cn(k.num, "tracking-normal")}>{formatMinutes(r.respMedianMin, locale)}</span>
                        {r.respMeanMin != null && <span className={cn("block text-[11px] font-normal", k.muted)}>{tx(locale, "media", "mean")} {formatMinutes(r.respMeanMin, locale)}</span>}
                      </>,
                    )}
                    {metric(tx(locale, "Visitas", "Tours"), <>{n(r.toursBooked)} <span className={cn("text-xs font-normal", k.muted)}>/ {r.toursDone} {tx(locale, "hechas", "done")}</span></>)}
                    {metric(tx(locale, "Lead → visita", "Lead → tour"), <span className={cn(k.num, "tracking-normal")}>{dash(r.leadToTourPct, " %")}</span>)}
                    {metric(tx(locale, "Captaciones", "Captures"), n(r.captures))}
                    {metric(tx(locale, "Cierres", "Closings"), n(r.closings))}
                    {metric(tx(locale, "Calidad", "Quality"), <span className={cn(k.num, "tracking-normal")}>{dash(r.quality)}</span>)}
                  </dl>
                </li>
              ))}
            </ul>
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="np-sticky-last w-full min-w-[1180px] text-sm">
              <caption className="sr-only">{tx(locale, `Desempeño por asesor, últimos ${days} días. Pulse un encabezado para ordenar.`, `Performance by advisor, last ${days} days. Press a header to sort.`)}</caption>
              <thead className={cn("border-b text-left", k.line, k.th)}>
                <tr>
                  {th("name", tx(locale, "Asesor", "Advisor"), false)}
                  <th className="px-3 py-3">{tx(locale, "Estado", "Status")}</th>
                  {th("captures", tx(locale, "Captaciones", "Captures"), true, tx(locale, "Inmuebles asignados creados en el periodo + captaciones propias convertidas", "Assigned listings created in the period + own captures converted"))}
                  {th("closings", tx(locale, "Cierres", "Closings"), true, tx(locale, "Inmuebles asignados vendidos o alquilados en el periodo", "Assigned listings sold or rented in the period"))}
                  {th("leads", tx(locale, "Leads", "Leads"))}
                  {th("answered", tx(locale, "Respondidos", "Answered"))}
                  {th("respMedianMin", tx(locale, "1.ª respuesta", "1st response"), true, tx(locale, "Mediana (y media) desde que entra el lead hasta la primera respuesta", "Median (and mean) from lead arrival to first response"))}
                  {th("slaPct", "En 15 min", true, tx(locale, "Igual que en el Panel: un lead sin respuesta pasados 15 min cuenta como tardío", "Same definition as the Dashboard: leads unanswered after 15 min count as breached"))}
                  {th("toursBooked", tx(locale, "Visitas", "Tours"), true, tx(locale, "Visitas agendadas en el periodo (sin canceladas)", "Tours booked in the period (cancelled excluded)"))}
                  {th("toursDone", tx(locale, "Realizadas", "Done"))}
                  {th("leadToTourPct", tx(locale, "Lead → visita", "Lead → tour"), true, tx(locale, "Leads del periodo que llegaron a visita", "Leads of the period that reached a tour"))}
                  {th("quality", tx(locale, "Calidad", "Quality"), true, tx(locale, "Calidad media de sus fichas (0–100)", "Average quality of their listings (0–100)"))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((r) => (
                  <tr key={r.id} className={cn("border-t first:border-t-0", k.line)}>
                    <td className="px-4 py-3 md:pl-6">
                      <div className="flex items-center gap-3">
                        <Initials name={r.name} size={36} />
                        <div className="min-w-0">
                          <div className="font-semibold">{r.name}</div>
                          <div className={cn("text-xs", k.muted)}>{r.role === "AGENCY_OWNER" ? tx(locale, "Dueño · con cartera asignada", "Owner · with assigned listings") : r.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {r.suspended ? <Pill tone="danger">{tx(locale, "Suspendido", "Suspended")}</Pill> : r.verified ? <Pill tone="ok">{tx(locale, "Verificado", "Verified")}</Pill> : <Pill tone="warn">{tx(locale, "Sin verificar", "Unverified")}</Pill>}
                      </div>
                      <div className={cn("mt-1 whitespace-nowrap text-xs", k.muted)} title={dateTime(r.lastSeenAt, locale)}>
                        {tx(locale, "Último acceso", "Last seen")} {ago(r.lastSeenAt, locale)}
                      </div>
                    </td>
                    <td className={cell}>{n(r.captures)}</td>
                    <td className={cell}>{n(r.closings)}</td>
                    <td className={cell}>{n(r.leads)}</td>
                    <td className={cell}>{n(r.answered)}</td>
                    <td className={cell}>
                      <div className={cn(k.num, "tracking-normal")}>{formatMinutes(r.respMedianMin, locale)}</div>
                      {r.respMeanMin != null && <div className={cn("text-xs", k.muted)}>{tx(locale, "media", "mean")} {formatMinutes(r.respMeanMin, locale)}</div>}
                    </td>
                    <td className={cell}>
                      <span className={cn(k.num, "tracking-normal", r.slaPct != null && (r.slaPct >= 80 ? k.okText : r.slaPct < 50 ? k.dangerText : k.warnText))}>{dash(r.slaPct, " %")}</span>
                    </td>
                    <td className={cell}>{n(r.toursBooked)}</td>
                    <td className={cell}>{n(r.toursDone)}</td>
                    <td className={cell}><span className={cn(k.num, "tracking-normal")}>{dash(r.leadToTourPct, " %")}</span></td>
                    <td className={cn(cell, "pr-4 md:pr-6")}><span className={cn(k.num, "tracking-normal")}>{dash(r.quality)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={cn("mt-4 px-5 text-[13px] md:px-6", k.muted)}>
            {tx(
              locale,
              "Datos reales de la agencia: leads asignados, visitas, historial de estado de los inmuebles y accesos. «—» significa que no hay datos suficientes en el periodo (no es un cero).",
              "Real agency data: assigned leads, tours, listing status history and sign-ins. “—” means there is not enough data in the period (it is not a zero).",
            )}
          </p>
        </>
      )}
    </Panel>
  );
}

function Chats({ locale, advisors, threads, agentId, onAgent, pending }: { locale: Locale; advisors: Advisor[]; threads: ChatSummary[]; agentId: string | null; onAgent: (id: string | null) => void; pending: boolean }) {
  const [open, setOpen] = useState<ChatDetail | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const show = async (id: string) => {
    setLoading(id);
    setErr(null);
    try {
      setOpen(await api<ChatDetail>(`agency/audit/threads/${id}`));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(null);
    }
  };
  const names = (ps: ChatSummary["participants"]) => ps.map((p) => p.name).join(" · ") || tx(locale, "Sin participantes", "No participants");
  const notice = (
    <div className={cn("flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-[13px] font-semibold", k.soft)}>
      <Lock size={14} aria-hidden /> {tx(locale, "Solo lectura · el acceso queda registrado", "Read-only · access is logged")}
    </div>
  );
  return (
    <Panel
      eyebrow={tx(locale, "Supervisión", "Oversight")}
      title={tx(locale, "Chats del equipo", "Team chats")}
      action={
        <label className="flex items-center gap-2 text-sm">
          <span className={k.muted}>{tx(locale, "Asesor", "Advisor")}</span>
          <select className={k.select} value={agentId ?? ""} disabled={pending} onChange={(e) => { setOpen(null); onAgent(e.target.value || null); }}>
            <option value="">{tx(locale, "Todo el equipo", "Whole team")}</option>
            {advisors.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </label>
      }
    >
      {notice}
      {err && <div role="alert" className={cn("mt-3", k.err)}>{err}</div>}
      {threads.length === 0 ? (
        <Empty
          title={tx(locale, "No hay conversaciones", "No conversations")}
          body={agentId ? tx(locale, "Este asesor todavía no tiene chats con clientes.", "This advisor has no client chats yet.") : tx(locale, "Cuando tu equipo converse con compradores o propietarios, los chats aparecerán aquí.", "When your team talks with buyers or owners, the chats will show up here.")}
        />
      ) : (
        <div className="mt-4 grid gap-4 [&>*]:min-w-0 lg:grid-cols-[minmax(280px,380px)_1fr]">
          <ul className={cn("max-h-[560px] divide-y overflow-y-auto rounded-xl border", k.line, k.divide)} aria-label={tx(locale, "Conversaciones", "Conversations")}>
            {threads.map((t) => {
              const active = open?.id === t.id;
              return (
                <li key={t.id}>
                  <button type="button" onClick={() => show(t.id)} aria-current={active ? "true" : undefined} className={cn("block w-full px-4 py-3 text-left transition-colors", active ? "bg-[#E6DDD2] dark:bg-white/10" : k.hover)}>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate font-semibold">{names(t.participants)}</span>
                      <span className={cn("shrink-0 text-xs", k.muted)}>{t.last ? ago(t.last.at, locale) : ago(t.updatedAt, locale)}</span>
                    </div>
                    <div className={cn("mt-0.5 truncate text-xs", k.muted)}>{t.listing ? tx(locale, t.listing.titleEs, t.listing.titleEn) : t.subject ?? tx(locale, "Sin inmueble", "No listing")}</div>
                    <div className="mt-1.5 line-clamp-2 text-[13px]">
                      {t.last ? <><span className="font-semibold">{t.last.senderName}:</span> {t.last.body}</> : <span className={k.muted}>{tx(locale, "Sin mensajes todavía", "No messages yet")}</span>}
                    </div>
                    <div className={cn("mt-1 flex items-center gap-1 text-xs", k.muted)}>
                      {loading === t.id ? <Loader2 size={12} className="animate-spin" aria-hidden /> : <MessageSquare size={12} aria-hidden />}
                      <span className={tnum}>{t.messages}</span> {tx(locale, t.messages === 1 ? "mensaje" : "mensajes", t.messages === 1 ? "message" : "messages")}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
          <section aria-live="polite" aria-label={tx(locale, "Conversación", "Conversation")} className={cn("flex min-h-[320px] flex-col rounded-xl border", k.line)}>
            {!open ? (
              <div className={cn("m-auto flex max-w-xs flex-col items-center gap-2 p-8 text-center text-sm", k.muted)}>
                <Eye size={20} aria-hidden />
                {tx(locale, "Elige una conversación para leerla. Abrirla queda registrado en la auditoría y no la marca como leída para el equipo.", "Pick a conversation to read it. Opening it is logged in the audit trail and does not mark it as read for the team.")}
              </div>
            ) : (
              <>
                <header className={cn("border-b px-4 py-3", k.line)}>
                  <div className="font-semibold">{names(open.participants)}</div>
                  <div className={cn("mt-0.5 flex flex-wrap gap-x-3 text-xs", k.muted)}>
                    {open.listing && <Link className={k.link} href={`/${locale}/agency/listings/${open.listing.id}/edit`}>{tx(locale, open.listing.titleEs, open.listing.titleEn)}</Link>}
                    {open.lead && <span>{tx(locale, "Lead", "Lead")}: {open.lead.name}</span>}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {open.participants.map((p) => <Pill key={p.id} tone={p.member ? "neutral" : "muted"}>{p.name}{p.member ? "" : ` · ${tx(locale, "cliente", "client")}`}</Pill>)}
                  </div>
                </header>
                <ol className="max-h-[440px] flex-1 space-y-3 overflow-y-auto px-4 py-4">
                  {open.messages.length === 0 && <li className={cn("text-sm", k.muted)}>{tx(locale, "La conversación aún no tiene mensajes.", "This conversation has no messages yet.")}</li>}
                  {open.messages.map((m) => {
                    const staff = open.participants.find((p) => p.id === m.senderId)?.member ?? false;
                    return (
                      <li key={m.id} className={cn("flex", staff ? "justify-end" : "justify-start")}>
                        <div className={cn("max-w-[80%] rounded-2xl px-3.5 py-2.5 text-[14px]", staff ? "bg-navy text-ivory dark:bg-[#3A322D]" : "bg-[#F6F2EA] text-navy dark:bg-white/[.06] dark:text-ivory")}>
                          <div className={cn("mb-0.5 text-[12px] font-semibold", staff ? "text-ivory/85" : "text-muted dark:text-mist")}>
                            {m.senderName} · <time dateTime={m.at}>{dateTime(m.at, locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</time>
                          </div>
                          <p className="whitespace-pre-wrap break-words">{m.body}</p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
                <footer className={cn("border-t px-4 py-3 text-xs", k.line, k.muted)}>
                  <Lock size={12} aria-hidden className="mr-1 inline" />
                  {tx(locale, `Solo lectura · acceso registrado el ${dateTime(open.loggedAt, locale)}. No se marcan mensajes como leídos.`, `Read-only · access logged on ${dateTime(open.loggedAt, locale)}. Messages are not marked as read.`)}
                </footer>
              </>
            )}
          </section>
        </div>
      )}
    </Panel>
  );
}

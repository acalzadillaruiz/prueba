"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { AlertTriangle, Ban, Bot, CheckCircle2, ChevronLeft, ChevronRight, Eye, Loader2, LogIn, Plus, RefreshCw, RotateCcw, Search, ShieldAlert, ShieldCheck, Sprout } from "lucide-react";
import type { Role } from "@newplace/config";
import type { Agency, Listing, Locale, User } from "@/types/domain";
import { AdminShell } from "@/components/layout/AdminShell";
import { PropertyArt } from "@/components/art/PropertyArt";
import { Button, Field } from "@/components/ui";
import { Chip, Count, Initials, Kpi, Panel, Pill, StatusPill, k } from "./kit";
import { BarChart } from "./charts";
import { useApp } from "@/lib/store";
import { api, type ApiClientError } from "@/lib/api";
import { AUDIT_PREFIXES, auditDetail, auditLabel } from "@/lib/audit-labels";
import type { AuditPage } from "@/server/audit-log";
import { listingPhoto } from "@/lib/photos";
import { ago, dateTime, money, num, tx } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { listingHref } from "@/lib/listing-href";

function useRun() {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const run = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    setErr(null);
    try {
      await fn();
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  };
  return { busy, err, run };
}

export interface PlatformHomeData {
  agencies: (Agency & { listings: number })[];
  users: number;
  activeListings: number;
  leads7d: number;
  leadsPrev7d: number;
  firstResponseMin: number | null;
  weekly: { label: string; value: number }[];
  health: { k: string; v: string; ok: boolean }[];
  audit: { at: string; actor: string; action: string; target: string }[];
}

export function PlatformHome({ locale, data }: { locale: Locale; data: PlatformHomeData }) {
  const delta = data.leadsPrev7d ? Math.round(((data.leads7d - data.leadsPrev7d) / data.leadsPrev7d) * 100) : 0;
  return (
    <AdminShell locale={locale} area="platform" title={tx(locale, "Métricas globales", "Global metrics")}>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-5 [&>*]:min-w-0">
        <Kpi label={tx(locale, "Agencias", "Agencies")} value={data.agencies.length} hint={`${data.agencies.filter((a) => a.status === "TRIAL").length} ${tx(locale, "en prueba", "on trial")}`} />
        <Kpi label={tx(locale, "Usuarios", "Users")} value={num(data.users, locale)} hint={tx(locale, "registrados", "registered")} />
        <Kpi label={tx(locale, "Inmuebles activos", "Active listings")} value={data.activeListings} hint={tx(locale, "en el buscador", "in search")} />
        <Kpi label={tx(locale, "Leads · 7 días", "Leads · 7 days")} value={data.leads7d} delta={`${delta >= 0 ? "+" : ""}${delta} %`} down={delta < 0} hint={tx(locale, "vs. semana anterior", "vs. previous week")} />
        <Kpi label={tx(locale, "Tiempo 1ª respuesta", "First response")} value={data.firstResponseMin === null ? "—" : `${data.firstResponseMin} min`} hint={tx(locale, "mediana plataforma", "platform median")} />
      </div>
      <div className="mt-6 grid gap-6 [&>*]:min-w-0 xl:grid-cols-[1.45fr_1fr]">
        <Panel title={tx(locale, "Leads por semana", "Weekly leads")} action={<span className={cn("pt-2 text-[13px]", k.muted)}>12 {tx(locale, "semanas · plataforma", "weeks · platform")}</span>}>
          <BarChart data={data.weekly} height={220} />
        </Panel>
        <Panel title={tx(locale, "Salud del sistema", "System health")}>
          <ul className={cn("divide-y", k.divide)}>
            {data.health.map((h) => (
              <li key={h.k} className="flex items-center gap-2.5 py-2.5 text-sm first:pt-0">
                {h.ok ? <CheckCircle2 size={16} strokeWidth={1.7} className={k.okText} /> : <AlertTriangle size={16} strokeWidth={1.7} className={k.warnText} />}
                <span className="flex-1">{h.k}</span>
                <span className={cn("text-right text-xs", k.muted)}>{h.v}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
      <div className="mt-6 grid gap-6 [&>*]:min-w-0 xl:grid-cols-2">
        <Panel title={tx(locale, "Agencias", "Agencies")} action={<Link href={`/${locale}/platform/agencies`} className={cn("pt-2 text-[14px]", k.link)}>{tx(locale, "Gestionar", "Manage")}</Link>}>
          <ul className={cn("divide-y", k.divide)}>
            {data.agencies.map((a) => (
              <li key={a.id} className="flex items-center gap-3 py-3 first:pt-0">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-display text-xs font-bold text-navy" style={{ background: a.color }}>{a.initials}</span>
                <div className="min-w-0 flex-1"><div className="truncate font-semibold">{a.name}</div><div className={cn("text-xs", k.muted)}>{a.listings} {tx(locale, "inmuebles", "listings")} · {a.city}</div></div>
                <Chip>{a.plan}</Chip>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title={tx(locale, "Auditoría reciente", "Recent audit log")} action={<Link href={`/${locale}/platform/audit`} className={cn("pt-2 text-[14px]", k.link)}>{tx(locale, "Ver todo", "View all")} →</Link>}>
          <ul className={cn("divide-y", k.divide)}>
            {data.audit.map((a, i) => (
              <li key={i} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-sm first:pt-0 sm:flex-nowrap">
                <span className={cn("w-20 shrink-0 text-xs", k.muted)}>{ago(a.at, locale)}</span>
                <span className="shrink-0 font-semibold">{a.actor || tx(locale, "Sistema", "System")}</span>
                <Chip className="shrink-0 py-0.5 text-[11px]">{auditLabel(a.action, locale)}</Chip>
                <span className={cn("min-w-0 flex-1 basis-full truncate sm:basis-auto", k.muted)}>{a.target}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </AdminShell>
  );
}

export function PlatformAgencies({ locale, agencies }: { locale: Locale; agencies: (Agency & { listings: number; members: number; leads30: number })[] }) {
  const { agency: current } = useApp();
  const { busy, err, run } = useRun();
  const [creating, setCreating] = useState(false);
  const [f, setF] = useState({ name: "", city: "Caracas" });
  return (
    <AdminShell locale={locale} area="platform" title={tx(locale, "Agencias", "Agencies")} actions={<Button className={k.primary} onClick={() => setCreating(!creating)} aria-expanded={creating}><Plus size={16} /> {tx(locale, "Nueva agencia", "New agency")}</Button>}>
      {err && <div role="alert" className="mb-4 rounded-lg bg-[#B3261E33] px-3 py-2 text-sm text-[#E79A7F]">{err}</div>}
      {current && (
        <div className="np-in mb-4 flex flex-wrap items-center gap-3 rounded-[18px] bg-rosa/70 px-4 py-3 text-sm text-navy dark:bg-white/[.08] dark:text-ivory">
          <LogIn size={16} strokeWidth={1.7} /> {tx(locale, `Impersonando a ${current.name}. Todo queda en el registro de auditoría.`, `Impersonating ${current.name}. Everything is audit-logged.`)}
          <a href={`/${locale}/agency`} className={cn("ml-auto", k.link)}>{tx(locale, "Abrir panel", "Open dashboard")} →</a>
          <button onClick={() => run("exit", () => api("platform/impersonate", { method: "POST", json: { agencyId: null } }))} className={cn("rounded-full px-3 py-1", k.ghost)}>{tx(locale, "Salir", "Exit")}</button>
        </div>
      )}
      {creating && (
        <form className={cn("np-in mb-4 flex flex-wrap items-end gap-3 p-5", k.card)} onSubmit={(e) => { e.preventDefault(); run("create", async () => { await api("platform/agencies", { method: "POST", json: f }); setCreating(false); setF({ name: "", city: "Caracas" }); }); }}>
          <div className="w-64"><Field label={tx(locale, "Nombre", "Name")}><input required minLength={2} className={k.input} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field></div>
          <div className="w-48"><Field label={tx(locale, "Ciudad", "City")}><input required className={k.input} value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} /></Field></div>
          <Button variant="navy" className={k.navy} disabled={busy === "create"}>{busy === "create" && <Loader2 size={14} className="animate-spin" />} {tx(locale, "Crear", "Create")}</Button>
        </form>
      )}
      <div className={cn("overflow-x-auto", k.card)}>
        <table className="w-full min-w-[980px] text-sm">
          <thead className={cn("border-b text-left", k.line, k.th)}>
            <tr><th className="px-4 py-3">{tx(locale, "Agencia", "Agency")}</th><th className="px-3 py-3">{tx(locale, "Estado", "Status")}</th><th className="px-3 py-3">{tx(locale, "Verificación", "Verification")}</th><th className="px-3 py-3">{tx(locale, "Plan (flag, sin cobro)", "Plan (flag, no billing)")}</th><th className="px-3 py-3 text-right">Listings</th><th className="px-3 py-3 text-right">{tx(locale, "Miembros", "Members")}</th><th className="px-3 py-3 text-right">Leads 30 d</th><th className="px-3 py-3" /></tr>
          </thead>
          <tbody>
            {agencies.map((a) => (
              <tr key={a.id} className={cn("border-t first:border-t-0", k.line)}>
                <td className="px-4 py-3"><div className="flex items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-display text-xs font-bold text-navy" style={{ background: a.color }}>{a.initials}</span><div><div className="font-semibold">{a.name}</div><div className={cn("text-xs", k.muted)}>{a.city} · {tx(locale, "desde", "since")} {dateTime(a.createdAt, locale, { month: "short", year: "numeric" })}</div></div></div></td>
                <td className="px-3">
                  <select value={a.status} onChange={(e) => {
                      const status = e.target.value;
                      // Suspending hides every listing of the agency and signs its team out: ask first.
                      if (status === "SUSPENDED" && !window.confirm(tx(locale, `¿Suspender ${a.name}? Sus inmuebles dejarán de verse y su equipo perderá el acceso.`, `Suspend ${a.name}? Its listings will be hidden and its team will lose access.`))) return;
                      run(a.id, () => api(`platform/agencies/${a.id}`, { method: "PATCH", json: { status } }));
                    }} className={k.select} aria-label={tx(locale, "Estado", "Status")}>
                    <option value="ACTIVE">{tx(locale, "Activa", "Active")}</option><option value="TRIAL">{tx(locale, "En prueba", "Trial")}</option><option value="SUSPENDED">{tx(locale, "Suspendida", "Suspended")}</option>
                  </select>
                </td>
                <td className="px-3">{a.verified ? <Pill tone="ok"><ShieldCheck size={12} /> {tx(locale, "Verificada", "Verified")}</Pill> : <Button size="sm" variant="outline" className={k.outline} disabled={busy === a.id} onClick={() => run(a.id, () => api(`platform/agencies/${a.id}`, { method: "PATCH", json: { verified: true } }))}><Eye size={13} /> {tx(locale, "Verificar", "Verify")}</Button>}</td>
                <td className="px-3">
                  <select value={a.plan} onChange={(e) => run(a.id, () => api(`platform/agencies/${a.id}`, { method: "PATCH", json: { plan: e.target.value } }))} className={k.select} aria-label="Plan">
                    <option>FREE</option><option>PRO</option><option>ENTERPRISE</option>
                  </select>
                </td>
                <td className="px-3 text-right">{a.listings}</td>
                <td className="px-3 text-right">{a.members}</td>
                <td className="px-3 text-right">{a.leads30}</td>
                <td className="px-3">
                  <Button size="sm" variant={current?.id === a.id ? "navy" : "outline"} className={current?.id === a.id ? k.navy : k.outline} disabled={busy === `imp-${a.id}`} onClick={() => run(`imp-${a.id}`, () => api("platform/impersonate", { method: "POST", json: { agencyId: a.id } }))}>
                    <LogIn size={13} /> {current?.id === a.id ? tx(locale, "Activa", "Active") : tx(locale, "Impersonar", "Impersonate")}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}

const AGENCY_ROLES: Role[] = ["AGENCY_OWNER", "BACKOFFICE", "AGENT", "CAPTOR", "PHOTOGRAPHER"];
const PERSONAL_ROLES: Role[] = ["SEEKER", "OWNER_PRIVATE", "SUPERADMIN"];

export function PlatformUsers({ locale, users, providers }: { locale: Locale; users: (User & { suspended: boolean; agencyName?: string })[]; providers: Record<string, string[]> }) {
  const { user: me } = useApp();
  const tr = useTranslations("roles");
  const { busy, err, run } = useRun();
  const [roleErr, setRoleErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const rows = users.filter((u) => (u.name + u.email + u.role + tr(u.role) + (u.agencyName ?? "")).toLowerCase().includes(q.toLowerCase()));
  const changeRole = (u: User & { agencyName?: string }, role: Role) =>
    run(`role-${u.id}`, async () => {
      setRoleErr(null);
      try {
        await api(`platform/users/${u.id}`, { method: "PATCH", json: { role } });
      } catch (e) {
        const why = ((e as ApiClientError).details as { role?: string } | undefined)?.role;
        setRoleErr(
          why === "last owner"
            ? tx(locale, `${u.name} es el último dueño de ${u.agencyName ?? "su agencia"}. Nombra otro dueño antes de cambiar su rol.`, `${u.name} is the last owner of ${u.agencyName ?? "their agency"}. Appoint another owner before changing this role.`)
            : why === "no agency membership"
              ? tx(locale, "Los roles de agencia solo se asignan a miembros de una agencia (invítalo desde la agencia).", "Agency roles can only be given to agency members (invite them from the agency).")
              : why === "agency member needs an agency role"
                ? tx(locale, "Un miembro de agencia solo puede tener roles de agencia.", "An agency member can only have agency roles.")
                : (e as Error).message,
        );
      }
    });
  return (
    <AdminShell locale={locale} area="platform" title={tx(locale, "Usuarios", "Users")}>
      {(roleErr || err) && <div role="alert" className={cn("mb-4", k.err)}>{roleErr ?? err}</div>}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative w-80 max-w-full"><Search size={15} className={cn("absolute left-3.5 top-1/2 -translate-y-1/2", k.muted)} /><input value={q} onChange={(e) => setQ(e.target.value)} className={cn(k.input, "rounded-full pl-10")} placeholder={tx(locale, "Nombre, email, rol o agencia…", "Name, email, role or agency…")} aria-label={tx(locale, "Buscar", "Search")} /></div>
        <span className={cn("text-sm", k.muted)}>{rows.length} / {users.length}</span>
      </div>
      <div className={cn("overflow-x-auto", k.card)}>
        <table className="w-full min-w-[860px] text-sm">
          <thead className={cn("border-b text-left", k.line, k.th)}><tr><th className="px-4 py-3">{tx(locale, "Usuario", "User")}</th><th className="px-3 py-3">{tx(locale, "Rol", "Role")}</th><th className="px-3 py-3">{tx(locale, "Agencia", "Agency")}</th><th className="px-3 py-3">{tx(locale, "Acceso", "Sign-in")}</th><th className="px-3 py-3">{tx(locale, "Actividad", "Activity")}</th><th className="px-3 py-3" /></tr></thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id} className={cn("border-t first:border-t-0", k.line, u.suspended && "opacity-50")}>
                <td className="px-4 py-2.5"><div className="flex items-center gap-3"><Initials name={u.name} size={36} /><div><div className="font-semibold">{u.name}</div><div className={cn("text-xs", k.muted)}>{u.email}</div></div></div></td>
                <td className="px-3">
                  {u.id === me?.id ? (
                    <Chip className="py-0.5 text-[11px]">{tr(u.role)}</Chip>
                  ) : (
                    <select
                      value={u.role}
                      disabled={busy === `role-${u.id}`}
                      onChange={(e) => changeRole(u, e.target.value as Role)}
                      className={k.select}
                      aria-label={tx(locale, `Rol de ${u.name}`, `Role of ${u.name}`)}
                    >
                      {[...new Set([u.role, ...(u.agencyId ? AGENCY_ROLES : PERSONAL_ROLES)])].map((r) => <option key={r} value={r}>{tr(r)}</option>)}
                    </select>
                  )}
                </td>
                <td className={cn("px-3", k.muted)}>{u.agencyName ?? "—"}</td>
                <td className={cn("px-3 text-xs", k.muted)}>{providers[u.id]?.join(" · ") || "—"}</td>
                {/* Relative time depends on "now": server and client may differ by a minute → no hydration error (#418). */}
                <td className={cn("px-3 text-xs", k.muted)} suppressHydrationWarning>{u.suspended ? tx(locale, "Suspendido", "Suspended") : ago(u.lastSeen, locale)}</td>
                <td className="px-3">
                  {u.id !== me?.id && (
                    <button disabled={busy === u.id} onClick={() => {
                      if (!u.suspended && !window.confirm(tx(locale, `¿Suspender a ${u.name}? No podrá iniciar sesión.`, `Suspend ${u.name}? They won’t be able to sign in.`))) return;
                      run(u.id, () => api(`platform/users/${u.id}`, { method: "PATCH", json: { suspended: !u.suspended } }));
                    }} className={cn("rounded-full p-2 hover:bg-[#E6EBF1] dark:hover:bg-white/5", u.suspended ? k.okText : k.dangerText)} aria-label={u.suspended ? tx(locale, "Reactivar", "Restore") : tx(locale, "Suspender", "Suspend")} title={u.suspended ? tx(locale, "Reactivar", "Restore") : tx(locale, "Suspender", "Suspend")}>
                      {u.suspended ? <RotateCcw size={14} /> : <Ban size={14} />}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}

export function PlatformModeration({ locale, reports, listings }: { locale: Locale; reports: { id: string; title: string; reason: { es: string; en: string }; reporter: string; agency: string; at: string; severity: "high" | "medium" | "low"; listingId: string | null }[]; listings: Listing[] }) {
  const { busy, err, run } = useRun();
  const [q, setQ] = useState("");
  // Take-downs are confirmed with a reason (shown to the agency and stored in the audit log).
  const [confirming, setConfirming] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const rows = listings.filter((l) => (l.title_es + " " + l.title_en + " " + l.zone + " " + (l.agency?.name ?? "")).toLowerCase().includes(q.toLowerCase())).slice(0, 40);
  return (
    <AdminShell locale={locale} area="platform" title={tx(locale, "Moderación", "Moderation")}>
      {err && <div role="alert" className={cn("mb-4", k.err)}>{err}</div>}
      <div className="grid gap-6 [&>*]:min-w-0 xl:grid-cols-[1fr_1.3fr]">
        <div className={cn(k.card, "self-start p-5 md:p-6")}>
          <h2 className={cn(k.title, "mb-3 flex items-center gap-2")}><ShieldAlert size={18} strokeWidth={1.6} /> {tx(locale, "Reportes", "Reports")} <Count>{reports.length}</Count></h2>
          {reports.length === 0 && <div className={cn("text-sm", k.muted)}>{tx(locale, "Sin reportes pendientes.", "No pending reports.")}</div>}
          {reports.map((m) => (
            <div key={m.id} className={cn("border-t py-3.5 first:border-0", k.line)}>
              <div className="flex items-center gap-2">
                <span className={cn("h-2 w-2 shrink-0 rounded-full", m.severity === "high" ? "bg-danger" : m.severity === "medium" ? "bg-warn" : "bg-[#C9C1B2]")} />
                {(() => {
                  const target = listings.find((x) => x.id === m.listingId);
                  return target ? (
                    <a href={listingHref(locale, target)} target="_blank" rel="noreferrer" className="font-semibold underline decoration-navy/30 underline-offset-4 hover:decoration-navy dark:decoration-ivory/30">{m.title}</a>
                  ) : (
                    <span className="font-semibold">{m.title}</span>
                  );
                })()}
              </div>
              <div className={cn("mt-0.5 text-sm", k.muted)}>{tx(locale, m.reason.es, m.reason.en)} · {m.agency} · {ago(m.at, locale)}</div>
              <div className="mt-2 flex gap-2">
                <Button size="sm" variant="outline" className={k.outline} disabled={busy === m.id} onClick={() => run(m.id, () => api(`platform/moderation/${m.id}`, { method: "PATCH", json: { resolved: true } }))}>{tx(locale, "Descartar", "Dismiss")}</Button>
                {m.listingId && confirming !== `report-${m.id}` && (
                  <Button size="sm" variant="navy" className={k.navy} disabled={busy === m.id} onClick={() => { setReason(tx(locale, m.reason.es, m.reason.en)); setConfirming(`report-${m.id}`); }}>
                    <Ban size={13} /> {tx(locale, "Retirar", "Take down")}
                  </Button>
                )}
              </div>
              {m.listingId && confirming === `report-${m.id}` && (
                <form
                  className="np-in mt-2.5 flex flex-wrap items-center gap-2 rounded-xl bg-[#B3261E0D] p-3 dark:bg-[#B3261E26]"
                  onSubmit={(e) => {
                    e.preventDefault();
                    setConfirming(null);
                    const why = reason.trim() || m.reason.es;
                    void run(m.id, async () => {
                      await api(`platform/listings/${m.listingId}`, { method: "PATCH", json: { takedown: true, reason: why } });
                      await api(`platform/moderation/${m.id}`, { method: "PATCH", json: { resolved: true } });
                    });
                  }}
                >
                  <label className="sr-only" htmlFor={`report-reason-${m.id}`}>{tx(locale, "Motivo de la retirada", "Take-down reason")}</label>
                  <input id={`report-reason-${m.id}`} autoFocus value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} className={cn(k.input, "h-9 min-w-0 flex-1 md:h-9")} />
                  <Button size="sm" type="submit" className="bg-danger hover:bg-[#962019] dark:bg-[#F3A493] dark:text-navy">{tx(locale, "Confirmar retirada", "Confirm take-down")}</Button>
                  <Button size="sm" type="button" variant="ghost" className={k.ghost} onClick={() => setConfirming(null)}>{tx(locale, "Cancelar", "Cancel")}</Button>
                </form>
              )}
            </div>
          ))}
        </div>
        <div className={cn(k.card, "overflow-hidden")}>
          <div className={cn("flex flex-wrap items-center gap-3 border-b px-5 py-4", k.line)}>
            <h2 className={k.title}>{tx(locale, "Inmuebles publicados", "Live listings")}</h2>
            <input value={q} onChange={(e) => setQ(e.target.value)} className={cn(k.input, "ml-auto h-9 w-56 rounded-full md:h-9")} placeholder={tx(locale, "Buscar…", "Search…")} aria-label={tx(locale, "Buscar", "Search")} />
          </div>
          {rows.map((l) => {
            // Only a platform take-down can be restored here; a listing the agency withdrew itself stays the agency's call.
            const down = !!l.takedownReason;
            return (
              <div key={l.id} data-listing={l.id} className={cn("border-t first:border-0", k.line)}>
              <div className={cn("flex flex-wrap items-center gap-3 px-5 py-3", down && "bg-[#B3261E0A] dark:bg-[#B3261E1F]")}>
                <PropertyArt scene={l.scenes[0]} seed={l.id} photo={listingPhoto(l, 0)} className={cn("h-12 w-16 shrink-0 rounded-lg", down && "opacity-40 grayscale")} />
                <div className="min-w-0 flex-1 basis-48">
                  <div className={cn("truncate font-semibold", down && cn("line-through", k.muted))}>{tx(locale, l.title_es, l.title_en)}</div>
                  <div className={cn("text-xs", k.muted)}>{l.agency?.name ?? tx(locale, "Particular", "Private owner")} · {l.zone} · {money(l.priceAmount, locale)}</div>
                </div>
                <StatusPill status={l.status} review={l.review} locale={locale} />
                {l.review === "PENDING" && !down && (
                  <Button size="sm" variant="outline" className={k.outline} disabled={busy === l.id} onClick={() => void run(l.id, () => api(`listings/${l.id}`, { method: "PATCH", json: { review: "APPROVED" } }))}>
                    {tx(locale, "Aprobar", "Approve")}
                  </Button>
                )}
                {confirming === l.id ? null : (
                  <Button
                    size="sm"
                    variant={down ? "outline" : "ghost"}
                    className={down ? k.outline : cn("shadow-[inset_0_0_0_1px_rgb(179_38_30/.35)] hover:bg-[#B3261E0D] dark:shadow-[inset_0_0_0_1px_rgb(243_164_147/.4)] dark:hover:bg-white/5", k.dangerText)}
                    disabled={busy === l.id}
                    onClick={() => {
                      if (down) void run(l.id, () => api(`platform/listings/${l.id}`, { method: "PATCH", json: { takedown: false } }));
                      else {
                        setReason("");
                        setConfirming(l.id);
                      }
                    }}
                  >
                    {busy === l.id ? <Loader2 size={13} className="animate-spin" /> : down ? <RotateCcw size={13} /> : <Ban size={13} />} {down ? tx(locale, "Restaurar", "Restore") : tx(locale, "Apagar", "Take down")}
                  </Button>
                )}
              </div>
              {confirming === l.id && (
                <form
                  className={cn("np-in flex flex-wrap items-center gap-2 border-t bg-[#B3261E0D] px-5 py-3 dark:bg-[#B3261E26]", k.line)}
                  onSubmit={(e) => {
                    e.preventDefault();
                    setConfirming(null);
                    void run(l.id, () => api(`platform/listings/${l.id}`, { method: "PATCH", json: { takedown: true, reason: reason.trim() || tx(locale, "Moderación", "Moderation") } }));
                  }}
                >
                  <label className="sr-only" htmlFor={`reason-${l.id}`}>{tx(locale, "Motivo de la retirada", "Take-down reason")}</label>
                  <input id={`reason-${l.id}`} autoFocus value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} placeholder={tx(locale, "Motivo (lo verá la agencia)", "Reason (the agency will see it)")} className={cn(k.input, "h-9 min-w-0 flex-1 md:h-9")} />
                  <Button size="sm" type="submit" className="bg-danger hover:bg-[#962019] dark:bg-[#F3A493] dark:text-navy">{tx(locale, "Confirmar retirada", "Confirm take-down")}</Button>
                  <Button size="sm" type="button" variant="ghost" className={k.ghost} onClick={() => setConfirming(null)}>{tx(locale, "Cancelar", "Cancel")}</Button>
                </form>
              )}
              </div>
            );
          })}
        </div>
      </div>
    </AdminShell>
  );
}

export function PlatformAI({ locale, settings, fx, counts }: { locale: Locale; settings: { aiProvider: string; aiKeyConfigured: boolean; aiModel: string | null; aiBaseUrl: string | null }; fx: { code: string; perUsd: number; updatedAt: string; source: string }[]; counts: { listings: number; agencies: number; leads: number; users: number } }) {
  const { busy, err, run } = useRun();
  const [rates, setRates] = useState(fx);
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <AdminShell locale={locale} area="platform" title={tx(locale, "IA · Tasas FX · Seed", "AI · FX rates · Seed")}>
      {err && <div role="alert" className={cn("mb-4", k.err)}>{err}</div>}
      <div className="grid gap-6 [&>*]:min-w-0 xl:grid-cols-2">
        <div className={cn(k.card, "self-start p-5 md:p-6")}>
          <h2 className={cn(k.title, "flex items-center gap-2")}><Bot size={18} strokeWidth={1.6} /> {tx(locale, "Proveedor de IA", "AI provider")}</h2>
          <p className={cn("mt-1 text-sm", k.muted)}>{tx(locale, "Una sola interfaz AIProvider para las 4 funciones. Cambia en caliente.", "One AIProvider interface for all 4 features. Hot-swappable.")}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {([["heuristic", "HeuristicProvider", tx(locale, "Local · sin API key · por defecto", "Local · no API key · default")], ["openai-compatible", "OpenAICompatibleProvider", "OpenAI · Groq · xAI · OpenRouter…"]] as const).map(([key, n, d]) => (
              <button key={key} disabled={busy === "ai"} onClick={() => run("ai", () => api("platform/settings", { method: "PUT", json: { aiProvider: key } }))} aria-pressed={settings.aiProvider === key} className={cn("rounded-[18px] p-4 text-left transition-shadow duration-np", settings.aiProvider === key ? "bg-[#E6EBF1] shadow-[inset_0_0_0_2px_#162638] dark:bg-white/10 dark:shadow-[inset_0_0_0_2px_#E79A7F]" : cn("shadow-[inset_0_0_0_1px_#D9D2C4] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,.15)]", k.hover))}>
                <div className="flex items-center justify-between"><span className="font-mono text-sm font-semibold">{n}</span>{settings.aiProvider === key && <CheckCircle2 size={16} />}</div>
                <div className={cn("mt-1 text-xs", k.muted)}>{d}</div>
              </button>
            ))}
          </div>
          {settings.aiProvider === "openai-compatible" && (
            <div className={cn("np-in mt-4 space-y-2 rounded-xl p-3.5 text-sm", k.soft)}>
              <div className="flex justify-between"><span className={k.muted}>AI_BASE_URL</span><code>{settings.aiBaseUrl ?? "—"}</code></div>
              <div className="flex justify-between"><span className={k.muted}>AI_MODEL</span><code>{settings.aiModel ?? "—"}</code></div>
              <div className="flex justify-between"><span className={k.muted}>AI_API_KEY</span><code>{settings.aiKeyConfigured ? "••••••••" : tx(locale, "no configurada", "not set")}</code></div>
              {!settings.aiKeyConfigured && <div className={cn("flex items-center gap-2 text-xs", k.warnBox)}><AlertTriangle size={14} /> {tx(locale, "Sin key: la plataforma sigue usando Heuristic automáticamente. Nunca se rompe.", "No key: the platform keeps using Heuristic automatically. It never breaks.")}</div>}
            </div>
          )}
          <div className="mt-5 grid grid-cols-2 gap-2 text-sm">
            {[["estimate()", "PlaceEstimate"], ["searchParse()", tx(locale, "Búsqueda NL", "NL search")], ["writeListing()", tx(locale, "Redactar con IA", "Write with AI")], ["leadScore()", "Score + next action"]].map(([fn, t]) => (
              <div key={fn} className={cn("flex items-center gap-2 rounded-xl px-3 py-2.5", k.soft)}><CheckCircle2 size={14} className={cn("shrink-0", k.okText)} /><code className="text-xs font-semibold">{fn}</code><span className={cn("truncate text-xs", k.muted)}>{t}</span></div>
            ))}
          </div>
        </div>
        <div className="space-y-6">
          <div className={cn(k.card, "p-5 md:p-6")}>
            <div className="flex items-center justify-between"><h2 className={k.title}>{tx(locale, "Tasas de cambio (display)", "FX rates (display)")}</h2><Chip className="font-mono text-[11px]">fx_rates</Chip></div>
            <table className="mt-3 w-full text-sm">
              <tbody>
                {rates.map((r, i) => (
                  <tr key={r.code} className={cn("border-t first:border-0", k.line)}>
                    <td className="py-2.5 font-semibold">1 USD →</td>
                    <td><input className={cn(k.input, "h-9 w-32 md:h-9")} type="number" step="0.01" value={r.perUsd} onChange={(e) => setRates(rates.map((x, j) => (j === i ? { ...x, perUsd: +e.target.value } : x)))} aria-label={r.code} /></td>
                    <td className="font-display">{r.code}</td>
                    <td className={cn("text-xs", k.muted)}>{ago(r.updatedAt, locale)} · {r.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-3 flex items-center gap-3">
              <Button size="sm" className={k.primary} disabled={busy === "fx"} onClick={() => run("fx", async () => {
                const r = await api<{ rates: { code: string; perUsd: number; updatedAt: string; source: string }[] }>("platform/fx", { method: "PUT", json: { rates: rates.map((x) => ({ code: x.code, perUsd: x.perUsd })) } });
                // Show the saved values and their new timestamp/source (local state doesn't follow router.refresh).
                setRates(rates.map((x) => r.rates.find((y) => y.code === x.code) ?? x));
              })}>{busy === "fx" && <Loader2 size={13} className="animate-spin" />} {tx(locale, "Guardar tasas", "Save rates")}</Button>
              <span className={cn("text-xs", k.muted)}>{tx(locale, "Solo para mostrar conversiones. No hay pagos en v1.", "Display conversions only. No payments in v1.")}</span>
            </div>
          </div>
          <div className={cn(k.card, "p-5 md:p-6")}>
            <h2 className={cn(k.title, "flex items-center gap-2")}><Sprout size={18} strokeWidth={1.6} /> {tx(locale, "Datos de demostración", "Seed tools")}</h2>
            <div className="mt-3 grid grid-cols-4 gap-3 text-center text-sm">
              {[[counts.listings, "listings"], [counts.agencies, tx(locale, "agencias", "agencies")], [counts.users, tx(locale, "usuarios", "users")], [counts.leads, "leads"]].map(([n, t]) => (
                <div key={String(t)} className={cn("rounded-xl p-3", k.soft)}><div className={cn(k.num, "text-[26px] leading-tight")}>{n}</div><div className={cn("text-xs", k.muted)}>{t}</div></div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" className={k.outline} disabled={busy === "est"} onClick={() => run("est", async () => { const r = await api<{ recomputed: number }>("platform/estimates", { method: "POST" }); setMsg(tx(locale, `✓ PlaceEstimate recalculado en ${r.recomputed} inmuebles`, `✓ PlaceEstimate recomputed for ${r.recomputed} listings`)); })}>
                {busy === "est" ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} {tx(locale, "Recalcular PlaceEstimate", "Recompute PlaceEstimate")}
              </Button>
              <code className={cn("self-center rounded-lg px-2 py-1 text-xs", k.soft, k.muted)}>npm run db:seed</code>
            </div>
            {msg && <div className={cn("np-in mt-3 font-mono text-xs", k.okBox)}>{msg}</div>}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}



export function PlatformAudit({
  locale,
  page,
  options,
  filters,
}: {
  locale: Locale;
  page: AuditPage;
  options: { prefixes: string[]; actions: string[]; actors: { id: string; name: string }[]; hasSystem: boolean };
  filters: { cursor?: string; action?: string; actor?: string };
}) {
  const router = useRouter();
  const base = `/${locale}/platform/audit`;
  const href = (next: { cursor?: string; action?: string; actor?: string }) => {
    const p = new URLSearchParams(Object.entries(next).filter((e): e is [string, string] => !!e[1]));
    const qs = p.toString();
    return qs ? `${base}?${qs}` : base;
  };
  const setFilter = (k: "action" | "actor", v: string) => router.push(href({ action: filters.action, actor: filters.actor, [k]: v || undefined }));
  const system = tx(locale, "Sistema", "System");
  const famLabel = (p: string) => (AUDIT_PREFIXES[p] ? tx(locale, AUDIT_PREFIXES[p][0], AUDIT_PREFIXES[p][1]) : p);
  return (
    <AdminShell locale={locale} area="platform" title={tx(locale, "Auditoría", "Audit log")}>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="w-72 max-w-full">
          <Field label={tx(locale, "Acción", "Action")}>
            <select className={k.input} value={filters.action ?? ""} onChange={(e) => setFilter("action", e.target.value)}>
              <option value="">{tx(locale, "Todas", "All")}</option>
              {options.prefixes.map((p) => (
                <optgroup key={p} label={famLabel(p)}>
                  <option value={p}>{tx(locale, `${famLabel(p)} · todas`, `${famLabel(p)} · all`)}</option>
                  {options.actions.filter((a) => a.startsWith(`${p}.`)).map((a) => <option key={a} value={a}>{auditLabel(a, locale)}</option>)}
                </optgroup>
              ))}
            </select>
          </Field>
        </div>
        <div className="w-64 max-w-full">
          <Field label={tx(locale, "Autor", "Actor")}>
            <select className={k.input} value={filters.actor ?? ""} onChange={(e) => setFilter("actor", e.target.value)}>
              <option value="">{tx(locale, "Todos", "Everyone")}</option>
              {options.hasSystem && <option value="system">{system}</option>}
              {options.actors.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </Field>
        </div>
        {(filters.action || filters.actor) && <Link href={base} className={cn("pb-2.5 text-sm", k.link)}>{tx(locale, "Quitar filtros", "Clear filters")}</Link>}
      </div>
      <div className={cn("overflow-x-auto", k.card)}>
        <table className="w-full min-w-[860px] text-sm">
          <thead className={cn("border-b text-left", k.line, k.th)}>
            <tr><th className="px-4 py-3">{tx(locale, "Fecha", "Date")}</th><th className="px-3 py-3">{tx(locale, "Autor", "Actor")}</th><th className="px-3 py-3">{tx(locale, "Acción", "Action")}</th><th className="px-3 py-3">{tx(locale, "Sobre", "Target")}</th><th className="px-3 py-3">{tx(locale, "Detalle", "Details")}</th></tr>
          </thead>
          <tbody>
            {page.items.map((a) => (
              <tr key={a.id} className={cn("border-t align-top first:border-t-0", k.line)} data-testid="audit-row">
                <td className={cn("whitespace-nowrap px-4 py-2.5 text-xs", k.muted)} title={a.at}>{dateTime(a.at, locale, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                <td className="px-3 py-2.5 font-semibold">{a.actor || system}</td>
                <td className="px-3 py-2.5"><span title={a.action}><Chip className="py-0.5 text-[11px]">{auditLabel(a.action, locale)}</Chip></span></td>
                <td className="max-w-xs truncate px-3 py-2.5" title={a.target}>{a.target === "-" ? "—" : a.target}</td>
                <td className={cn("px-3 py-2.5 text-xs", k.muted)}>{auditDetail(a.data, locale)}</td>
              </tr>
            ))}
            {!page.items.length && (
              <tr><td colSpan={5} className={cn("p-8 text-center", k.muted)}>{tx(locale, "No hay entradas con estos filtros.", "No entries match these filters.")}</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <nav className="mt-4 flex items-center justify-between gap-3 text-sm" aria-label={tx(locale, "Paginación", "Pagination")}>
        {filters.cursor ? (
          <button type="button" onClick={() => router.back()} className={cn("flex items-center gap-1", k.link)}><ChevronLeft size={15} /> {tx(locale, "Anterior", "Previous")}</button>
        ) : <span />}
        <div className="flex items-center gap-4">
          {filters.cursor && <Link href={href({ action: filters.action, actor: filters.actor })} className={cn("hover:underline", k.muted)}>{tx(locale, "Más recientes", "Newest")}</Link>}
          {page.nextCursor && (
            <Link href={href({ action: filters.action, actor: filters.actor, cursor: page.nextCursor })} className={cn("flex items-center gap-1", k.link)}>
              {tx(locale, "Siguiente", "Next")} <ChevronRight size={15} />
            </Link>
          )}
        </div>
      </nav>
    </AdminShell>
  );
}

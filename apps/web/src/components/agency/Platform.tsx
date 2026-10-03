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
import { StatusBadge } from "@/components/listing/bits";
import { Avatar, Badge, Button, Field, Stat, darkInputCls } from "@/components/ui";
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
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Stat dark label={tx(locale, "Agencias", "Agencies")} value={data.agencies.length} hint={`${data.agencies.filter((a) => a.status === "TRIAL").length} ${tx(locale, "en prueba", "on trial")}`} />
        <Stat dark label={tx(locale, "Usuarios", "Users")} value={num(data.users, locale)} />
        <Stat dark label={tx(locale, "Inmuebles activos", "Active listings")} value={data.activeListings} />
        <Stat dark label={tx(locale, "Leads (7 d)", "Leads (7 d)")} value={data.leads7d} delta={`${delta >= 0 ? "+" : ""}${delta}%`} />
        <Stat dark label={tx(locale, "Tiempo 1ª respuesta", "First response")} value={data.firstResponseMin === null ? "—" : `${data.firstResponseMin} min`} hint={tx(locale, "mediana plataforma", "platform median")} />
      </div>
      <div className="mt-6 grid gap-6 [&>*]:min-w-0 xl:grid-cols-3">
        <div className="rounded-np border border-navy-line bg-navy-card p-5 xl:col-span-2">
          <div className="mb-3 flex items-center justify-between"><span className="font-display text-lg font-semibold">{tx(locale, "Leads por semana (plataforma)", "Weekly leads (platform)")}</span><span className="text-xs text-mist">12 {tx(locale, "semanas", "weeks")}</span></div>
          <BarChart data={data.weekly} height={220} />
        </div>
        <div className="rounded-np border border-navy-line bg-navy-card p-5">
          <div className="mb-3 font-display text-lg font-semibold">{tx(locale, "Salud del sistema", "System health")}</div>
          {data.health.map((h) => (
            <div key={h.k} className="flex items-center gap-2 border-t border-navy-line py-2.5 text-sm first:border-0">
              {h.ok ? <CheckCircle2 size={15} className="text-[#7FC8A4]" /> : <AlertTriangle size={15} className="text-[#F2B866]" />}
              <span className="flex-1">{h.k}</span>
              <span className="text-right text-xs text-mist">{h.v}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-6 grid gap-6 [&>*]:min-w-0 xl:grid-cols-2">
        <div className="rounded-np border border-navy-line bg-navy-card p-5">
          <div className="mb-3 font-display text-lg font-semibold">{tx(locale, "Agencias", "Agencies")}</div>
          {data.agencies.map((a) => (
            <div key={a.id} className="flex items-center gap-3 border-t border-navy-line py-2.5 first:border-0">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg font-display text-xs font-bold text-navy" style={{ background: a.color }}>{a.initials}</span>
              <div className="flex-1"><div className="font-semibold">{a.name}</div><div className="text-xs text-mist">{a.listings} listings · {a.city}</div></div>
              <Badge tone="dark">{a.plan}</Badge>
            </div>
          ))}
        </div>
        <div className="rounded-np border border-navy-line bg-navy-card p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="font-display text-lg font-semibold">{tx(locale, "Auditoría reciente", "Recent audit log")}</span>
            <Link href={`/${locale}/platform/audit`} className="text-sm font-semibold text-coral hover:underline">{tx(locale, "Ver todo", "View all")} →</Link>
          </div>
          {data.audit.map((a, i) => (
            <div key={i} className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-navy-line py-2 text-sm first:border-0 sm:flex-nowrap">
              <span className="w-20 shrink-0 text-xs text-mist">{ago(a.at, locale)}</span>
              <span className="shrink-0 font-semibold">{a.actor || tx(locale, "Sistema", "System")}</span>
              <span className="shrink-0 rounded bg-white/5 px-1.5 text-xs text-coral">{auditLabel(a.action, locale)}</span>
              <span className="min-w-0 flex-1 basis-full truncate text-mist sm:basis-auto">{a.target}</span>
            </div>
          ))}
        </div>
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
    <AdminShell locale={locale} area="platform" title={tx(locale, "Agencias", "Agencies")} actions={<Button size="sm" onClick={() => setCreating(!creating)}><Plus size={15} /> {tx(locale, "Nueva agencia", "New agency")}</Button>}>
      {err && <div role="alert" className="mb-4 rounded-lg bg-[#B3261E33] px-3 py-2 text-sm text-[#E79A7F]">{err}</div>}
      {current && (
        <div className="np-in mb-4 flex flex-wrap items-center gap-3 rounded-np border border-coral bg-[#A8452A1a] p-3 text-sm">
          <LogIn size={16} className="text-coral" /> {tx(locale, `Impersonando a ${current.name}. Todo queda en el registro de auditoría.`, `Impersonating ${current.name}. Everything is audit-logged.`)}
          <a href={`/${locale}/agency`} className="ml-auto font-semibold text-coral">{tx(locale, "Abrir panel", "Open dashboard")} →</a>
          <button onClick={() => run("exit", () => api("platform/impersonate", { method: "POST", json: { agencyId: null } }))} className="text-mist">{tx(locale, "Salir", "Exit")}</button>
        </div>
      )}
      {creating && (
        <form className="np-in mb-4 flex flex-wrap items-end gap-3 rounded-np border border-navy-line bg-navy-card p-4" onSubmit={(e) => { e.preventDefault(); run("create", async () => { await api("platform/agencies", { method: "POST", json: f }); setCreating(false); setF({ name: "", city: "Caracas" }); }); }}>
          <div className="w-64"><Field dark label={tx(locale, "Nombre", "Name")}><input required minLength={2} className={darkInputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field></div>
          <div className="w-48"><Field dark label={tx(locale, "Ciudad", "City")}><input required className={darkInputCls} value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} /></Field></div>
          <Button disabled={busy === "create"}>{busy === "create" && <Loader2 size={14} className="animate-spin" />} {tx(locale, "Crear", "Create")}</Button>
        </form>
      )}
      <div className="overflow-x-auto rounded-np border border-navy-line bg-navy-card">
        <table className="w-full min-w-[980px] text-sm">
          <thead className="border-b border-navy-line text-left text-xs uppercase tracking-wide text-mist">
            <tr><th className="px-4 py-3">{tx(locale, "Agencia", "Agency")}</th><th className="px-3 py-3">{tx(locale, "Estado", "Status")}</th><th className="px-3 py-3">{tx(locale, "Verificación", "Verification")}</th><th className="px-3 py-3">{tx(locale, "Plan (flag, sin cobro)", "Plan (flag, no billing)")}</th><th className="px-3 py-3 text-right">Listings</th><th className="px-3 py-3 text-right">{tx(locale, "Miembros", "Members")}</th><th className="px-3 py-3 text-right">Leads 30 d</th><th className="px-3 py-3" /></tr>
          </thead>
          <tbody>
            {agencies.map((a) => (
              <tr key={a.id} className="border-t border-navy-line">
                <td className="px-4 py-3"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg font-display text-xs font-bold text-navy" style={{ background: a.color }}>{a.initials}</span><div><div className="font-semibold">{a.name}</div><div className="text-xs text-mist">{a.city} · {tx(locale, "desde", "since")} {dateTime(a.createdAt, locale, { month: "short", year: "numeric" })}</div></div></div></td>
                <td className="px-3">
                  <select value={a.status} onChange={(e) => {
                      const status = e.target.value;
                      // Suspending hides every listing of the agency and signs its team out: ask first.
                      if (status === "SUSPENDED" && !window.confirm(tx(locale, `¿Suspender ${a.name}? Sus inmuebles dejarán de verse y su equipo perderá el acceso.`, `Suspend ${a.name}? Its listings will be hidden and its team will lose access.`))) return;
                      run(a.id, () => api(`platform/agencies/${a.id}`, { method: "PATCH", json: { status } }));
                    }} className="h-8 rounded-md border border-navy-line bg-navy-2 px-2 text-xs" aria-label={tx(locale, "Estado", "Status")}>
                    <option value="ACTIVE">{tx(locale, "Activa", "Active")}</option><option value="TRIAL">{tx(locale, "En prueba", "Trial")}</option><option value="SUSPENDED">{tx(locale, "Suspendida", "Suspended")}</option>
                  </select>
                </td>
                <td className="px-3">{a.verified ? <span className="flex items-center gap-1 text-[#7FC8A4]"><ShieldCheck size={15} /> {tx(locale, "Verificada", "Verified")}</span> : <Button size="sm" variant="dark-outline" disabled={busy === a.id} onClick={() => run(a.id, () => api(`platform/agencies/${a.id}`, { method: "PATCH", json: { verified: true } }))}><Eye size={13} /> {tx(locale, "Verificar", "Verify")}</Button>}</td>
                <td className="px-3">
                  <select value={a.plan} onChange={(e) => run(a.id, () => api(`platform/agencies/${a.id}`, { method: "PATCH", json: { plan: e.target.value } }))} className="h-8 rounded-md border border-navy-line bg-navy-2 px-2 text-xs" aria-label="Plan">
                    <option>FREE</option><option>PRO</option><option>ENTERPRISE</option>
                  </select>
                </td>
                <td className="px-3 text-right">{a.listings}</td>
                <td className="px-3 text-right">{a.members}</td>
                <td className="px-3 text-right">{a.leads30}</td>
                <td className="px-3">
                  <Button size="sm" variant={current?.id === a.id ? "coral" : "dark-outline"} disabled={busy === `imp-${a.id}`} onClick={() => run(`imp-${a.id}`, () => api("platform/impersonate", { method: "POST", json: { agencyId: a.id } }))}>
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
      {(roleErr || err) && <div role="alert" className="mb-4 rounded-lg bg-[#B3261E33] px-3 py-2 text-sm text-[#E79A7F]">{roleErr ?? err}</div>}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative w-80 max-w-full"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-mist" /><input value={q} onChange={(e) => setQ(e.target.value)} className={darkInputCls + " pl-9"} placeholder={tx(locale, "Nombre, email, rol o agencia…", "Name, email, role or agency…")} aria-label={tx(locale, "Buscar", "Search")} /></div>
        <span className="text-sm text-mist">{rows.length} / {users.length}</span>
      </div>
      <div className="overflow-x-auto rounded-np border border-navy-line bg-navy-card">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="border-b border-navy-line text-left text-xs uppercase tracking-wide text-mist"><tr><th className="px-4 py-3">{tx(locale, "Usuario", "User")}</th><th className="px-3 py-3">{tx(locale, "Rol", "Role")}</th><th className="px-3 py-3">{tx(locale, "Agencia", "Agency")}</th><th className="px-3 py-3">{tx(locale, "Acceso", "Sign-in")}</th><th className="px-3 py-3">{tx(locale, "Actividad", "Activity")}</th><th className="px-3 py-3" /></tr></thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id} className={cn("border-t border-navy-line", u.suspended && "opacity-50")}>
                <td className="px-4 py-2.5"><div className="flex items-center gap-3"><Avatar initials={u.initials} hue={u.hue} size={32} /><div><div className="font-semibold">{u.name}</div><div className="text-xs text-mist">{u.email}</div></div></div></td>
                <td className="px-3">
                  {u.id === me?.id ? (
                    <span className="rounded bg-white/5 px-1.5 py-0.5 text-xs text-coral">{tr(u.role)}</span>
                  ) : (
                    <select
                      value={u.role}
                      disabled={busy === `role-${u.id}`}
                      onChange={(e) => changeRole(u, e.target.value as Role)}
                      className="h-8 rounded-md border border-navy-line bg-navy-2 px-2 text-xs"
                      aria-label={tx(locale, `Rol de ${u.name}`, `Role of ${u.name}`)}
                    >
                      {[...new Set([u.role, ...(u.agencyId ? AGENCY_ROLES : PERSONAL_ROLES)])].map((r) => <option key={r} value={r}>{tr(r)}</option>)}
                    </select>
                  )}
                </td>
                <td className="px-3 text-mist">{u.agencyName ?? "—"}</td>
                <td className="px-3 text-xs text-mist">{providers[u.id]?.join(" · ") || "—"}</td>
                {/* Relative time depends on "now": server and client may differ by a minute → no hydration error (#418). */}
                <td className="px-3 text-xs text-mist" suppressHydrationWarning>{u.suspended ? tx(locale, "Suspendido", "Suspended") : ago(u.lastSeen, locale)}</td>
                <td className="px-3">
                  {u.id !== me?.id && (
                    <button disabled={busy === u.id} onClick={() => {
                      if (!u.suspended && !window.confirm(tx(locale, `¿Suspender a ${u.name}? No podrá iniciar sesión.`, `Suspend ${u.name}? They won’t be able to sign in.`))) return;
                      run(u.id, () => api(`platform/users/${u.id}`, { method: "PATCH", json: { suspended: !u.suspended } }));
                    }} className={cn("rounded-md p-1.5 hover:bg-white/5", u.suspended ? "text-[#7FC8A4]" : "text-[#E79A7F]")} aria-label={u.suspended ? tx(locale, "Reactivar", "Restore") : tx(locale, "Suspender", "Suspend")} title={u.suspended ? tx(locale, "Reactivar", "Restore") : tx(locale, "Suspender", "Suspend")}>
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
      {err && <div role="alert" className="mb-4 rounded-lg bg-[#B3261E33] px-3 py-2 text-sm text-[#E79A7F]">{err}</div>}
      <div className="grid gap-6 [&>*]:min-w-0 xl:grid-cols-[1fr_1.3fr]">
        <div className="rounded-np border border-navy-line bg-navy-card p-5">
          <div className="mb-3 flex items-center gap-2 font-display text-lg font-semibold"><ShieldAlert size={18} className="text-coral" /> {tx(locale, "Reportes", "Reports")} · {reports.length}</div>
          {reports.length === 0 && <div className="text-sm text-mist">{tx(locale, "Sin reportes pendientes.", "No pending reports.")}</div>}
          {reports.map((m) => (
            <div key={m.id} className="border-t border-navy-line py-3 first:border-0">
              <div className="flex items-center gap-2">
                <span className={cn("h-2 w-2 rounded-full", m.severity === "high" ? "bg-danger" : m.severity === "medium" ? "bg-warn" : "bg-mist")} />
                {(() => {
                  const target = listings.find((x) => x.id === m.listingId);
                  return target ? (
                    <a href={listingHref(locale, target)} target="_blank" rel="noreferrer" className="font-semibold underline decoration-white/30 hover:text-coral">{m.title}</a>
                  ) : (
                    <span className="font-semibold">{m.title}</span>
                  );
                })()}
              </div>
              <div className="mt-0.5 text-sm text-mist">{tx(locale, m.reason.es, m.reason.en)} · {m.agency} · {ago(m.at, locale)}</div>
              <div className="mt-2 flex gap-2">
                <Button size="sm" variant="dark-outline" disabled={busy === m.id} onClick={() => run(m.id, () => api(`platform/moderation/${m.id}`, { method: "PATCH", json: { resolved: true } }))}>{tx(locale, "Descartar", "Dismiss")}</Button>
                {m.listingId && confirming !== `report-${m.id}` && (
                  <Button size="sm" disabled={busy === m.id} onClick={() => { setReason(tx(locale, m.reason.es, m.reason.en)); setConfirming(`report-${m.id}`); }}>
                    <Ban size={13} /> {tx(locale, "Retirar", "Take down")}
                  </Button>
                )}
              </div>
              {m.listingId && confirming === `report-${m.id}` && (
                <form
                  className="np-in mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-[#B3261E14] p-2.5"
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
                  <input id={`report-reason-${m.id}`} autoFocus value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} className={darkInputCls + " h-9 min-w-0 flex-1"} />
                  <Button size="sm" type="submit">{tx(locale, "Confirmar retirada", "Confirm take-down")}</Button>
                  <Button size="sm" type="button" variant="dark-ghost" onClick={() => setConfirming(null)}>{tx(locale, "Cancelar", "Cancel")}</Button>
                </form>
              )}
            </div>
          ))}
        </div>
        <div className="rounded-np border border-navy-line bg-navy-card">
          <div className="flex flex-wrap items-center gap-3 border-b border-navy-line p-4">
            <span className="font-display text-lg font-semibold">{tx(locale, "Inmuebles publicados", "Live listings")}</span>
            <input value={q} onChange={(e) => setQ(e.target.value)} className={darkInputCls + " ml-auto h-9 w-56"} placeholder={tx(locale, "Buscar…", "Search…")} aria-label={tx(locale, "Buscar", "Search")} />
          </div>
          {rows.map((l) => {
            // Only a platform take-down can be restored here; a listing the agency withdrew itself stays the agency's call.
            const down = !!l.takedownReason;
            return (
              <div key={l.id} data-listing={l.id} className="border-t border-navy-line first:border-0">
              <div className={cn("flex flex-wrap items-center gap-3 px-4 py-2.5", down && "bg-[#B3261E14]")}>
                <PropertyArt scene={l.scenes[0]} seed={l.id} photo={listingPhoto(l, 0)} className={cn("h-11 w-14 shrink-0 rounded-md", down && "opacity-40 grayscale")} />
                <div className="min-w-0 flex-1 basis-48">
                  <div className={cn("truncate font-semibold", down && "text-mist line-through")}>{tx(locale, l.title_es, l.title_en)}</div>
                  <div className="text-xs text-mist">{l.agency?.name ?? tx(locale, "Particular", "Private owner")} · {l.zone} · {money(l.priceAmount, locale)}</div>
                </div>
                <StatusBadge status={l.status} review={l.review} locale={locale} />
                {l.review === "PENDING" && !down && (
                  <Button size="sm" variant="dark-outline" disabled={busy === l.id} onClick={() => void run(l.id, () => api(`listings/${l.id}`, { method: "PATCH", json: { review: "APPROVED" } }))}>
                    {tx(locale, "Aprobar", "Approve")}
                  </Button>
                )}
                {confirming === l.id ? null : (
                  <Button
                    size="sm"
                    variant={down ? "dark-outline" : "coral"}
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
                  className="np-in flex flex-wrap items-center gap-2 border-t border-navy-line bg-[#B3261E14] px-4 py-2.5"
                  onSubmit={(e) => {
                    e.preventDefault();
                    setConfirming(null);
                    void run(l.id, () => api(`platform/listings/${l.id}`, { method: "PATCH", json: { takedown: true, reason: reason.trim() || tx(locale, "Moderación", "Moderation") } }));
                  }}
                >
                  <label className="sr-only" htmlFor={`reason-${l.id}`}>{tx(locale, "Motivo de la retirada", "Take-down reason")}</label>
                  <input id={`reason-${l.id}`} autoFocus value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} placeholder={tx(locale, "Motivo (lo verá la agencia)", "Reason (the agency will see it)")} className={darkInputCls + " h-9 min-w-0 flex-1"} />
                  <Button size="sm" type="submit">{tx(locale, "Confirmar retirada", "Confirm take-down")}</Button>
                  <Button size="sm" type="button" variant="dark-ghost" onClick={() => setConfirming(null)}>{tx(locale, "Cancelar", "Cancel")}</Button>
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
      {err && <div role="alert" className="mb-4 rounded-lg bg-[#B3261E33] px-3 py-2 text-sm text-[#E79A7F]">{err}</div>}
      <div className="grid gap-6 [&>*]:min-w-0 xl:grid-cols-2">
        <div className="rounded-np border border-navy-line bg-navy-card p-5">
          <div className="flex items-center gap-2 font-display text-lg font-semibold"><Bot size={18} className="text-coral" /> {tx(locale, "Proveedor de IA", "AI provider")}</div>
          <p className="mt-1 text-sm text-mist">{tx(locale, "Una sola interfaz AIProvider para las 4 funciones. Cambia en caliente.", "One AIProvider interface for all 4 features. Hot-swappable.")}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {([["heuristic", "HeuristicProvider", tx(locale, "Local · sin API key · por defecto", "Local · no API key · default")], ["openai-compatible", "OpenAICompatibleProvider", "OpenAI · Groq · xAI · OpenRouter…"]] as const).map(([k, n, d]) => (
              <button key={k} disabled={busy === "ai"} onClick={() => run("ai", () => api("platform/settings", { method: "PUT", json: { aiProvider: k } }))} className={cn("rounded-np border p-4 text-left", settings.aiProvider === k ? "border-coral bg-[#A8452A14]" : "border-navy-line hover:bg-white/5")}>
                <div className="flex items-center justify-between"><span className="font-mono text-sm font-semibold">{n}</span>{settings.aiProvider === k && <CheckCircle2 size={16} className="text-coral" />}</div>
                <div className="mt-1 text-xs text-mist">{d}</div>
              </button>
            ))}
          </div>
          {settings.aiProvider === "openai-compatible" && (
            <div className="np-in mt-4 space-y-2 rounded-lg bg-white/5 p-3 text-sm">
              <div className="flex justify-between"><span className="text-mist">AI_BASE_URL</span><code>{settings.aiBaseUrl ?? "—"}</code></div>
              <div className="flex justify-between"><span className="text-mist">AI_MODEL</span><code>{settings.aiModel ?? "—"}</code></div>
              <div className="flex justify-between"><span className="text-mist">AI_API_KEY</span><code>{settings.aiKeyConfigured ? "••••••••" : tx(locale, "no configurada", "not set")}</code></div>
              {!settings.aiKeyConfigured && <div className="flex items-center gap-2 rounded-lg bg-[#8A5A001a] p-2 text-xs text-[#F2B866]"><AlertTriangle size={14} /> {tx(locale, "Sin key: la plataforma sigue usando Heuristic automáticamente. Nunca se rompe.", "No key: the platform keeps using Heuristic automatically. It never breaks.")}</div>}
            </div>
          )}
          <div className="mt-5 grid grid-cols-2 gap-2 text-sm">
            {[["estimate()", "PlaceEstimate"], ["searchParse()", tx(locale, "Búsqueda NL", "NL search")], ["writeListing()", tx(locale, "Redactar con IA", "Write with AI")], ["leadScore()", "Score + next action"]].map(([fn, t]) => (
              <div key={fn} className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2"><CheckCircle2 size={14} className="text-[#7FC8A4]" /><code className="text-xs text-coral">{fn}</code><span className="text-xs text-mist">{t}</span></div>
            ))}
          </div>
        </div>
        <div className="space-y-6">
          <div className="rounded-np border border-navy-line bg-navy-card p-5">
            <div className="flex items-center justify-between"><span className="font-display text-lg font-semibold">{tx(locale, "Tasas de cambio (display)", "FX rates (display)")}</span><Badge tone="dark">fx_rates</Badge></div>
            <table className="mt-3 w-full text-sm">
              <tbody>
                {rates.map((r, i) => (
                  <tr key={r.code} className="border-t border-navy-line first:border-0">
                    <td className="py-2.5 font-semibold">1 USD →</td>
                    <td><input className={darkInputCls + " h-9 w-32"} type="number" step="0.01" value={r.perUsd} onChange={(e) => setRates(rates.map((x, j) => (j === i ? { ...x, perUsd: +e.target.value } : x)))} aria-label={r.code} /></td>
                    <td className="font-display">{r.code}</td>
                    <td className="text-xs text-mist">{ago(r.updatedAt, locale)} · {r.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-3 flex items-center gap-3">
              <Button size="sm" disabled={busy === "fx"} onClick={() => run("fx", async () => {
                const r = await api<{ rates: { code: string; perUsd: number; updatedAt: string; source: string }[] }>("platform/fx", { method: "PUT", json: { rates: rates.map((x) => ({ code: x.code, perUsd: x.perUsd })) } });
                // Show the saved values and their new timestamp/source (local state doesn't follow router.refresh).
                setRates(rates.map((x) => r.rates.find((y) => y.code === x.code) ?? x));
              })}>{busy === "fx" && <Loader2 size={13} className="animate-spin" />} {tx(locale, "Guardar tasas", "Save rates")}</Button>
              <span className="text-xs text-mist">{tx(locale, "Solo para mostrar conversiones. No hay pagos en v1.", "Display conversions only. No payments in v1.")}</span>
            </div>
          </div>
          <div className="rounded-np border border-navy-line bg-navy-card p-5">
            <div className="flex items-center gap-2 font-display text-lg font-semibold"><Sprout size={18} className="text-coral" /> Seed tools</div>
            <div className="mt-3 grid grid-cols-4 gap-3 text-center text-sm">
              {[[counts.listings, "listings"], [counts.agencies, tx(locale, "agencias", "agencies")], [counts.users, tx(locale, "usuarios", "users")], [counts.leads, "leads"]].map(([n, t]) => (
                <div key={String(t)} className="rounded-lg bg-white/5 p-3"><div className="font-display text-2xl font-semibold">{n}</div><div className="text-xs text-mist">{t}</div></div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" variant="dark-outline" disabled={busy === "est"} onClick={() => run("est", async () => { const r = await api<{ recomputed: number }>("platform/estimates", { method: "POST" }); setMsg(tx(locale, `✓ PlaceEstimate recalculado en ${r.recomputed} inmuebles`, `✓ PlaceEstimate recomputed for ${r.recomputed} listings`)); })}>
                {busy === "est" ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} {tx(locale, "Recalcular PlaceEstimate", "Recompute PlaceEstimate")}
              </Button>
              <code className="self-center rounded bg-white/5 px-2 py-1 text-xs text-mist">npm run db:seed</code>
            </div>
            {msg && <div className="np-in mt-3 rounded-lg bg-[#2F6B4F33] p-2.5 font-mono text-xs text-[#7FC8A4]">{msg}</div>}
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
          <Field dark label={tx(locale, "Acción", "Action")}>
            <select className={darkInputCls} value={filters.action ?? ""} onChange={(e) => setFilter("action", e.target.value)}>
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
          <Field dark label={tx(locale, "Autor", "Actor")}>
            <select className={darkInputCls} value={filters.actor ?? ""} onChange={(e) => setFilter("actor", e.target.value)}>
              <option value="">{tx(locale, "Todos", "Everyone")}</option>
              {options.hasSystem && <option value="system">{system}</option>}
              {options.actors.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </Field>
        </div>
        {(filters.action || filters.actor) && <Link href={base} className="pb-2 text-sm text-coral hover:underline">{tx(locale, "Quitar filtros", "Clear filters")}</Link>}
      </div>
      <div className="overflow-x-auto rounded-np border border-navy-line bg-navy-card">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="border-b border-navy-line text-left text-xs uppercase tracking-wide text-mist">
            <tr><th className="px-4 py-3">{tx(locale, "Fecha", "Date")}</th><th className="px-3 py-3">{tx(locale, "Autor", "Actor")}</th><th className="px-3 py-3">{tx(locale, "Acción", "Action")}</th><th className="px-3 py-3">{tx(locale, "Sobre", "Target")}</th><th className="px-3 py-3">{tx(locale, "Detalle", "Details")}</th></tr>
          </thead>
          <tbody>
            {page.items.map((a) => (
              <tr key={a.id} className="border-t border-navy-line align-top" data-testid="audit-row">
                <td className="whitespace-nowrap px-4 py-2.5 text-xs text-mist" title={a.at}>{dateTime(a.at, locale, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                <td className="px-3 py-2.5 font-semibold">{a.actor || system}</td>
                <td className="px-3 py-2.5"><span className="rounded bg-white/5 px-1.5 py-0.5 text-xs text-coral" title={a.action}>{auditLabel(a.action, locale)}</span></td>
                <td className="max-w-xs truncate px-3 py-2.5" title={a.target}>{a.target === "-" ? "—" : a.target}</td>
                <td className="px-3 py-2.5 text-xs text-mist">{auditDetail(a.data, locale)}</td>
              </tr>
            ))}
            {!page.items.length && (
              <tr><td colSpan={5} className="p-8 text-center text-mist">{tx(locale, "No hay entradas con estos filtros.", "No entries match these filters.")}</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <nav className="mt-4 flex items-center justify-between gap-3 text-sm" aria-label={tx(locale, "Paginación", "Pagination")}>
        {filters.cursor ? (
          <button type="button" onClick={() => router.back()} className="flex items-center gap-1 text-coral hover:underline"><ChevronLeft size={15} /> {tx(locale, "Anterior", "Previous")}</button>
        ) : <span />}
        <div className="flex items-center gap-4">
          {filters.cursor && <Link href={href({ action: filters.action, actor: filters.actor })} className="text-mist hover:underline">{tx(locale, "Más recientes", "Newest")}</Link>}
          {page.nextCursor && (
            <Link href={href({ action: filters.action, actor: filters.actor, cursor: page.nextCursor })} className="flex items-center gap-1 font-semibold text-coral hover:underline">
              {tx(locale, "Siguiente", "Next")} <ChevronRight size={15} />
            </Link>
          )}
        </div>
      </nav>
    </AdminShell>
  );
}

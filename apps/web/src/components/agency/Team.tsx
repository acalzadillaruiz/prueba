"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, Mail, Send, ShieldCheck, ShieldQuestion, X } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Role } from "@newplace/config";
import type { Locale, User } from "@/types/domain";
import { AdminShell } from "@/components/layout/AdminShell";
import { Button } from "@/components/ui";
import { Chip, Initials, Pill, Select, k } from "./kit";
import { ScrollRegion } from "./ScrollRegion";
import { cn } from "@/lib/cn";
import { useApp } from "@/lib/store";
import { api } from "@/lib/api";
import { plural, tx } from "@/lib/i18n";
import { TimeAgo } from "@/components/owner/TimeAgo";

const ROLE_OPTS: Role[] = ["AGENCY_OWNER", "BACKOFFICE", "AGENT", "CAPTOR", "PHOTOGRAPHER"];
type Invite = { id: string; email: string; role: Role; createdAt: string };

export function TeamView({ locale, members, listingsByAgent, invites: initialInvites }: { locale: Locale; members: User[]; listingsByAgent: Record<string, number>; invites: Invite[] }) {
  const router = useRouter();
  const { user } = useApp();
  // Superadmin impersonating the agency manages it like its owner (the API allows it too).
  const manager = user?.role === "AGENCY_OWNER" || user?.role === "BACKOFFICE" || user?.role === "SUPERADMIN";
  const isOwner = user?.role === "AGENCY_OWNER" || user?.role === "SUPERADMIN";
  const tr = useTranslations("roles");
  const [invites, setInvites] = useState(initialInvites);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("AGENT");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  // A role change alters what someone can see and do: the select proposes, an inline step confirms.
  const [pendingRole, setPendingRole] = useState<{ id: string; role: Role } | null>(null);
  const patch = async (id: string, json: object) => {
    setBusy(id);
    setErr(null);
    try {
      await api(`agency/members/${id}`, { method: "PATCH", json });
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  };
  const roleSelect = (u: User, wrapClassName?: string, className?: string) => (
    <Select
      compact
      wrapClassName={wrapClassName}
      value={pendingRole?.id === u.id ? pendingRole.role : u.role}
      disabled={!manager || u.id === user?.id || busy === u.id || (u.role === "AGENCY_OWNER" && !isOwner)}
      onChange={(e) => setPendingRole(e.target.value === u.role ? null : { id: u.id, role: e.target.value as Role })}
      className={className}
      aria-label={tx(locale, `Rol de ${u.name}`, `Role of ${u.name}`)}
    >
      {ROLE_OPTS.filter((r) => isOwner || r !== "AGENCY_OWNER" || u.role === "AGENCY_OWNER").map((r) => <option key={r} value={r}>{tr(r)}</option>)}
    </Select>
  );
  /** Listings + last activity, folded under the name in the table (the columns no longer fit beside the sidebar). */
  const meta = (u: User) => (
    <div className={cn("mt-0.5 text-xs", k.muted)}>
      {listingsByAgent[u.id] != null && <>{plural(listingsByAgent[u.id], locale, ["inmueble", "inmuebles"], ["listing", "listings"])} · </>}
      <span className="whitespace-nowrap">{tx(locale, "Activo ", "Active ")}<TimeAgo iso={u.lastSeen} locale={locale} /></span>
    </div>
  );
  const verification = (u: User) => (
    <>
      {u.role === "AGENT" ? (
        u.verified ? (
          <Pill tone="ok"><ShieldCheck size={12} /> {tx(locale, "Verificado", "Verified")}</Pill>
        ) : (
          <span className="flex flex-wrap items-center gap-2">
            <Pill tone="warn"><ShieldQuestion size={12} /> {tx(locale, "Documento en revisión", "Document in review")}</Pill>
            {manager && <Button size="sm" variant="outline" className={k.outline} disabled={busy === u.id} onClick={() => patch(u.id, { verified: true })}>{tx(locale, "Verificar", "Verify")}</Button>}
          </span>
        )
      ) : (
        <span className={cn("text-xs", k.muted)}>—</span>
      )}
    </>
  );
  const confirmRole = (u: User) =>
    pendingRole?.id === u.id && (
      <div className="np-in flex flex-wrap items-center gap-3 rounded-xl bg-[#B3261E0D] p-3 text-sm dark:bg-[#B3261E26]" role="alert">
        <AlertTriangle size={16} className={k.warnText} />
        <span className="min-w-0 flex-1">
          {tx(locale, `¿Seguro? ${u.name} pasará de ${tr(u.role)} a ${tr(pendingRole.role)}. Esto cambia lo que puede ver y hacer en el panel.`, `Sure? ${u.name} will go from ${tr(u.role)} to ${tr(pendingRole.role)}. This changes what they can see and do in the dashboard.`)}
        </span>
        <Button size="sm" className="bg-danger hover:bg-[#962019] dark:bg-[#F3A493] dark:text-navy" onClick={() => { const r = pendingRole.role; setPendingRole(null); void patch(u.id, { role: r }); }}>{tx(locale, "Confirmar", "Confirm")}</Button>
        <Button size="sm" variant="ghost" className={k.ghost} onClick={() => setPendingRole(null)}>{tx(locale, "Cancelar", "Cancel")}</Button>
      </div>
    );
  return (
    <AdminShell locale={locale} area="agency" title={tx(locale, "Equipo", "Team")}>
      {err && <div role="alert" className={cn("mb-4", k.err)}>{err}</div>}
      {/* Invite + pending cards beside the table only from 2xl: below it the table takes the full width (no sideways scroll). */}
      <div className="grid gap-6 [&>*]:min-w-0 2xl:grid-cols-[1fr_360px]">
        {/* Phones: one card per member (role, verification and activity stay visible); tablets and up keep the table. */}
        <ul className="space-y-3 self-start md:hidden" aria-label={tx(locale, "Miembros del equipo", "Team members")} data-testid="team-cards">
          {members.map((u) => (
            <li key={u.id} className={cn(k.card, "p-4")}>
              <div className="flex items-center gap-3">
                <Initials name={u.name} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold leading-snug">{u.name}</div>
                  <div className={cn("text-xs [overflow-wrap:anywhere]", k.muted)}>{u.email}</div>
                </div>
              </div>
              <label className="mt-3 flex items-center gap-3 text-sm">
                <span className={cn("w-16 shrink-0", k.muted)}>{tx(locale, "Rol", "Role")}</span>
                {roleSelect(u, "min-w-0 flex-1", "h-10")}
              </label>
              {confirmRole(u) && <div className="mt-3">{confirmRole(u)}</div>}
              {u.role === "AGENT" && <div className="mt-3 flex flex-wrap items-center gap-2 [&>span]:flex-wrap">{verification(u)}</div>}
              <dl className={cn("mt-3 grid grid-cols-2 gap-2 rounded-xl px-3 py-2.5", k.soft)}>
                <div className="min-w-0">
                  <dt className={cn(k.label, "text-[10px]")}>{tx(locale, "Inmuebles", "Listings")}</dt>
                  <dd className="mt-0.5 text-sm font-semibold">{listingsByAgent[u.id] ?? "—"}</dd>
                </div>
                <div className="min-w-0">
                  <dt className={cn(k.label, "text-[10px]")}>{tx(locale, "Última actividad", "Last active")}</dt>
                  <dd className="mt-0.5 text-sm"><TimeAgo iso={u.lastSeen} locale={locale} /></dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
        <ScrollRegion label={tx(locale, "Miembros del equipo", "Team members")} className={cn("hidden self-start md:block", k.card)}>
          {/* Fixed layout: name/email take what is left and truncate (full email in the tooltip); the role select and the
              verification pill keep their width; listings and last activity live in a meta line under the name. */}
          <table className="w-full table-fixed text-sm">
            <colgroup><col /><col className="w-[176px]" /><col className="w-[38%] xl:w-[300px]" /></colgroup>
            <thead className={cn("border-b text-left", k.line, k.th)}>
              <tr><th className="px-4 py-3">{tx(locale, "Persona", "Member")}</th><th className="px-3 py-3">{tx(locale, "Rol", "Role")}</th><th className="px-3 py-3">{tx(locale, "Verificación", "Verification")}</th></tr>
            </thead>
            <tbody>
              {members.map((u) => (
                <Fragment key={u.id}>
                <tr className={cn("border-t first:border-t-0", k.line)}>
                  <td className="px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Initials name={u.name} size={38} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-semibold" title={u.name}>{u.name}</div>
                        <div className={cn("truncate text-xs", k.muted)} title={u.email}>{u.email}</div>
                        {meta(u)}
                      </div>
                    </div>
                  </td>
                  <td className="px-3">{roleSelect(u, "w-full")}</td>
                  {/* Pill and "Verificar" wrap onto two lines when the column is narrow (tablets) instead of running off the edge. */}
                  <td className="px-3 py-2">{verification(u)}</td>
                </tr>
                {pendingRole?.id === u.id && (
                  <tr className={cn("border-t", k.line)}>
                    <td colSpan={3} className="px-4 py-3">{confirmRole(u)}</td>
                  </tr>
                )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </ScrollRegion>
        <div className="grid content-start gap-4 lg:grid-cols-2 2xl:grid-cols-1">
          {manager && (
            <form
              className={cn(k.card, "p-5 md:p-6")}
              onSubmit={async (e) => {
                e.preventDefault();
                setErr(null);
                setBusy("invite");
                try {
                  const inv = await api<Invite>("agency/invitations", { method: "POST", json: { email, role } });
                  // A re-invite replaces the pending one server-side: mirror that instead of listing it twice.
                  setInvites([inv, ...invites.filter((x) => x.email !== inv.email)]);
                  setEmail("");
                } catch (e2) {
                  setErr((e2 as Error).message);
                } finally {
                  setBusy(null);
                }
              }}
            >
              <h2 className={k.title}>{tx(locale, "Invitar por email", "Invite by email")}</h2>
              <input className={cn(k.input, "mt-3")} type="email" required placeholder="nombre@agencia.ve" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email" />
              <Select wrapClassName="mt-2" value={role} onChange={(e) => setRole(e.target.value as Role)} aria-label={tx(locale, "Rol", "Role")}>
                {ROLE_OPTS.filter((r) => r !== "AGENCY_OWNER").map((r) => <option key={r} value={r}>{tr(r)}</option>)}
              </Select>
              <Button className={cn("mt-3 w-full", k.primary)} disabled={busy === "invite"}>{busy === "invite" ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} {tx(locale, "Enviar invitación", "Send invite")}</Button>
            </form>
          )}
          <div className={cn(k.card, "p-5 md:p-6")}>
            <h2 className={k.titleSm}>{tx(locale, "Invitaciones pendientes", "Pending invites")}</h2>
            {invites.length === 0 && <div className={cn("mt-2 text-sm", k.muted)}>{tx(locale, "No hay invitaciones pendientes.", "No pending invites.")}</div>}
            {invites.map((i) => (
              <div key={i.id} className="np-in mt-3 flex items-center gap-2 text-sm">
                <Mail size={15} strokeWidth={1.6} className={k.muted} />
                <span className="flex-1 truncate">{i.email}</span>
                <Chip>{tr(i.role)}</Chip>
                {manager && (
                  <button
                    className={cn("flex h-9 w-9 items-center justify-center rounded-full", k.muted, "hover:bg-[#E6DDD2] hover:text-navy dark:hover:bg-white/10 dark:hover:text-ivory")}
                    aria-label={tx(locale, `Revocar invitación a ${i.email}`, `Revoke invite to ${i.email}`)}
                    onClick={async () => {
                      try {
                        await api(`agency/invitations?id=${i.id}`, { method: "DELETE" });
                        setInvites(invites.filter((x) => x.id !== i.id));
                      } catch (e2) {
                        setErr((e2 as Error).message);
                      }
                    }}
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

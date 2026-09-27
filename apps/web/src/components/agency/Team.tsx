"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Mail, Send, ShieldCheck, ShieldQuestion, X } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Role } from "@newplace/config";
import type { Locale, User } from "@/types/domain";
import { AdminShell } from "@/components/layout/AdminShell";
import { Avatar, Badge, Button, darkInputCls } from "@/components/ui";
import { useApp } from "@/lib/store";
import { api } from "@/lib/api";
import { ago, tx } from "@/lib/i18n";

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
  return (
    <AdminShell locale={locale} area="agency" title={tx(locale, "Equipo", "Team")}>
      {err && <div role="alert" className="mb-4 rounded-lg bg-[#B4231833] px-3 py-2 text-sm text-[#FF8A7A]">{err}</div>}
      <div className="grid gap-6 [&>*]:min-w-0 xl:grid-cols-[1fr_360px]">
        <div className="overflow-x-auto rounded-np border border-navy-line bg-navy-card">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-navy-line text-left text-xs uppercase tracking-wide text-mist">
              <tr><th className="px-4 py-3">{tx(locale, "Persona", "Member")}</th><th className="px-3 py-3">{tx(locale, "Rol", "Role")}</th><th className="px-3 py-3">{tx(locale, "Verificación", "Verification")}</th><th className="px-3 py-3 text-right">{tx(locale, "Inmuebles", "Listings")}</th><th className="px-3 py-3">{tx(locale, "Última actividad", "Last active")}</th></tr>
            </thead>
            <tbody>
              {members.map((u) => (
                <tr key={u.id} className="border-t border-navy-line">
                  <td className="px-4 py-3"><div className="flex items-center gap-3"><Avatar initials={u.initials} hue={u.hue} size={34} /><div><div className="font-semibold">{u.name}</div><div className="text-xs text-mist">{u.email}</div></div></div></td>
                  <td className="px-3">
                    <select value={u.role} disabled={!manager || u.id === user?.id || busy === u.id || (u.role === "AGENCY_OWNER" && !isOwner)} onChange={(e) => patch(u.id, { role: e.target.value })} className="h-8 rounded-md border border-navy-line bg-navy-2 px-2 text-xs" aria-label={tx(locale, "Rol", "Role")}>
                      {ROLE_OPTS.filter((r) => isOwner || r !== "AGENCY_OWNER" || u.role === "AGENCY_OWNER").map((r) => <option key={r} value={r}>{tr(r)}</option>)}
                    </select>
                  </td>
                  <td className="px-3">
                    {u.role === "AGENT" ? (
                      u.verified ? (
                        <Badge className="bg-[#2F6F4E40] text-[#7FD3A8]"><ShieldCheck size={12} /> {tx(locale, "Verificado", "Verified")}</Badge>
                      ) : (
                        <span className="flex items-center gap-2">
                          <Badge className="bg-[#C9862A33] text-[#F2B866]"><ShieldQuestion size={12} /> {tx(locale, "Documento en revisión", "Document in review")}</Badge>
                          {manager && <Button size="sm" variant="dark-outline" disabled={busy === u.id} onClick={() => patch(u.id, { verified: true })}>{tx(locale, "Verificar", "Verify")}</Button>}
                        </span>
                      )
                    ) : (
                      <span className="text-xs text-mist">—</span>
                    )}
                  </td>
                  <td className="px-3 text-right">{listingsByAgent[u.id] ?? "—"}</td>
                  <td className="px-3 text-xs text-mist" suppressHydrationWarning>{ago(u.lastSeen, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="space-y-4">
          {manager && (
            <form
              className="rounded-np border border-navy-line bg-navy-card p-4"
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
              <div className="font-display text-lg font-semibold">{tx(locale, "Invitar por email", "Invite by email")}</div>
              <input className={darkInputCls + " mt-3"} type="email" required placeholder="nombre@agencia.ve" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email" />
              <select className={darkInputCls + " mt-2"} value={role} onChange={(e) => setRole(e.target.value as Role)} aria-label={tx(locale, "Rol", "Role")}>
                {ROLE_OPTS.filter((r) => r !== "AGENCY_OWNER").map((r) => <option key={r} value={r}>{tr(r)}</option>)}
              </select>
              <Button className="mt-3 w-full" disabled={busy === "invite"}>{busy === "invite" ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} {tx(locale, "Enviar invitación", "Send invite")}</Button>
            </form>
          )}
          <div className="rounded-np border border-navy-line bg-navy-card p-4">
            <div className="font-display font-semibold">{tx(locale, "Invitaciones pendientes", "Pending invites")}</div>
            {invites.length === 0 && <div className="mt-2 text-sm text-mist">—</div>}
            {invites.map((i) => (
              <div key={i.id} className="np-in mt-3 flex items-center gap-2 text-sm">
                <Mail size={15} className="text-coral" />
                <span className="flex-1 truncate">{i.email}</span>
                <Badge tone="dark">{tr(i.role)}</Badge>
                {manager && (
                  <button
                    className="flex h-9 w-9 items-center justify-center rounded-full text-mist hover:bg-white/10 hover:text-ivory"
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

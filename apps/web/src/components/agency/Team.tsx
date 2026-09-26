"use client";

import { useState } from "react";
import { Mail, Send, ShieldCheck, ShieldQuestion } from "lucide-react";
import type { Role } from "@newplace/config";
import type { Locale } from "@/types/domain";
import { AdminShell } from "@/components/layout/AdminShell";
import { Avatar, Badge, Button, darkInputCls } from "@/components/ui";
import { USERS } from "@/mock/people";
import { LISTINGS } from "@/mock/listings";
import { ago, tx } from "@/lib/i18n";

const ROLE_OPTS: Role[] = ["AGENCY_OWNER", "BACKOFFICE", "AGENT", "CAPTOR", "PHOTOGRAPHER"];

export function TeamView({ locale }: { locale: Locale }) {
  const members = USERS.filter((u) => u.agencyId === "ag-andes");
  const [invites, setInvites] = useState([{ email: "laura.m@andesprime.ve", role: "AGENT" as Role, at: "2026-09-25T15:00:00Z" }]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("AGENT");
  return (
    <AdminShell locale={locale} area="agency" title={tx(locale, "Equipo", "Team")}>
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="overflow-hidden rounded-np border border-navy-line bg-navy-card">
          <table className="w-full text-sm">
            <thead className="border-b border-navy-line text-left text-xs uppercase tracking-wide text-mist">
              <tr><th className="px-4 py-3">{tx(locale, "Persona", "Member")}</th><th className="px-3 py-3">{tx(locale, "Rol", "Role")}</th><th className="px-3 py-3">{tx(locale, "Verificación", "Verification")}</th><th className="px-3 py-3 text-right">{tx(locale, "Inmuebles", "Listings")}</th><th className="px-3 py-3">{tx(locale, "Última actividad", "Last active")}</th></tr>
            </thead>
            <tbody>
              {members.map((u) => (
                <tr key={u.id} className="border-t border-navy-line">
                  <td className="px-4 py-3"><div className="flex items-center gap-3"><Avatar initials={u.initials} hue={u.hue} size={34} /><div><div className="font-semibold">{u.name}</div><div className="text-xs text-mist">{u.email}</div></div></div></td>
                  <td className="px-3"><select defaultValue={u.role} className="h-8 rounded-md border border-navy-line bg-navy-2 px-2 text-xs">{ROLE_OPTS.map((r) => <option key={r} value={r}>{r}</option>)}</select></td>
                  <td className="px-3">{u.role === "AGENT" ? (u.verified ? <Badge className="bg-[#2F6F4E40] text-[#7FD3A8]"><ShieldCheck size={12} /> VERIFIED</Badge> : <Badge className="bg-[#C9862A33] text-[#F2B866]"><ShieldQuestion size={12} /> {tx(locale, "Documento en revisión", "Document in review")}</Badge>) : <span className="text-xs text-mist">—</span>}</td>
                  <td className="px-3 text-right">{LISTINGS.filter((l) => l.agentId === u.id).length || "—"}</td>
                  <td className="px-3 text-xs text-mist">{ago(u.lastSeen, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="space-y-4">
          <form className="rounded-np border border-navy-line bg-navy-card p-4" onSubmit={(e) => { e.preventDefault(); if (email) { setInvites([{ email, role, at: "2026-09-26T18:00:00Z" }, ...invites]); setEmail(""); } }}>
            <div className="font-display text-lg font-semibold">{tx(locale, "Invitar por email", "Invite by email")}</div>
            <input className={darkInputCls + " mt-3"} placeholder="nombre@andesprime.ve" value={email} onChange={(e) => setEmail(e.target.value)} />
            <select className={darkInputCls + " mt-2"} value={role} onChange={(e) => setRole(e.target.value as Role)}>{ROLE_OPTS.map((r) => <option key={r}>{r}</option>)}</select>
            <Button className="mt-3 w-full"><Send size={15} /> {tx(locale, "Enviar invitación", "Send invite")}</Button>
          </form>
          <div className="rounded-np border border-navy-line bg-navy-card p-4">
            <div className="font-display font-semibold">{tx(locale, "Invitaciones pendientes", "Pending invites")}</div>
            {invites.map((i) => (
              <div key={i.email} className="np-in mt-3 flex items-center gap-2 text-sm"><Mail size={15} className="text-coral" /><span className="flex-1 truncate">{i.email}</span><Badge tone="dark">{i.role}</Badge></div>
            ))}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

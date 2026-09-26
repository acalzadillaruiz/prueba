"use client";

import { useState } from "react";
import { Lock, Save } from "lucide-react";
import type { Locale } from "@/types/domain";
import { AdminShell } from "@/components/layout/AdminShell";
import { Logo } from "@/components/brand/Logo";
import { Button, Field, darkInputCls } from "@/components/ui";
import { agencyById } from "@/mock/people";
import { money, tx } from "@/lib/i18n";

export function SettingsView({ locale }: { locale: Locale }) {
  const a = agencyById("ag-andes")!;
  const [color, setColor] = useState(a.color);
  const [pct, setPct] = useState(a.commissionPct);
  const [split, setSplit] = useState(a.agentSplitPct);
  const sample = 235000;
  return (
    <AdminShell locale={locale} area="agency" title={tx(locale, "Ajustes de la agencia", "Agency settings")} actions={<Button size="sm"><Save size={14} /> {tx(locale, "Guardar", "Save")}</Button>}>
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-np border border-navy-line bg-navy-card p-5">
          <div className="font-display text-lg font-semibold">{tx(locale, "Marca de agencia (white-label light)", "Agency branding (light white-label)")}</div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field dark label={tx(locale, "Nombre", "Name")}><input className={darkInputCls} defaultValue={a.name} /></Field>
            <Field dark label={tx(locale, "Color de acento", "Accent color")}>
              <div className="flex gap-2"><input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-12 rounded border border-navy-line bg-navy-2" /><input className={darkInputCls} value={color} onChange={(e) => setColor(e.target.value)} /></div>
            </Field>
            <Field dark label={tx(locale, "Teléfono", "Phone")}><input className={darkInputCls} defaultValue={a.phone} /></Field>
            <Field dark label="WhatsApp" hint={tx(locale, "Solo se muestra el número. Sin API.", "Number shown only. No API.")}><input className={darkInputCls} defaultValue={a.whatsapp} /></Field>
          </div>
          <div className="mt-5 rounded-lg bg-ivory p-4 text-ink">
            <div className="text-xs font-semibold uppercase tracking-wide text-ink/45">{tx(locale, "Vista previa en ficha pública", "Public listing preview")}</div>
            <div className="mt-2 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg font-display font-bold text-navy" style={{ background: color }}>{a.initials}</span>
              <div className="flex-1"><div className="font-display font-semibold">{a.name}</div><div className="text-sm text-ink/55">{a.whatsapp}</div></div>
              <button className="rounded-np px-3 py-2 font-display text-sm text-white" style={{ background: color }}>{tx(locale, "Contactar", "Contact")}</button>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-line pt-2 text-xs text-ink/50"><span>Listed on New Place</span><Logo size="sm" /></div>
          </div>
        </div>
        <div className="space-y-6">
          <div className="rounded-np border border-navy-line bg-navy-card p-5">
            <div className="font-display text-lg font-semibold">{tx(locale, "Reglas de comisión", "Commission rules")}</div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Field dark label={tx(locale, "Comisión de venta (%)", "Sale commission (%)")}><input className={darkInputCls} type="number" step="0.5" value={pct} onChange={(e) => setPct(+e.target.value)} /></Field>
              <Field dark label={tx(locale, "Parte del agente (%)", "Agent split (%)")}><input className={darkInputCls} type="number" value={split} onChange={(e) => setSplit(+e.target.value)} /></Field>
              <Field dark label={tx(locale, "Alquiler", "Rent")}><input className={darkInputCls} defaultValue={tx(locale, "1 mes de canon", "1 month's rent")} /></Field>
              <Field dark label={tx(locale, "Captador (%)", "Captor (%)")}><input className={darkInputCls} defaultValue="10" /></Field>
            </div>
            <div className="mt-4 rounded-lg bg-white/5 p-3 text-sm">{tx(locale, "Ejemplo", "Example")}: {money(sample, locale)} → {tx(locale, "agencia", "agency")} <b>{money((sample * pct) / 100, locale)}</b> · {tx(locale, "agente", "agent")} <b>{money((sample * pct * split) / 10000, locale)}</b></div>
          </div>
          <div className="rounded-np border border-navy-line bg-navy-card p-5">
            <div className="flex items-center gap-2 font-display text-lg font-semibold"><Lock size={16} className="text-mist" /> {tx(locale, "Plan (solo lectura)", "Plan (read-only)")}</div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
              {["FREE", "PRO", "ENTERPRISE"].map((p) => (
                <div key={p} className={p === a.plan ? "rounded-lg border border-coral bg-[#F26B4D1a] p-3" : "rounded-lg border border-navy-line p-3 text-mist"}><div className="font-display font-semibold">{p}</div><div className="text-xs">{p === "FREE" ? "10 listings" : p === "PRO" ? "100 listings · IA" : tx(locale, "Ilimitado", "Unlimited")}</div></div>
              ))}
            </div>
            <p className="mt-3 text-xs text-mist">{tx(locale, "Sin cobros en v1. El plan lo gestiona el superadmin.", "No billing in v1. Plans are managed by the superadmin.")}</p>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

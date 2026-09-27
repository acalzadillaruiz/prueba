"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Lock, Save } from "lucide-react";
import type { Agency, Locale } from "@/types/domain";
import { AdminShell } from "@/components/layout/AdminShell";
import { Logo } from "@/components/brand/Logo";
import { Button, Field, darkInputCls } from "@/components/ui";
import { useApp } from "@/lib/store";
import { api } from "@/lib/api";
import { money, tx } from "@/lib/i18n";

export function SettingsView({ locale, agency, rule, logoUrl = "" }: { locale: Locale; agency: Agency; logoUrl?: string; rule: { salePct: number; agentSplitPct: number; rentMonths: number; captorPct: number } }) {
  const router = useRouter();
  const { user } = useApp();
  const owner = user?.role === "AGENCY_OWNER" || user?.role === "SUPERADMIN";
  const [b, setB] = useState({ name: agency.name, color: agency.color, phone: agency.phone, whatsapp: agency.whatsapp, logoUrl });
  const [r, setR] = useState(rule);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const sample = 235000;
  const save = async () => {
    setBusy(true);
    setErr(null);
    try {
      await api("agency", { method: "PATCH", json: { ...b, logoUrl: b.logoUrl.trim() || null } });
      await api("agency/commission", { method: "PUT", json: r });
      setSaved(true);
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const dirty = () => setSaved(false);
  return (
    <AdminShell
      locale={locale}
      area="agency"
      title={tx(locale, "Ajustes de la agencia", "Agency settings")}
      actions={owner ? <Button size="sm" onClick={save} disabled={busy}>{busy ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : <Save size={14} />} {saved ? tx(locale, "Guardado", "Saved") : tx(locale, "Guardar", "Save")}</Button> : undefined}
    >
      {err && <div role="alert" className="mb-4 rounded-lg bg-[#B4231833] px-3 py-2 text-sm text-[#FF8A7A]">{err}</div>}
      <div className="grid gap-6 [&>*]:min-w-0 xl:grid-cols-2">
        <div className="rounded-np border border-navy-line bg-navy-card p-5">
          <div className="font-display text-lg font-semibold">{tx(locale, "Marca de agencia (white-label light)", "Agency branding (light white-label)")}</div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field dark label={tx(locale, "Nombre", "Name")}><input className={darkInputCls} disabled={!owner} value={b.name} onChange={(e) => { setB({ ...b, name: e.target.value }); dirty(); }} /></Field>
            <Field dark label={tx(locale, "Color de acento", "Accent color")}>
              <div className="flex gap-2">
                <input type="color" disabled={!owner} value={b.color} onChange={(e) => { setB({ ...b, color: e.target.value }); dirty(); }} className="h-10 w-12 rounded border border-navy-line bg-navy-2" aria-label={tx(locale, "Color", "Color")} />
                <input className={darkInputCls} disabled={!owner} value={b.color} onChange={(e) => { setB({ ...b, color: e.target.value }); dirty(); }} />
              </div>
            </Field>
            <Field dark label={tx(locale, "Teléfono", "Phone")}><input className={darkInputCls} disabled={!owner} value={b.phone} onChange={(e) => { setB({ ...b, phone: e.target.value }); dirty(); }} /></Field>
            <Field dark label="WhatsApp" hint={tx(locale, "Solo se muestra el número. Sin API.", "Number shown only. No API.")}><input className={darkInputCls} disabled={!owner} value={b.whatsapp} onChange={(e) => { setB({ ...b, whatsapp: e.target.value }); dirty(); }} /></Field>
            <div className="sm:col-span-2">
              <Field dark label={tx(locale, "Logo (URL https)", "Logo (https URL)")} hint={tx(locale, "Opcional. Imagen cuadrada; si falta se usan las iniciales.", "Optional. Square image; initials are used when empty.")}>
                <input className={darkInputCls} type="url" inputMode="url" placeholder="https://…" disabled={!owner} value={b.logoUrl} onChange={(e) => { setB({ ...b, logoUrl: e.target.value }); dirty(); }} />
              </Field>
            </div>
          </div>
          <div className="mt-5 rounded-lg bg-ivory p-4 text-ink">
            <div className="text-xs font-semibold uppercase tracking-wide text-ink/65">{tx(locale, "Vista previa en ficha pública", "Public listing preview")}</div>
            <div className="mt-2 flex items-center gap-3">
              {/^https:\/\/|^\/uploads\//.test(b.logoUrl.trim()) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={b.logoUrl.trim()} alt="" className="h-10 w-10 rounded-lg bg-white object-contain" />
              ) : (
                <span className="flex h-10 w-10 items-center justify-center rounded-lg font-display font-bold text-navy" style={{ background: b.color }}>{agency.initials}</span>
              )}
              <div className="flex-1"><div className="font-display font-semibold">{b.name}</div><div className="text-sm text-ink/65">{b.whatsapp}</div></div>
              <span className="rounded-np px-3 py-2 font-display text-sm text-white" style={{ background: b.color }}>{tx(locale, "Contactar", "Contact")}</span>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-line pt-2 text-xs text-ink/65"><span>Listed on New Place</span><Logo size="sm" /></div>
          </div>
        </div>
        <div className="space-y-6">
          <div className="rounded-np border border-navy-line bg-navy-card p-5">
            <div className="font-display text-lg font-semibold">{tx(locale, "Reglas de comisión", "Commission rules")}</div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Field dark label={tx(locale, "Comisión de venta (%)", "Sale commission (%)")}><input className={darkInputCls} disabled={!owner} type="number" step="0.5" min={0} max={20} value={r.salePct} onChange={(e) => { setR({ ...r, salePct: +e.target.value }); dirty(); }} /></Field>
              <Field dark label={tx(locale, "Parte del agente (%)", "Agent split (%)")}><input className={darkInputCls} disabled={!owner} type="number" min={0} max={100} value={r.agentSplitPct} onChange={(e) => { setR({ ...r, agentSplitPct: +e.target.value }); dirty(); }} /></Field>
              <Field dark label={tx(locale, "Alquiler (meses de canon)", "Rent (months of rent)")}><input className={darkInputCls} disabled={!owner} type="number" step="0.5" min={0} max={3} value={r.rentMonths} onChange={(e) => { setR({ ...r, rentMonths: +e.target.value }); dirty(); }} /></Field>
              <Field dark label={tx(locale, "Captador (%)", "Captor (%)")}><input className={darkInputCls} disabled={!owner} type="number" min={0} max={50} value={r.captorPct} onChange={(e) => { setR({ ...r, captorPct: +e.target.value }); dirty(); }} /></Field>
            </div>
            <div className="mt-4 rounded-lg bg-white/5 p-3 text-sm">{tx(locale, "Ejemplo", "Example")}: {money(sample, locale)} → {tx(locale, "agencia", "agency")} <b>{money((sample * r.salePct) / 100, locale)}</b> · {tx(locale, "agente", "agent")} <b>{money((sample * r.salePct * r.agentSplitPct) / 10000, locale)}</b></div>
          </div>
          <div className="rounded-np border border-navy-line bg-navy-card p-5">
            <div className="flex items-center gap-2 font-display text-lg font-semibold"><Lock size={16} className="text-mist" /> {tx(locale, "Plan (solo lectura)", "Plan (read-only)")}</div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
              {["FREE", "PRO", "ENTERPRISE"].map((p) => (
                <div key={p} className={p === agency.plan ? "rounded-lg border border-coral bg-[#F26B4D1a] p-3" : "rounded-lg border border-navy-line p-3 text-mist"}><div className="font-display font-semibold">{p}</div><div className="text-xs">{p === "FREE" ? "10 listings" : p === "PRO" ? "100 listings · IA" : tx(locale, "Ilimitado", "Unlimited")}</div></div>
              ))}
            </div>
            <p className="mt-3 text-xs text-mist">{tx(locale, "Sin cobros en v1. El plan lo gestiona el superadmin.", "No billing in v1. Plans are managed by the superadmin.")}</p>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

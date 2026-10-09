"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Lock, PhoneCall, Save } from "lucide-react";
import type { Agency, Locale } from "@/types/domain";
import { AdminShell } from "@/components/layout/AdminShell";
import { Logo } from "@/components/brand/Logo";
import { Button, Field } from "@/components/ui";
import { Select, k } from "./kit";
import { cn } from "@/lib/cn";
import { useApp } from "@/lib/store";
import { api } from "@/lib/api";
import { money, tx } from "@/lib/i18n";
import { caracasWeekday } from "@/lib/caracas-time";
import { WEEKDAY_LABEL, WEEK_ORDER, type OnCallRotation } from "@/lib/on-call";

type Advisor = { id: string; name: string; owner: boolean; /** Identity checked by the agency (Equipo → Verificar). */ verified?: boolean };

/** Sale commission accepted in settings (a Venezuelan agency charges a few %, never 250 %). */
const SALE_MAX = 15;
const inRange = (v: number, min: number, max: number) => Number.isFinite(v) && v >= min && v <= max;

/** WCAG relative luminance of a #RRGGBB colour. */
function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const contrast = (a: string, b: string) => {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};
/** Text on the accent: white or Navy, whichever reads better; `ratio` is that pair's contrast. */
function accentText(accent: string) {
  const hex = /^#[0-9a-fA-F]{6}$/.test(accent) ? accent : "#1E1A18";
  const white = contrast(hex, "#FFFFFF");
  const dark = contrast(hex, "#1E1A18");
  return white >= dark ? { color: "#FFFFFF", ratio: white } : { color: "#1E1A18", ratio: dark };
}

export function SettingsView({
  locale,
  agency,
  rule,
  logoUrl = "",
  onCall: onCallInit,
  advisors = [],
}: {
  locale: Locale;
  agency: Agency;
  logoUrl?: string;
  rule: { salePct: number; agentSplitPct: number; rentMonths: number; captorPct: number };
  onCall?: OnCallRotation;
  advisors?: Advisor[];
}) {
  const router = useRouter();
  const { user } = useApp();
  const owner = user?.role === "AGENCY_OWNER" || user?.role === "SUPERADMIN";
  const [b, setB] = useState({ name: agency.name, color: agency.color, phone: agency.phone, whatsapp: agency.whatsapp, logoUrl });
  const [r, setR] = useState(rule);
  const [onCall, setOnCall] = useState<OnCallRotation | undefined>(onCallInit);
  // Today's weekday on the Caracas clock, computed after mount so server and client markup always match.
  const [today, setToday] = useState<number | null>(null);
  useEffect(() => setToday(caracasWeekday()), []);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const sample = 235000;
  const onAccent = accentText(b.color);
  // Everything is checked here first: nothing is sent unless all of it is valid (no half-saved settings).
  const ruleErr = {
    salePct: inRange(r.salePct, 0, SALE_MAX) ? null : tx(locale, `La comisión de venta va de 0 a ${SALE_MAX} %.`, `Sale commission must be between 0 and ${SALE_MAX} %.`),
    agentSplitPct: inRange(r.agentSplitPct, 0, 100) ? null : tx(locale, "La parte del agente va de 0 a 100 %.", "Agent split must be between 0 and 100 %."),
    rentMonths: inRange(r.rentMonths, 0, 3) ? null : tx(locale, "En alquiler, de 0 a 3 meses de canon.", "For rentals, 0 to 3 months of rent."),
    captorPct: inRange(r.captorPct, 0, 50) ? null : tx(locale, "La parte del captador va de 0 a 50 %.", "Captor share must be between 0 and 50 %."),
  };
  const logo = b.logoUrl.trim();
  const brandErr = {
    name: b.name.trim().length >= 2 && b.name.trim().length <= 80 ? null : tx(locale, "Escribe el nombre de la agencia (2 a 80 caracteres).", "Enter the agency name (2 to 80 characters)."),
    color: /^#[0-9a-fA-F]{6}$/.test(b.color) ? null : tx(locale, "Usa un color como #C9A574.", "Use a colour like #C9A574."),
    logoUrl: !logo || /^https:\/\/[^\s]+$/.test(logo) || /^\/uploads\//.test(logo) ? null : tx(locale, "El logo debe ser un enlace que empiece por https://", "The logo must be a link starting with https://"),
  };
  const verifiedIds = new Set(advisors.filter((a) => a.verified !== false).map((a) => a.id));
  const unverifiedDays = onCall ? WEEK_ORDER.filter((d) => onCall[d] && !verifiedIds.has(onCall[d]!)) : [];
  const ruleOk = !Object.values(ruleErr).some(Boolean);
  const valid = ruleOk && !Object.values(brandErr).some(Boolean) && unverifiedDays.length === 0;
  const save = async () => {
    if (!valid) {
      setErr(tx(locale, "Revisa los campos marcados: no hemos guardado nada todavía.", "Check the highlighted fields: nothing has been saved yet."));
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await api("agency", { method: "PATCH", json: { ...b, logoUrl: b.logoUrl.trim() || null, ...(onCall ? { onCall } : {}) } });
      await api("agency/commission", { method: "PUT", json: r });
      setSaved(true);
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const dirty = () => {
    setSaved(false);
    setErr(null);
  };
  return (
    <AdminShell
      locale={locale}
      area="agency"
      title={tx(locale, "Ajustes de la agencia", "Agency settings")}
      actions={owner ? <Button className={k.primary} onClick={save} disabled={busy}>{busy ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : <Save size={14} />} {saved ? tx(locale, "Guardado", "Saved") : tx(locale, "Guardar", "Save")}</Button> : undefined}
    >
      {err && <div role="alert" className={cn("mb-4", k.err)}>{err}</div>}
      <div className="grid gap-6 [&>*]:min-w-0 xl:grid-cols-2">
        <div className={cn(k.card, "p-5 md:p-6")}>
          <h2 className={k.title}>{tx(locale, "Marca de tu agencia", "Your agency’s branding")}</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label={tx(locale, "Nombre", "Name")} error={brandErr.name ?? undefined}><input className={k.input} aria-invalid={!!brandErr.name} disabled={!owner} value={b.name} onChange={(e) => { setB({ ...b, name: e.target.value }); dirty(); }} /></Field>
            <Field label={tx(locale, "Color de acento", "Accent color")} error={brandErr.color ?? undefined}>
              <div className="flex gap-2">
                <input type="color" disabled={!owner} value={/^#[0-9a-fA-F]{6}$/.test(b.color) ? b.color : "#000000"} onChange={(e) => { setB({ ...b, color: e.target.value }); dirty(); }} className={cn("h-11 w-12 shrink-0 rounded-xl border bg-white p-1 md:h-10 dark:bg-navy", k.line)} aria-label={tx(locale, "Color", "Color")} />
                <input className={k.input} aria-invalid={!!brandErr.color} disabled={!owner} value={b.color} onChange={(e) => { setB({ ...b, color: e.target.value }); dirty(); }} />
              </div>
            </Field>
            <Field label={tx(locale, "Teléfono", "Phone")}><input className={k.input} disabled={!owner} value={b.phone} onChange={(e) => { setB({ ...b, phone: e.target.value }); dirty(); }} /></Field>
            <Field label="WhatsApp" hint={tx(locale, "Se muestra el número para que te escriban directamente.", "The number is shown so people can message you directly.")}><input className={k.input} disabled={!owner} value={b.whatsapp} onChange={(e) => { setB({ ...b, whatsapp: e.target.value }); dirty(); }} /></Field>
            <div className="sm:col-span-2">
              <Field label={tx(locale, "Logo (URL https)", "Logo (https URL)")} hint={tx(locale, "Opcional. Imagen cuadrada; si falta se usan las iniciales.", "Optional. Square image; initials are used when empty.")} error={brandErr.logoUrl ?? undefined}>
                <input className={k.input} aria-invalid={!!brandErr.logoUrl} type="url" inputMode="url" placeholder="https://…" disabled={!owner} value={b.logoUrl} onChange={(e) => { setB({ ...b, logoUrl: e.target.value }); dirty(); }} />
              </Field>
            </div>
          </div>
          {/* The public listing is light: the preview pins the light tokens even in the dark cockpit (Cal surface, Navy ink,
              muted #5E5248 = 6.4:1), and the button text follows the accent's luminance (white or Navy). */}
          <div className="mt-5 rounded-xl bg-[#F1EBE3] p-4 text-[#1E1A18] ring-1 ring-[#ECE6DA] [--np-ink-rgb:30_26_24] [--np-line-rgb:216_203_183] [--np-logo-ink:#1E1A18] [--np-logo-teja:#8E3B22] [--np-muted-rgb:94_82_72] [color-scheme:light] dark:ring-white/10" data-testid="brand-preview">
            <div className="text-[11px] font-semibold uppercase tracking-[.12em] text-[#5E5248]">{tx(locale, "Vista previa en ficha pública", "Public listing preview")}</div>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              {/^https:\/\/|^\/uploads\//.test(b.logoUrl.trim()) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={b.logoUrl.trim()} alt="" className="h-10 w-10 rounded-lg bg-white object-contain" />
              ) : (
                <span className="flex h-10 w-10 items-center justify-center rounded-lg font-display font-bold" style={{ background: b.color, color: onAccent.color }}>{agency.initials}</span>
              )}
              <div className="min-w-0 flex-1"><div className="truncate font-display font-semibold">{b.name}</div><div className="text-sm text-[#5E5248]">{b.whatsapp}</div></div>
              <span className="rounded-np px-3 py-2 font-display text-sm font-semibold" style={{ background: b.color, color: onAccent.color }}>{tx(locale, "Contactar", "Contact")}</span>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-[#D8CBB7] pt-2 text-xs text-[#5E5248]"><span>{tx(locale, "Publicado en New Place", "Listed on New Place")}</span><Logo size="sm" /></div>
          </div>
          {!brandErr.color && onAccent.ratio < 4.5 && (
            <p className={cn("mt-3", k.warnBox)} role="status">
              {tx(
                locale,
                `Con este color el texto del botón tiene un contraste de ${onAccent.ratio.toFixed(1)}:1 (mínimo recomendado 4,5:1). Prueba un tono más oscuro o más claro.`,
                `With this colour the button text has a ${onAccent.ratio.toFixed(1)}:1 contrast (recommended minimum 4.5:1). Try a darker or lighter shade.`,
              )}
            </p>
          )}
        </div>
        <div className="space-y-6">
          <div className={cn(k.card, "p-5 md:p-6")}>
            <h2 className={k.title}>{tx(locale, "Reglas de comisión", "Commission rules")}</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Field label={tx(locale, "Comisión de venta (%)", "Sale commission (%)")} hint={tx(locale, `Entre 0 y ${SALE_MAX} %.`, `Between 0 and ${SALE_MAX} %.`)} error={ruleErr.salePct ?? undefined}><input className={k.input} aria-invalid={!!ruleErr.salePct} disabled={!owner} type="number" step="0.5" min={0} max={SALE_MAX} value={r.salePct} onChange={(e) => { setR({ ...r, salePct: +e.target.value }); dirty(); }} /></Field>
              <Field label={tx(locale, "Parte del agente (%)", "Agent split (%)")} error={ruleErr.agentSplitPct ?? undefined}><input className={k.input} aria-invalid={!!ruleErr.agentSplitPct} disabled={!owner} type="number" min={0} max={100} value={r.agentSplitPct} onChange={(e) => { setR({ ...r, agentSplitPct: +e.target.value }); dirty(); }} /></Field>
              <Field label={tx(locale, "Alquiler (meses de canon)", "Rent (months of rent)")} error={ruleErr.rentMonths ?? undefined}><input className={k.input} aria-invalid={!!ruleErr.rentMonths} disabled={!owner} type="number" step="0.5" min={0} max={3} value={r.rentMonths} onChange={(e) => { setR({ ...r, rentMonths: +e.target.value }); dirty(); }} /></Field>
              <Field label={tx(locale, "Captador (%)", "Captor (%)")} error={ruleErr.captorPct ?? undefined}><input className={k.input} aria-invalid={!!ruleErr.captorPct} disabled={!owner} type="number" min={0} max={50} value={r.captorPct} onChange={(e) => { setR({ ...r, captorPct: +e.target.value }); dirty(); }} /></Field>
            </div>
            <div className={cn("mt-4 rounded-xl p-3.5 text-sm", k.soft)}>
              {ruleErr.salePct || ruleErr.agentSplitPct ? (
                <span className={k.muted}>{tx(locale, "Corrige la comisión para ver el ejemplo.", "Fix the commission to see the example.")}</span>
              ) : (
                <>{tx(locale, "Ejemplo", "Example")}: {money(sample, locale)} → {tx(locale, "agencia", "agency")} <b>{money((sample * r.salePct) / 100, locale)}</b> · {tx(locale, "agente", "agent")} <b>{money((sample * r.salePct * r.agentSplitPct) / 10000, locale)}</b></>
              )}
            </div>
          </div>
          <div className={cn(k.card, "p-5 md:p-6")}>
            <h2 className={cn(k.title, "flex items-center gap-2")}><Lock size={16} strokeWidth={1.6} className={k.muted} /> {tx(locale, "Plan (solo lectura)", "Plan (read-only)")}</h2>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
              {["FREE", "PRO", "ENTERPRISE"].map((p) => (
                <div key={p} aria-current={p === agency.plan ? "true" : undefined} className={p === agency.plan ? "rounded-xl bg-[#E6DDD2] p-3 text-navy shadow-[inset_0_0_0_2px_#1E1A18] dark:bg-white/10 dark:text-ivory dark:shadow-[inset_0_0_0_2px_#C9A574]" : cn("rounded-xl border p-3", k.line, k.muted)}><div className="font-display font-semibold">{p === "FREE" ? tx(locale, "Gratis", "Free") : p === "PRO" ? tx(locale, "Profesional", "Professional") : tx(locale, "Empresa", "Enterprise")}</div><div className="text-xs">{p === "FREE" ? tx(locale, "Hasta 10 inmuebles", "Up to 10 listings") : p === "PRO" ? tx(locale, "Hasta 100 inmuebles · textos y valoraciones automáticas", "Up to 100 listings · automatic texts and valuations") : tx(locale, "Inmuebles ilimitados", "Unlimited listings")}</div></div>
              ))}
            </div>
            <p className={cn("mt-3 text-xs", k.muted)}>{tx(locale, "Por ahora no cobramos ningún plan. Si necesitas cambiarlo, escríbenos y lo hace el equipo de New Place.", "We don’t charge for any plan for now. If you need a change, write to us and the New Place team will do it.")}</p>
          </div>
        </div>
      </div>
      {onCall && (
        <section className={cn(k.card, "mt-6 p-5 md:p-6")} aria-labelledby="oncall-title">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 id="oncall-title" className={cn(k.title, "flex items-center gap-2")}><PhoneCall size={18} strokeWidth={1.6} className={k.muted} aria-hidden /> {tx(locale, "Guardia 24/7", "24/7 on-call")}</h2>
              <p className={cn("mt-1 max-w-[60ch] text-sm", k.muted)}>
                {tx(
                  locale,
                  "Elige quién atiende cada día (hora de Caracas). El asesor de guardia aparece en la web pública con su nombre, teléfono y WhatsApp; nunca su email.",
                  "Pick who answers each day (Caracas time). The on-call advisor is shown on the public site with name, phone and WhatsApp; never their email.",
                )}
              </p>
            </div>
          </div>
          {advisors.length === 0 ? (
            <p className={cn("mt-4", k.warnBox)}>{tx(locale, "Aún no hay asesores en el equipo. Invita a un agente para armar la guardia.", "No advisors on the team yet. Invite an agent to build the rota.")}</p>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {WEEK_ORDER.map((d) => {
                const isToday = today === Number(d);
                const label = tx(locale, ...WEEKDAY_LABEL[d]);
                return (
                  <label key={d} className={cn("block rounded-xl border p-3", k.line, isToday && "border-navy/40 dark:border-[#C9A574]/50")}>
                    <span className="mb-1.5 flex items-center justify-between gap-2 text-sm font-semibold text-navy dark:text-ivory">
                      {label}
                      {isToday && <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[.12em]", k.soft)}>{tx(locale, "Hoy", "Today")}</span>}
                    </span>
                    <Select
                      disabled={!owner}
                      value={onCall[d] ?? ""}
                      aria-label={tx(locale, `Guardia del ${label.toLowerCase()}`, `On call on ${label}`)}
                      onChange={(e) => {
                        setOnCall({ ...onCall, [d]: e.target.value || null });
                        dirty();
                      }}
                    >
                      <option value="">{tx(locale, "Sin guardia", "Nobody")}</option>
                      {advisors.map((a) => (
                        <option key={a.id} value={a.id} disabled={a.verified === false}>
                          {a.name}
                          {a.owner ? tx(locale, " (dueño/a)", " (owner)") : ""}
                          {a.verified === false ? tx(locale, " — sin verificar", " — not verified") : ""}
                        </option>
                      ))}
                    </Select>
                    {unverifiedDays.includes(d) && (
                      <span role="alert" className="mt-1 block text-xs font-semibold text-danger">{tx(locale, "Esta persona aún no está verificada: elige a otra.", "This person isn’t verified yet: pick someone else.")}</span>
                    )}
                  </label>
                );
              })}
            </div>
          )}
          {advisors.some((a) => a.verified === false) && (
            <p className={cn("mt-3 text-sm", k.muted)}>{tx(locale, "Solo pueden estar de guardia los asesores verificados. Verifica a tu equipo en «Equipo».", "Only verified advisors can be on call. Verify your team under “Team”.")}</p>
          )}
          {advisors.length > 0 && WEEK_ORDER.some((d) => !onCall[d]) && (
            <p className={cn("mt-3 text-sm", k.muted)}>{tx(locale, "Los días sin guardia no muestran asesor en la web pública.", "Days with nobody on call show no advisor on the public site.")}</p>
          )}
        </section>
      )}
    </AdminShell>
  );
}

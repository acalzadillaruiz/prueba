"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { logout } from "@/lib/logout";
import { BadgeCheck, Check, Globe, Loader2, Lock, LogOut } from "lucide-react";
import type { Locale } from "@/types/domain";
import { Avatar, Badge, Button, Card, Field, inputCls } from "@/components/ui";
import { k } from "@/components/agency/kit";
import { api } from "@/lib/api";
import { tx } from "@/lib/i18n";
import { cn } from "@/lib/cn";

export interface AccountData {
  name: string;
  email: string;
  phone: string;
  budget: number | null;
  interests: string;
  verified: boolean;
  initials: string;
  hue: number;
  providers: string[];
  hasPassword: boolean;
  locale: "es" | "en";
}

export function AccountView({ locale, data }: { locale: Locale; data: AccountData }) {
  const [f, setFState] = useState(data);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showErrs, setShowErrs] = useState(false);
  const router = useRouter();
  // Any edit after a save means there are unsaved changes again.
  const setF = (x: AccountData) => {
    setFState(x);
    setSaved(false);
  };
  // Same bounds as PATCH /api/v1/me, with a message per field instead of a generic "check the data".
  const errs = {
    name: f.name.trim().length < 2 || f.name.trim().length > 80 ? tx(locale, "Entre 2 y 80 caracteres.", "Between 2 and 80 characters.") : null,
    phone: f.phone.length > 30 ? tx(locale, "Hasta 30 caracteres.", "Up to 30 characters.") : null,
    budget: f.budget !== null && (!Number.isInteger(f.budget) || f.budget <= 0) ? tx(locale, "Un monto en USD mayor que 0, sin decimales.", "A USD amount above 0, no decimals.") : null,
    interests: f.interests.length > 200 ? tx(locale, "Hasta 200 caracteres.", "Up to 200 characters.") : null,
  };
  const invalid = Object.values(errs).some(Boolean);
  const save = async () => {
    setShowErrs(true);
    if (invalid) return;
    setBusy(true);
    setErr(null);
    try {
      await api("me", { method: "PATCH", json: { name: f.name.trim(), phone: f.phone.trim(), budget: f.budget, interests: f.interests, locale: f.locale } });
      setSaved(true);
      router.refresh();
      if (f.locale !== locale) router.push(`/${f.locale}/account`);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:px-6">
      <div className={k.eyebrow}>{tx(locale, "Área privada", "Private area")}</div>
      <h1 className="mt-1 font-serif text-[40px] font-medium leading-[1.05] md:text-[48px]">{tx(locale, "Mi cuenta", "My account")}</h1>
      <Card className={cn(k.card, "border-0 mt-6 p-6")}>
        <div className="flex flex-wrap items-center gap-4">
          <Avatar initials={data.initials} hue={data.hue} size={64} />
          <div>
            <div className="font-display text-xl font-semibold">{f.name}</div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-ink/60">
              {data.email}
              {data.verified ? <Badge tone="ok"><BadgeCheck size={12} /> {tx(locale, "Email verificado", "Email verified")}</Badge> : <Badge tone="warn">{tx(locale, "Email sin verificar", "Email not verified")}</Badge>}
            </div>
          </div>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Field label={tx(locale, "Nombre", "Name")} error={showErrs ? errs.name ?? undefined : undefined}><input className={inputCls} value={f.name} maxLength={80} autoComplete="name" aria-invalid={showErrs && !!errs.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label={tx(locale, "Teléfono", "Phone")} error={showErrs ? errs.phone ?? undefined : undefined}><input className={inputCls} type="tel" value={f.phone} maxLength={30} autoComplete="tel" aria-invalid={showErrs && !!errs.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
          <Field label={tx(locale, "Presupuesto (USD)", "Budget (USD)")} error={showErrs ? errs.budget ?? undefined : undefined}><input className={inputCls} type="number" inputMode="numeric" min={1} step={1} value={f.budget ?? ""} aria-invalid={showErrs && !!errs.budget} onChange={(e) => setF({ ...f, budget: e.target.value ? Number(e.target.value) : null })} /></Field>
          <Field label={tx(locale, "Zonas de interés", "Areas of interest")} error={showErrs ? errs.interests ?? undefined : undefined}><input className={inputCls} value={f.interests} maxLength={200} aria-invalid={showErrs && !!errs.interests} onChange={(e) => setF({ ...f, interests: e.target.value })} /></Field>
        </div>
      </Card>
      <Card className={cn(k.card, "border-0 mt-6 divide-y divide-line")}>
        <div className="flex flex-wrap items-center gap-4 p-5">
          <Globe size={20} strokeWidth={1.6} className="text-navy/70 dark:text-ivory/70" />
          <div className="flex-1">
            <div className="font-semibold">{tx(locale, "Idioma", "Language")}</div>
            <div className="text-sm text-ink/65">{tx(locale, "Precios en USD con referencia en VES y EUR.", "Prices in USD with VES and EUR reference.")}</div>
          </div>
          <select className="h-10 rounded-lg border border-line bg-white px-3" value={f.locale} onChange={(e) => setF({ ...f, locale: e.target.value as "es" | "en" })} aria-label={tx(locale, "Idioma", "Language")}>
            <option value="es">Español</option>
            <option value="en">English</option>
          </select>
        </div>
        <div className="flex items-center gap-4 p-5">
          <Lock size={20} strokeWidth={1.6} className="text-navy/70 dark:text-ivory/70" />
          <div className="flex-1">
            <div className="font-semibold">{tx(locale, "Inicio de sesión", "Sign-in")}</div>
            <div className="text-sm text-ink/65">
              {[data.providers.includes("google") && "Google", data.hasPassword && tx(locale, "email y contraseña", "email & password")].filter(Boolean).join(" · ") || "—"}
            </div>
          </div>
        </div>
      </Card>
      {err && <div role="alert" className="mt-4 rounded-xl border border-danger/25 bg-[#B3261E0D] px-3.5 py-2.5 text-sm text-danger">{err}</div>}
      <div className="mt-6 flex justify-between">
        <Button variant="ghost" onClick={() => logout(locale)}>
          <LogOut size={16} /> {tx(locale, "Cerrar sesión", "Sign out")}
        </Button>
        <Button onClick={save} disabled={busy}>
          {busy ? <Loader2 size={16} className="animate-spin" /> : saved ? <Check size={16} /> : null} {saved ? tx(locale, "Guardado", "Saved") : tx(locale, "Guardar cambios", "Save changes")}
        </Button>
      </div>
    </div>
  );
}

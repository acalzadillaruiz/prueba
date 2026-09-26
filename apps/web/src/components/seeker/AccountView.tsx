"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { BadgeCheck, Check, Globe, Loader2, Lock, LogOut } from "lucide-react";
import type { Locale } from "@/types/domain";
import { Avatar, Badge, Button, Card, Field, inputCls } from "@/components/ui";
import { api } from "@/lib/api";
import { tx } from "@/lib/i18n";

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
  const [f, setF] = useState(data);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();
  const save = async () => {
    setBusy(true);
    setErr(null);
    try {
      await api("me", { method: "PATCH", json: { name: f.name, phone: f.phone, budget: f.budget, interests: f.interests, locale: f.locale } });
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
      <h1 className="font-display text-3xl font-semibold">{tx(locale, "Mi cuenta", "My account")}</h1>
      <Card className="mt-6 p-6">
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
          <Field label={tx(locale, "Nombre", "Name")}><input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label={tx(locale, "Teléfono", "Phone")}><input className={inputCls} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
          <Field label={tx(locale, "Presupuesto (USD)", "Budget (USD)")}><input className={inputCls} type="number" value={f.budget ?? ""} onChange={(e) => setF({ ...f, budget: e.target.value ? Number(e.target.value) : null })} /></Field>
          <Field label={tx(locale, "Zonas de interés", "Areas of interest")}><input className={inputCls} value={f.interests} onChange={(e) => setF({ ...f, interests: e.target.value })} /></Field>
        </div>
      </Card>
      <Card className="mt-6 divide-y divide-line">
        <div className="flex flex-wrap items-center gap-4 p-5">
          <Globe size={20} className="text-coral" />
          <div className="flex-1">
            <div className="font-semibold">{tx(locale, "Idioma", "Language")}</div>
            <div className="text-sm text-ink/55">{tx(locale, "Precios en USD con referencia en VES y EUR.", "Prices in USD with VES and EUR reference.")}</div>
          </div>
          <select className="h-10 rounded-lg border border-line bg-white px-3" value={f.locale} onChange={(e) => setF({ ...f, locale: e.target.value as "es" | "en" })} aria-label={tx(locale, "Idioma", "Language")}>
            <option value="es">Español</option>
            <option value="en">English</option>
          </select>
        </div>
        <div className="flex items-center gap-4 p-5">
          <Lock size={20} className="text-coral" />
          <div className="flex-1">
            <div className="font-semibold">{tx(locale, "Inicio de sesión", "Sign-in")}</div>
            <div className="text-sm text-ink/55">
              {[data.providers.includes("google") && "Google", data.hasPassword && tx(locale, "email y contraseña", "email & password")].filter(Boolean).join(" · ") || "—"}
            </div>
          </div>
        </div>
      </Card>
      {err && <div className="mt-4 rounded-lg bg-[#B423181A] px-3 py-2 text-sm text-danger">{err}</div>}
      <div className="mt-6 flex justify-between">
        <Button variant="ghost" onClick={async () => { await signOut({ redirect: false }); window.location.href = `/${locale}`; }}>
          <LogOut size={16} /> {tx(locale, "Cerrar sesión", "Sign out")}
        </Button>
        <Button onClick={save} disabled={busy}>
          {busy ? <Loader2 size={16} className="animate-spin" /> : saved ? <Check size={16} /> : null} {saved ? tx(locale, "Guardado", "Saved") : tx(locale, "Guardar cambios", "Save changes")}
        </Button>
      </div>
    </div>
  );
}

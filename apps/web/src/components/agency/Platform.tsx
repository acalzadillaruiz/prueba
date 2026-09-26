"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, Ban, Bot, CheckCircle2, Database, Eye, KeyRound, LogIn, Plus, RefreshCw, RotateCcw, Search, ShieldAlert, ShieldCheck, Sprout } from "lucide-react";
import type { Locale } from "@/types/domain";
import { AdminShell } from "@/components/layout/AdminShell";
import { listingPhoto } from "@/lib/photos";
import { PropertyArt } from "@/components/art/PropertyArt";
import { StatusBadge } from "@/components/listing/bits";
import { Avatar, Badge, Button, Field, Stat, darkInputCls } from "@/components/ui";
import { BarChart } from "./charts";
import { useDemo } from "@/lib/store";
import { LISTINGS } from "@/mock/listings";
import { AGENCIES, USERS, agencyById } from "@/mock/people";
import { AUDIT, FX_RATES, LEADS, MODERATION_QUEUE } from "@/mock/ops";
import { ago, dateTime, money, num, tx } from "@/lib/i18n";
import { cn } from "@/lib/cn";

const WEEKS = [212, 240, 231, 268, 301, 296, 344, 362, 398, 421, 447, 489];

export function PlatformHome({ locale }: { locale: Locale }) {
  const data = WEEKS.map((v, i) => ({ label: `S${27 + i}`, value: v, hint: tx(locale, `Semana ${27 + i}`, `Week ${27 + i}`) }));
  return (
    <AdminShell locale={locale} area="platform" title={tx(locale, "Métricas globales", "Global metrics")}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Stat dark label={tx(locale, "Agencias", "Agencies")} value={AGENCIES.length} delta="+1" hint={tx(locale, "1 en prueba", "1 on trial")} />
        <Stat dark label={tx(locale, "Usuarios", "Users")} value={num(12480, locale)} delta="+9%" />
        <Stat dark label={tx(locale, "Inmuebles activos", "Active listings")} value={LISTINGS.filter((l) => l.status === "ACTIVE").length} delta="+6" />
        <Stat dark label={tx(locale, "Leads (7 d)", "Leads (7 d)")} value={489} delta="+10%" />
        <Stat dark label={tx(locale, "Tiempo 1ª respuesta", "First response")} value="9 min" delta="-2 min" hint={tx(locale, "mediana plataforma", "platform median")} />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="rounded-np border border-navy-line bg-navy-card p-5 xl:col-span-2">
          <div className="mb-3 flex items-center justify-between"><span className="font-display text-lg font-semibold">{tx(locale, "Leads por semana (plataforma)", "Weekly leads (platform)")}</span><span className="text-xs text-mist">12 {tx(locale, "semanas", "weeks")}</span></div>
          <BarChart data={data} height={220} />
        </div>
        <div className="rounded-np border border-navy-line bg-navy-card p-5">
          <div className="mb-3 font-display text-lg font-semibold">{tx(locale, "Salud del sistema", "System health")}</div>
          {[[tx(locale, "Proveedor IA", "AI provider"), "heuristic", true], ["Google Maps", tx(locale, "sin key → modo ilustrado", "no key → illustrated mode"), false], ["Auth", "Google + Credentials + DEMO", true], ["Email outbox", tx(locale, "5 en cola · SMTP off", "5 queued · SMTP off"), true], ["PostgreSQL", "16 · 48 listings", true]].map(([k, v, ok]) => (
            <div key={String(k)} className="flex items-center gap-2 border-t border-navy-line py-2.5 text-sm first:border-0">
              {ok ? <CheckCircle2 size={15} className="text-[#7FD3A8]" /> : <AlertTriangle size={15} className="text-[#F2B866]" />}
              <span className="flex-1">{k as string}</span><span className="text-xs text-mist">{v as string}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <div className="rounded-np border border-navy-line bg-navy-card p-5">
          <div className="mb-3 font-display text-lg font-semibold">{tx(locale, "Agencias", "Agencies")}</div>
          {AGENCIES.map((a) => (
            <div key={a.id} className="flex items-center gap-3 border-t border-navy-line py-2.5 first:border-0">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg font-display text-xs font-bold text-navy" style={{ background: a.color }}>{a.initials}</span>
              <div className="flex-1"><div className="font-semibold">{a.name}</div><div className="text-xs text-mist">{LISTINGS.filter((l) => l.agencyId === a.id).length} listings · {a.city}</div></div>
              <Badge tone="dark">{a.plan}</Badge>
            </div>
          ))}
        </div>
        <div className="rounded-np border border-navy-line bg-navy-card p-5">
          <div className="mb-3 font-display text-lg font-semibold">{tx(locale, "Auditoría reciente", "Recent audit log")}</div>
          {AUDIT.map((a, i) => (
            <div key={i} className="flex items-center gap-3 border-t border-navy-line py-2 text-sm first:border-0">
              <span className="w-20 text-xs text-mist">{ago(a.at, locale)}</span>
              <span className="font-semibold">{a.actor}</span>
              <code className="rounded bg-white/5 px-1.5 text-xs text-coral">{a.action}</code>
              <span className="flex-1 truncate text-mist">{a.target}</span>
            </div>
          ))}
        </div>
      </div>
    </AdminShell>
  );
}

export function PlatformAgencies({ locale }: { locale: Locale }) {
  const [plans, setPlans] = useState<Record<string, string>>({});
  const [imp, setImp] = useState<string | null>(null);
  return (
    <AdminShell locale={locale} area="platform" title={tx(locale, "Agencias", "Agencies")} actions={<Button size="sm"><Plus size={15} /> {tx(locale, "Nueva agencia", "New agency")}</Button>}>
      {imp && (
        <div className="np-in mb-4 flex items-center gap-3 rounded-np border border-coral bg-[#F26B4D1a] p-3 text-sm">
          <LogIn size={16} className="text-coral" /> {tx(locale, `Impersonando a ${agencyById(imp)!.name}. Todo queda en el audit log.`, `Impersonating ${agencyById(imp)!.name}. Everything is audit-logged.`)}
          <Link href={`/${locale}/agency`} className="ml-auto font-semibold text-coral">{tx(locale, "Abrir panel", "Open dashboard")} →</Link>
          <button onClick={() => setImp(null)} className="text-mist">{tx(locale, "Salir", "Exit")}</button>
        </div>
      )}
      <div className="overflow-x-auto rounded-np border border-navy-line bg-navy-card">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="border-b border-navy-line text-left text-xs uppercase tracking-wide text-mist">
            <tr><th className="px-4 py-3">{tx(locale, "Agencia", "Agency")}</th><th className="px-3 py-3">{tx(locale, "Estado", "Status")}</th><th className="px-3 py-3">{tx(locale, "Verificación", "Verification")}</th><th className="px-3 py-3">{tx(locale, "Plan (flag, sin cobro)", "Plan (flag, no billing)")}</th><th className="px-3 py-3 text-right">Listings</th><th className="px-3 py-3 text-right">{tx(locale, "Miembros", "Members")}</th><th className="px-3 py-3 text-right">Leads 30 d</th><th className="px-3 py-3" /></tr>
          </thead>
          <tbody>
            {AGENCIES.map((a, i) => (
              <tr key={a.id} className="border-t border-navy-line">
                <td className="px-4 py-3"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg font-display text-xs font-bold text-navy" style={{ background: a.color }}>{a.initials}</span><div><div className="font-semibold">{a.name}</div><div className="text-xs text-mist">{a.city} · {tx(locale, "desde", "since")} {dateTime(a.createdAt, locale, { month: "short", year: "numeric" })}</div></div></div></td>
                <td className="px-3"><Badge className={a.status === "ACTIVE" ? "bg-[#2F6F4E40] text-[#7FD3A8]" : "bg-[#C9862A33] text-[#F2B866]"}>{a.status}</Badge></td>
                <td className="px-3">{a.verified ? <span className="flex items-center gap-1 text-[#7FD3A8]"><ShieldCheck size={15} /> VERIFIED</span> : <Button size="sm" variant="dark-outline"><Eye size={13} /> {tx(locale, "Revisar RIF", "Review docs")}</Button>}</td>
                <td className="px-3"><select value={plans[a.id] ?? a.plan} onChange={(e) => setPlans({ ...plans, [a.id]: e.target.value })} className="h-8 rounded-md border border-navy-line bg-navy-2 px-2 text-xs"><option>FREE</option><option>PRO</option><option>ENTERPRISE</option></select></td>
                <td className="px-3 text-right">{LISTINGS.filter((l) => l.agencyId === a.id).length}</td>
                <td className="px-3 text-right">{USERS.filter((u) => u.agencyId === a.id).length}</td>
                <td className="px-3 text-right">{[164, 131, 22][i]}</td>
                <td className="px-3"><Button size="sm" variant="dark-outline" onClick={() => setImp(a.id)}><LogIn size={13} /> {tx(locale, "Impersonar", "Impersonate")}</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}

export function PlatformUsers({ locale }: { locale: Locale }) {
  const [q, setQ] = useState("");
  const rows = USERS.filter((u) => (u.name + u.email + u.role).toLowerCase().includes(q.toLowerCase()));
  return (
    <AdminShell locale={locale} area="platform" title={tx(locale, "Usuarios", "Users")}>
      <div className="mb-4 flex items-center gap-3">
        <div className="relative w-80"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-mist" /><input value={q} onChange={(e) => setQ(e.target.value)} className={darkInputCls + " pl-9"} placeholder={tx(locale, "Nombre, email o rol…", "Name, email or role…")} /></div>
        <span className="text-sm text-mist">{rows.length} / 12.480 · {tx(locale, "mostrando cuentas demo", "showing demo accounts")}</span>
      </div>
      <div className="overflow-x-auto rounded-np border border-navy-line bg-navy-card">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="border-b border-navy-line text-left text-xs uppercase tracking-wide text-mist"><tr><th className="px-4 py-3">{tx(locale, "Usuario", "User")}</th><th className="px-3 py-3">{tx(locale, "Rol", "Role")}</th><th className="px-3 py-3">{tx(locale, "Agencia", "Agency")}</th><th className="px-3 py-3">{tx(locale, "Acceso", "Sign-in")}</th><th className="px-3 py-3">{tx(locale, "Actividad", "Activity")}</th><th className="px-3 py-3" /></tr></thead>
          <tbody>
            {rows.map((u, i) => (
              <tr key={u.id} className="border-t border-navy-line">
                <td className="px-4 py-2.5"><div className="flex items-center gap-3"><Avatar initials={u.initials} hue={u.hue} size={32} /><div><div className="font-semibold">{u.name}</div><div className="text-xs text-mist">{u.email}</div></div></div></td>
                <td className="px-3"><code className="rounded bg-white/5 px-1.5 py-0.5 text-xs text-coral">{u.role}</code></td>
                <td className="px-3 text-mist">{agencyById(u.agencyId)?.name ?? "—"}</td>
                <td className="px-3 text-xs text-mist">{i % 3 === 0 ? "Google" : "Email + password"}</td>
                <td className="px-3 text-xs text-mist">{ago(u.lastSeen, locale)}</td>
                <td className="px-3"><div className="flex gap-1"><button className="rounded-md p-1.5 hover:bg-white/5" aria-label="Reset"><KeyRound size={14} /></button><button className="rounded-md p-1.5 text-[#FF8A7A] hover:bg-white/5" aria-label="Suspend"><Ban size={14} /></button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}

export function PlatformModeration({ locale }: { locale: Locale }) {
  const { takedowns, toggleTakedown } = useDemo();
  const listings = LISTINGS.filter((l) => l.status === "ACTIVE" || takedowns.includes(l.id)).slice(0, 10);
  return (
    <AdminShell locale={locale} area="platform" title={tx(locale, "Moderación", "Moderation")}>
      <div className="grid gap-6 xl:grid-cols-[1fr_1.3fr]">
        <div className="rounded-np border border-navy-line bg-navy-card p-5">
          <div className="mb-3 flex items-center gap-2 font-display text-lg font-semibold"><ShieldAlert size={18} className="text-coral" /> {tx(locale, "Reportes", "Reports")} · {MODERATION_QUEUE.length}</div>
          {MODERATION_QUEUE.map((m) => (
            <div key={m.id} className="border-t border-navy-line py-3 first:border-0">
              <div className="flex items-center gap-2">
                <span className={cn("h-2 w-2 rounded-full", m.severity === "high" ? "bg-danger" : m.severity === "medium" ? "bg-warn" : "bg-mist")} />
                <span className="font-semibold">{m.title}</span>
              </div>
              <div className="mt-0.5 text-sm text-mist">{tx(locale, m.reason.es, m.reason.en)} · {m.agency} · {ago(m.at, locale)}</div>
              <div className="mt-2 flex gap-2"><Button size="sm" variant="dark-outline">{tx(locale, "Descartar", "Dismiss")}</Button><Button size="sm"><Ban size={13} /> {tx(locale, "Retirar", "Take down")}</Button></div>
            </div>
          ))}
        </div>
        <div className="rounded-np border border-navy-line bg-navy-card">
          <div className="border-b border-navy-line p-4 font-display text-lg font-semibold">{tx(locale, "Inmuebles publicados", "Live listings")}</div>
          {listings.map((l) => {
            const down = takedowns.includes(l.id);
            return (
              <div key={l.id} data-listing={l.id} className={cn("flex items-center gap-3 border-t border-navy-line px-4 py-2.5 first:border-0", down && "bg-[#B4231814]")}>
                <PropertyArt scene={l.scenes[0]} seed={l.id} photo={listingPhoto(l, 0)} className={cn("h-11 w-14 shrink-0 rounded-md", down && "opacity-40 grayscale")} />
                <div className="min-w-0 flex-1">
                  <div className={cn("truncate font-semibold", down && "text-mist line-through")}>{tx(locale, l.title_es, l.title_en)}</div>
                  <div className="text-xs text-mist">{agencyById(l.agencyId)?.name ?? tx(locale, "Particular", "Private owner")} · {l.zone} · {money(l.priceAmount, locale)}</div>
                </div>
                {down ? <StatusBadge status="WITHDRAWN" locale={locale} /> : <StatusBadge status={l.status} locale={locale} />}
                <Button size="sm" variant={down ? "dark-outline" : "coral"} onClick={() => toggleTakedown(l.id)}>
                  {down ? <><RotateCcw size={13} /> {tx(locale, "Restaurar", "Restore")}</> : <><Ban size={13} /> {tx(locale, "Apagar", "Take down")}</>}
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </AdminShell>
  );
}

export function PlatformAI({ locale }: { locale: Locale }) {
  const { aiProvider, setAi } = useDemo();
  const [fx, setFx] = useState(FX_RATES);
  const [seeded, setSeeded] = useState(false);
  return (
    <AdminShell locale={locale} area="platform" title={tx(locale, "IA · Tasas FX · Seed", "AI · FX rates · Seed")}>
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-np border border-navy-line bg-navy-card p-5">
          <div className="flex items-center gap-2 font-display text-lg font-semibold"><Bot size={18} className="text-coral" /> {tx(locale, "Proveedor de IA", "AI provider")}</div>
          <p className="mt-1 text-sm text-mist">{tx(locale, "Una sola interfaz AIProvider para las 4 funciones. Cambia en caliente.", "One AIProvider interface for all 4 features. Hot-swappable.")}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {([["heuristic", "HeuristicProvider", tx(locale, "Local · sin API key · por defecto", "Local · no API key · default")], ["openai-compatible", "OpenAICompatibleProvider", "OpenAI · Groq · xAI · …"]] as const).map(([k, n, d]) => (
              <button key={k} onClick={() => setAi(k)} className={cn("rounded-np border p-4 text-left", aiProvider === k ? "border-coral bg-[#F26B4D14]" : "border-navy-line hover:bg-white/5")}>
                <div className="flex items-center justify-between"><span className="font-mono text-sm font-semibold">{n}</span>{aiProvider === k && <CheckCircle2 size={16} className="text-coral" />}</div>
                <div className="mt-1 text-xs text-mist">{d}</div>
              </button>
            ))}
          </div>
          {aiProvider === "openai-compatible" && (
            <div className="np-in mt-4 grid gap-3">
              <Field dark label="AI_BASE_URL"><input className={darkInputCls} defaultValue="https://api.groq.com/openai/v1" /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field dark label="AI_MODEL"><input className={darkInputCls} defaultValue="llama-3.3-70b" /></Field>
                <Field dark label="AI_API_KEY"><input className={darkInputCls} defaultValue="••••••••••••" /></Field>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-[#C9862A1a] p-2.5 text-xs text-[#F2B866]"><AlertTriangle size={14} /> {tx(locale, "Si la key falla, la UI vuelve sola a Heuristic. Nunca se rompe.", "If the key fails, the UI falls back to Heuristic. It never breaks.")}</div>
            </div>
          )}
          <div className="mt-5 grid grid-cols-2 gap-2 text-sm">
            {[["estimate()", "PlaceEstimate"], ["searchParse()", tx(locale, "Búsqueda NL", "NL search")], ["writeListing()", tx(locale, "Redactar con IA", "Write with AI")], ["leadScore()", tx(locale, "Score + next action", "Score + next action")]].map(([f, t]) => (
              <div key={f} className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2"><CheckCircle2 size={14} className="text-[#7FD3A8]" /><code className="text-xs text-coral">{f}</code><span className="text-xs text-mist">{t}</span></div>
            ))}
          </div>
        </div>
        <div className="space-y-6">
          <div className="rounded-np border border-navy-line bg-navy-card p-5">
            <div className="flex items-center justify-between"><span className="font-display text-lg font-semibold">{tx(locale, "Tasas de cambio (display)", "FX rates (display)")}</span><Badge tone="dark">fx_rates</Badge></div>
            <table className="mt-3 w-full text-sm">
              <tbody>
                {fx.map((r, i) => (
                  <tr key={r.code} className="border-t border-navy-line first:border-0">
                    <td className="py-2.5 font-semibold">1 USD →</td>
                    <td><input className={darkInputCls + " h-9 w-32"} value={r.perUsd} onChange={(e) => setFx(fx.map((x, j) => (j === i ? { ...x, perUsd: +e.target.value } : x)))} /></td>
                    <td className="font-display">{r.code}</td>
                    <td className="text-xs text-mist">{ago(r.updatedAt, locale)} · {r.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-mist">{tx(locale, "Solo para mostrar conversiones. No hay pagos en v1.", "Display conversions only. No payments in v1.")}</p>
          </div>
          <div className="rounded-np border border-navy-line bg-navy-card p-5">
            <div className="flex items-center gap-2 font-display text-lg font-semibold"><Sprout size={18} className="text-coral" /> Seed tools</div>
            <div className="mt-3 grid grid-cols-3 gap-3 text-center text-sm">
              {[[LISTINGS.length, "listings"], [AGENCIES.length, tx(locale, "agencias", "agencies")], [LEADS.length, "leads"]].map(([n, t]) => (
                <div key={String(t)} className="rounded-lg bg-white/5 p-3"><div className="font-display text-2xl font-semibold">{n}</div><div className="text-xs text-mist">{t}</div></div>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <Button size="sm" variant="dark-outline" onClick={() => setSeeded(true)}><Database size={14} /> npm run db:seed</Button>
              <Button size="sm" variant="dark-outline"><RefreshCw size={14} /> {tx(locale, "Recalcular PlaceEstimate", "Recompute PlaceEstimate")}</Button>
            </div>
            {seeded && <div className="np-in mt-3 rounded-lg bg-[#2F6F4E33] p-2.5 font-mono text-xs text-[#7FD3A8]">✓ seed VE: 48 listings · 3 agencies · 16 users · 12 leads · 8 tours</div>}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}



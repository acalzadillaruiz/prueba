"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Camera, Check, ChevronLeft, ChevronRight, Loader2, X } from "lucide-react";
import type { Locale } from "@/types/domain";
import { AdminShell } from "@/components/layout/AdminShell";
import { Button } from "@/components/ui";
import { api } from "@/lib/api";
import { plural, tx } from "@/lib/i18n";
import { cn } from "@/lib/cn";

export type CalEvent = { id: string; start: string; title: string; sub: string; kind: "tour" | "req" | "done" | "media" | "cancelled"; agentName: string; tourId?: string };

const TZ = -4; // America/Caracas

export function CalendarView({ locale, weekStart, week, events, slots, canEditSlots }: { locale: Locale; weekStart: string; week: number; events: CalEvent[]; slots: { day: number; hours: number[] }[]; canEditSlots: boolean }) {
  const router = useRouter();
  const [mySlots, setMySlots] = useState(slots);
  const [saving, setSaving] = useState(false);
  const [sel, setSel] = useState<CalEvent | null>(null);
  const start = Date.parse(weekStart);
  const days = Array.from({ length: 7 }, (_, i) => new Date(start + i * 864e5));
  const fmt = (d: Date, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale === "es" ? "es-VE" : "en-US", { ...o, timeZone: "America/Caracas" }).format(d);
  const localHour = (ms: number) => new Date(ms + TZ * 3600e3).getUTCHours() + new Date(ms).getUTCMinutes() / 60;
  const dayIdx = (ms: number) => Math.floor((ms - start) / 864e5);
  const weekday = (i: number) => (new Date(start + i * 864e5 + TZ * 3600e3).getUTCDay() + 6) % 7; // Monday = 0
  const todayIdx = dayIdx(Date.now());
  // Visible hours: 08–20 by default, stretched to include any event outside that range (nothing is ever hidden).
  const inWeek = events.filter((e) => {
    const di = dayIdx(Date.parse(e.start));
    return di >= 0 && di <= 6;
  });
  const firstH = Math.min(8, ...inWeek.map((e) => Math.floor(localHour(Date.parse(e.start)))));
  const lastH = Math.max(19, ...inWeek.map((e) => Math.floor(localHour(Date.parse(e.start)))));
  const HOURS = Array.from({ length: lastH - firstH + 1 }, (_, i) => firstH + i);
  // Side-by-side columns for events that share a day and hour.
  const lane = new Map<string, { col: number; cols: number }>();
  const groups = new Map<string, CalEvent[]>();
  for (const e of inWeek) {
    const ms = Date.parse(e.start);
    const k = `${dayIdx(ms)}-${Math.floor(localHour(ms))}`;
    groups.set(k, [...(groups.get(k) ?? []), e]);
  }
  for (const g of groups.values()) g.forEach((e, n) => lane.set(e.id, { col: n, cols: g.length }));

  const [error, setError] = useState<string | null>(null);
  const saveSlots = async (next: typeof mySlots) => {
    const prev = mySlots;
    setMySlots(next);
    setSaving(true);
    setError(null);
    try {
      await api("me/slots", { method: "PUT", json: { days: next } });
    } catch (e) {
      setMySlots(prev); // roll back the optimistic toggle
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };
  const setTour = async (status: "CONFIRMED" | "DONE" | "CANCELLED") => {
    if (!sel?.tourId) return;
    setError(null);
    try {
      await api(`tours/${sel.tourId}`, { method: "PATCH", json: { status } });
      setSel(null);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <AdminShell locale={locale} area="agency" title={tx(locale, "Calendario", "Calendar")}>
      {error && <div className="mb-3 rounded-lg bg-[#B423181A] px-3 py-2 text-sm text-danger" role="alert">{error}</div>}
      <div className="grid gap-6 [&>*]:min-w-0 xl:grid-cols-[1fr_300px]">
        <div className="overflow-x-auto rounded-np border border-navy-line bg-navy-card">
          <div className="min-w-[760px]">
            <div className="flex items-center gap-3 border-b border-navy-line px-4 py-3">
              <Link href={`?w=${week - 1}`} className="rounded-lg p-1.5 hover:bg-white/5" aria-label={tx(locale, "Semana anterior", "Previous week")}><ChevronLeft size={18} /></Link>
              <Link href={`?w=${week + 1}`} className="rounded-lg p-1.5 hover:bg-white/5" aria-label={tx(locale, "Semana siguiente", "Next week")}><ChevronRight size={18} /></Link>
              <span className="font-display text-lg font-semibold inline-block first-letter:uppercase">{fmt(days[0], { day: "numeric", month: "short" })} – {fmt(days[6], { day: "numeric", month: "short", year: "numeric" })}</span>
              {week !== 0 && <Link href="?w=0" className="text-sm text-coral">{tx(locale, "Hoy", "Today")}</Link>}
              <div className="ml-auto flex gap-3 text-xs text-mist">
                <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-coral" /> {tx(locale, "Visita", "Tour")}</span>
                <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm border border-dashed border-gold" /> {tx(locale, "Solicitada", "Requested")}</span>
                <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-[#3E5A6B]" /> {tx(locale, "Fotos", "Media")}</span>
                <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-white/10" /> {tx(locale, "Slot libre", "Open slot")}</span>
              </div>
            </div>
            <div className="grid grid-cols-[56px_repeat(7,1fr)]">
              <div />
              {days.map((d, i) => (
                <div key={i} className={cn("border-l border-navy-line py-2 text-center font-display text-sm first-letter:uppercase", i === todayIdx && "text-coral")}>{fmt(d, { weekday: "short", day: "numeric" })}</div>
              ))}
            </div>
            <div className="relative">
              <div className="grid grid-cols-[56px_repeat(7,1fr)]">
                {HOURS.map((h) => (
                  <div key={h} className="contents">
                    <div className="h-14 border-t border-navy-line pr-2 pt-1 text-right text-[11px] text-mist">{String(h).padStart(2, "0")}:00</div>
                    {days.map((_, i) => {
                      const open = !!mySlots.find((x) => x.day === weekday(i))?.hours.includes(h);
                      return <div key={i} className={cn("h-14 border-l border-t border-navy-line", open && "bg-white/[.04]")} />;
                    })}
                  </div>
                ))}
              </div>
              <div className="pointer-events-none absolute inset-0 ml-[56px]">
                {events.map((e) => {
                  const ms = Date.parse(e.start);
                  const di = dayIdx(ms);
                  const hr = localHour(ms);
                  if (di < 0 || di > 6) return null;
                  const { col, cols } = lane.get(e.id) ?? { col: 0, cols: 1 };
                  return (
                    <button
                      key={e.id}
                      onClick={() => setSel(e)}
                      className={cn(
                        "pointer-events-auto absolute overflow-hidden rounded-md px-2 py-1 text-left text-xs",
                        e.kind === "tour" && "bg-coral-cta text-white",
                        e.kind === "req" && "border border-dashed border-gold bg-[#D4AF771f] text-gold",
                        (e.kind === "done" || e.kind === "cancelled") && "bg-white/10 text-mist line-through",
                        e.kind === "media" && "bg-[#3E5A6B] text-ivory",
                      )}
                      style={{ left: `calc(${(di / 7) * 100}% + ${(col / cols) * (100 / 7)}% + 3px)`, width: `calc(${100 / 7 / cols}% - 6px)`, top: (hr - firstH) * 56 + 3, height: 50 }}
                      title={`${e.title} · ${e.sub}`}
                    >
                      <div className="flex items-center gap-1 font-semibold">{e.kind === "media" && <Camera size={11} />}{e.title}</div>
                      <div className="truncate opacity-80">{e.sub} · {e.agentName.split(" ")[0]}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        <div className="space-y-4">
          {sel && (
            <div className="np-in rounded-np border border-coral/50 bg-navy-card p-4">
              <div className="flex items-start justify-between">
                <div className="font-display text-lg font-semibold">{sel.title}</div>
                <button onClick={() => setSel(null)} aria-label={tx(locale, "Cerrar", "Close")}><X size={16} /></button>
              </div>
              <div className="text-sm first-letter:uppercase text-mist">{fmt(new Date(sel.start), { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}</div>
              <div className="mt-1 text-sm">{sel.sub} · {sel.agentName}</div>
              {sel.tourId && sel.kind !== "done" && sel.kind !== "cancelled" && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {sel.kind === "req" && <Button size="sm" onClick={() => setTour("CONFIRMED")}><Check size={14} /> {tx(locale, "Confirmar", "Confirm")}</Button>}
                  <Button size="sm" variant="dark-outline" onClick={() => setTour("DONE")}>{tx(locale, "Marcar realizada", "Mark done")}</Button>
                  <Button size="sm" variant="dark-ghost" onClick={() => setTour("CANCELLED")}>{tx(locale, "Cancelar", "Cancel")}</Button>
                </div>
              )}
            </div>
          )}
          {canEditSlots && (
            <div className="rounded-np border border-navy-line bg-navy-card p-4">
              <div className="flex items-center justify-between">
                <div className="font-display text-lg font-semibold">{tx(locale, "Mis slots de visita", "My tour slots")}</div>
                {saving && <Loader2 size={14} className="animate-spin text-mist" />}
              </div>
              <p className="text-xs text-mist">{tx(locale, "Los compradores solo ven estos horarios en la ficha.", "Buyers only see these slots on the listing.")}</p>
              <div className="mt-3 space-y-3">
                {mySlots.map((s) => (
                  <div key={s.day}>
                    <div className="mb-1 text-sm font-semibold">{[tx(locale, "Lunes", "Monday"), tx(locale, "Martes", "Tuesday"), tx(locale, "Miércoles", "Wednesday"), tx(locale, "Jueves", "Thursday"), tx(locale, "Viernes", "Friday"), tx(locale, "Sábado", "Saturday"), tx(locale, "Domingo", "Sunday")][s.day]}</div>
                    <div className="flex flex-wrap gap-1">
                      {[9, 10, 11, 14, 15, 16, 17].map((h) => {
                        const on = s.hours.includes(h);
                        return (
                          <button key={h} onClick={() => saveSlots(mySlots.map((x) => (x.day === s.day ? { ...x, hours: on ? x.hours.filter((y) => y !== h) : [...x.hours, h].sort((a, b) => a - b) } : x)))} className={cn("rounded-md px-2 py-1 text-xs font-semibold", on ? "bg-coral-cta text-white" : "bg-white/5 text-mist")}>
                            {h}h
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="rounded-np border border-navy-line bg-navy-card p-4 text-sm">
            <div className="font-display text-lg font-semibold">{tx(locale, "Esta semana", "This week")}</div>
            <div className="mt-2 text-mist">{(() => {
              const t = inWeek.filter((e) => e.kind === "tour" || e.kind === "req").length;
              const m = inWeek.filter((e) => e.kind === "media").length;
              return `${plural(t, locale, ["visita", "visitas"], ["tour", "tours"])} · ${plural(m, locale, ["sesión de fotos", "sesiones de fotos"], ["photo shoot", "photo shoots"])}`;
            })()}</div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Camera, Check, ChevronLeft, ChevronRight, Clock, Loader2, MapPin, User, X } from "lucide-react";
import type { Locale } from "@/types/domain";
import { AdminShell } from "@/components/layout/AdminShell";
import { Button } from "@/components/ui";
import { api } from "@/lib/api";
import { plural, tx } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { Pill, k, tab } from "./kit";

export type CalEvent = { id: string; start: string; title: string; sub: string; kind: "tour" | "req" | "done" | "media" | "cancelled"; agentName: string; tourId?: string; /** Listing title (localized) and its back-office link, when known. */ listing?: string; listingHref?: string };

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
  // Phones: the week grid scrolls sideways and opens on Monday — bring today's column into view on mount.
  const scroller = useRef<HTMLDivElement>(null);
  const todayCol = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const box = scroller.current;
    const col = todayCol.current;
    if (!box || !col || box.scrollWidth <= box.clientWidth) return;
    const left = col.getBoundingClientRect().left - box.getBoundingClientRect().left + box.scrollLeft;
    box.scrollLeft = Math.max(0, left - (box.clientWidth - col.offsetWidth) / 2);
  }, [weekStart]);
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
  const setTour = async (tourId: string, status: TourStatus) => {
    setError(null);
    try {
      await api(`tours/${tourId}`, { method: "PATCH", json: { status } });
      if (sel?.tourId === tourId) setSel(null);
      router.refresh();
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    }
  };
  // Phones: day agenda. Defaults to today in the current week (Monday otherwise); the pick resets when the week changes.
  const defaultDay = todayIdx >= 0 && todayIdx <= 6 ? todayIdx : 0;
  const [pick, setPick] = useState<{ week: string; day: number } | null>(null);
  const day = pick?.week === weekStart ? pick.day : defaultDay;
  const byDay = days.map((_, i) => inWeek.filter((e) => dayIdx(Date.parse(e.start)) === i).sort((a, b) => Date.parse(a.start) - Date.parse(b.start)));
  const time = (iso: string) => fmt(new Date(iso), { hour: "2-digit", minute: "2-digit" });
  const weekNav = (
    <>
      <Link href={`?w=${week - 1}`} className={cn("rounded-full p-1.5 shadow-[inset_0_0_0_1px_#D8CBB7] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,.18)]", k.hover)} aria-label={tx(locale, "Semana anterior", "Previous week")}><ChevronLeft size={18} /></Link>
      <Link href={`?w=${week + 1}`} className={cn("rounded-full p-1.5 shadow-[inset_0_0_0_1px_#D8CBB7] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,.18)]", k.hover)} aria-label={tx(locale, "Semana siguiente", "Next week")}><ChevronRight size={18} /></Link>
      <span className={cn(k.titleSm, "inline-block first-letter:uppercase")}>{fmt(days[0], { day: "numeric", month: "short" })} – {fmt(days[6], { day: "numeric", month: "short", year: "numeric" })}</span>
      {week !== 0 && <Link href="?w=0" className={cn("text-sm", k.link)}>{tx(locale, "Hoy", "Today")}</Link>}
    </>
  );

  return (
    <AdminShell locale={locale} area="agency" title={tx(locale, "Calendario", "Calendar")}>
      {error && <div className={cn("mb-3", k.err)} role="alert">{error}</div>}
      <div className="grid gap-6 [&>*]:min-w-0 xl:grid-cols-[1fr_300px]">
        {/* Phones: agenda for one day with a horizontal day picker (the week grid needs ~760 px). */}
        <section className={cn("md:hidden", k.card)} aria-label={tx(locale, "Agenda del día", "Day agenda")}>
          <div className={cn("flex flex-wrap items-center gap-2.5 border-b px-4 py-3.5", k.line)}>{weekNav}</div>
          <div className="no-scrollbar flex snap-x gap-1.5 overflow-x-auto px-3 py-3" role="group" aria-label={tx(locale, "Elige un día", "Pick a day")}>
            {days.map((d, i) => {
              const on = i === day;
              const count = byDay[i].filter((e) => e.kind !== "cancelled").length;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPick({ week: weekStart, day: i })}
                  aria-pressed={on}
                  aria-label={`${fmt(d, { weekday: "long", day: "numeric", month: "long" })}${i === todayIdx ? tx(locale, " (hoy)", " (today)") : ""}: ${plural(count, locale, ["cita", "citas"], ["appointment", "appointments"])}`}
                  className={cn(
                    "flex min-w-[48px] flex-1 shrink-0 snap-start flex-col items-center gap-0.5 rounded-2xl px-1.5 py-2 transition-colors duration-np",
                    on ? "bg-navy text-ivory dark:bg-ivory dark:text-navy" : i === todayIdx ? "bg-[#E6DDD2] text-navy dark:bg-white/10 dark:text-ivory" : cn("text-navy dark:text-ivory", k.hover),
                  )}
                >
                  <span className={cn("text-[11px] font-semibold uppercase tracking-[.08em]", on ? "opacity-80" : k.muted)}>{fmt(d, { weekday: "short" }).replace(".", "")}</span>
                  <span className="font-display text-[18px] font-semibold leading-none [font-feature-settings:'lnum']">{fmt(d, { day: "numeric" })}</span>
                  <span aria-hidden className={cn("mt-0.5 h-1.5 w-1.5 rounded-full", count > 0 ? (on ? "bg-[#D4B98C]" : "bg-gold-text dark:bg-[#D4B98C]") : "bg-transparent")} />
                </button>
              );
            })}
          </div>
          <div className={cn("border-t px-4 pb-4 pt-3", k.line)}>
            <h2 className={cn(k.label, "first-letter:uppercase")}>{fmt(days[day], { weekday: "long", day: "numeric", month: "long" })}</h2>
            {byDay[day].length === 0 ? (
              <p className={cn("py-8 text-center text-sm", k.muted)}>{tx(locale, "No tienes visitas este día. Elige otro en la barra de arriba.", "No tours this day. Pick another one above.")}</p>
            ) : (
              <ol className="mt-2 space-y-2.5">
                {byDay[day].map((e) => (
                  <li key={e.id} className={cn("rounded-2xl border p-3.5", k.line, e.kind === "req" && "border-dashed border-navy/40 dark:border-ivory/30", (e.kind === "done" || e.kind === "cancelled") && "opacity-75")}>
                    <div className="flex items-start gap-3">
                      <div className={cn("flex w-14 shrink-0 flex-col items-center rounded-xl py-1.5", e.kind === "tour" ? "bg-navy text-ivory dark:bg-ivory dark:text-navy" : e.kind === "media" ? "bg-egeo/70 text-[#3D3530] dark:bg-egeo/25 dark:text-[#EEE7DE]" : "bg-[#F1ECE3] text-navy dark:bg-white/[.06] dark:text-ivory")}>
                        <Clock size={12} aria-hidden className="opacity-70" />
                        <time dateTime={e.start} className="mt-0.5 font-display text-[15px] font-semibold leading-none [font-feature-settings:'lnum','tnum']">{time(e.start)}</time>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className={cn("font-semibold", (e.kind === "done" || e.kind === "cancelled") && "line-through")}>{e.kind === "media" && <Camera size={13} className="mr-1 inline" aria-hidden />}{e.title}</span>
                          <KindPill kind={e.kind} locale={locale} />
                        </div>
                        <div className={cn("mt-1 flex items-start gap-1.5 text-[13px]", k.muted)}>
                          <MapPin size={13} className="mt-[3px] shrink-0" aria-hidden />
                          <span className="min-w-0">{e.listing ? e.listingHref ? <Link href={e.listingHref} className={k.link}>{e.listing}</Link> : e.listing : null}{e.listing ? " · " : ""}{e.sub}</span>
                        </div>
                        <div className={cn("mt-0.5 flex items-center gap-1.5 text-[13px]", k.muted)}><User size={13} className="shrink-0" aria-hidden /> {e.agentName}</div>
                      </div>
                    </div>
                    {e.tourId && e.kind !== "done" && e.kind !== "cancelled" && <TourActions locale={locale} ev={e} onSet={setTour} className="mt-3" />}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>
        <div ref={scroller} className={cn("hidden overflow-x-auto md:block", k.card)}>
          <div className="min-w-[760px]">
            <div className={cn("flex flex-wrap items-center gap-3 border-b px-5 py-4", k.line)}>
              {weekNav}
              <div className={cn("ml-auto flex gap-3 text-xs", k.muted)}>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-navy dark:bg-ivory" /> {tx(locale, "Visita", "Tour")}</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm border border-dashed border-navy/60 bg-[#E6DDD2] dark:border-ivory/60 dark:bg-white/10" /> {tx(locale, "Solicitada", "Requested")}</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-egeo" /> {tx(locale, "Fotos", "Media")}</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[#F3EEE4] ring-1 ring-[#E4DCCD] dark:bg-white/[.06] dark:ring-white/10" /> {tx(locale, "Slot libre", "Open slot")}</span>
              </div>
            </div>
            <div className="grid grid-cols-[56px_repeat(7,1fr)]">
              <div />
              {days.map((d, i) => (
                <div key={i} ref={i === todayIdx ? todayCol : undefined} className={cn("border-l py-2.5 text-center font-display text-[13px] font-medium first-letter:uppercase", k.line, i === todayIdx ? "bg-[#E6DDD2] font-semibold text-navy dark:bg-white/10 dark:text-ivory" : k.muted)}>{fmt(d, { weekday: "short", day: "numeric" })}</div>
              ))}
            </div>
            <div className="relative">
              <div className="grid grid-cols-[56px_repeat(7,1fr)]">
                {HOURS.map((h) => (
                  <div key={h} className="contents">
                    <div className={cn("h-14 border-t pr-2 pt-1 text-right text-[11px]", k.line, k.muted)}>{String(h).padStart(2, "0")}:00</div>
                    {days.map((_, i) => {
                      const open = !!mySlots.find((x) => x.day === weekday(i))?.hours.includes(h);
                      return <div key={i} className={cn("h-14 border-l border-t", k.line, open && "bg-[#F6F2EA] dark:bg-white/[.04]")} />;
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
                        "pointer-events-auto absolute overflow-hidden rounded-lg px-2 py-1 text-left text-xs",
                        e.kind === "tour" && "bg-navy text-ivory dark:bg-ivory dark:text-navy",
                        e.kind === "req" && "border border-dashed border-navy/60 bg-[#E6DDD2] text-navy dark:border-ivory/50 dark:bg-white/10 dark:text-ivory",
                        (e.kind === "done" || e.kind === "cancelled") && "bg-[#F1ECE3] text-muted line-through dark:bg-white/[.06] dark:text-mist",
                        e.kind === "media" && "bg-egeo/70 text-[#3D3530] dark:bg-egeo/25 dark:text-[#EEE7DE]",
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
            <div className={cn("np-in p-5 shadow-[inset_0_0_0_2px_#1E1A18] dark:shadow-[inset_0_0_0_2px_#C9A574]", k.card)}>
              <div className="flex items-start justify-between">
                <div className={k.titleSm}>{sel.title}</div>
                <button onClick={() => setSel(null)} className={cn("rounded-full p-1", k.hover)} aria-label={tx(locale, "Cerrar", "Close")}><X size={16} /></button>
              </div>
              <div className={cn("text-sm first-letter:uppercase", k.muted)}>{fmt(new Date(sel.start), { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}</div>
              <div className="mt-1 text-sm">{sel.sub} · {sel.agentName}</div>
              {sel.listing && <div className={cn("mt-1 text-sm", k.muted)}>{sel.listingHref ? <Link href={sel.listingHref} className={k.link}>{sel.listing}</Link> : sel.listing}</div>}
              {sel.tourId && sel.kind !== "done" && sel.kind !== "cancelled" && <TourActions key={sel.id} locale={locale} ev={sel} onSet={setTour} className="mt-3" />}
            </div>
          )}
          {canEditSlots && (
            <div className={cn(k.card, "p-5")}>
              <div className="flex items-center justify-between">
                <div className={k.titleSm}>{tx(locale, "Mis slots de visita", "My tour slots")}</div>
                {saving && <Loader2 size={14} className={cn("animate-spin", k.muted)} />}
              </div>
              <p className={cn("mt-1 text-xs", k.muted)}>{tx(locale, "Los compradores solo ven estos horarios en la ficha.", "Buyers only see these slots on the listing.")}</p>
              <div className="mt-3 space-y-3">
                {mySlots.map((s) => (
                  <div key={s.day}>
                    <div className="mb-1 text-sm font-semibold">{[tx(locale, "Lunes", "Monday"), tx(locale, "Martes", "Tuesday"), tx(locale, "Miércoles", "Wednesday"), tx(locale, "Jueves", "Thursday"), tx(locale, "Viernes", "Friday"), tx(locale, "Sábado", "Saturday"), tx(locale, "Domingo", "Sunday")][s.day]}</div>
                    <div className="flex flex-wrap gap-1">
                      {[9, 10, 11, 14, 15, 16, 17].map((h) => {
                        const on = s.hours.includes(h);
                        return (
                          <button key={h} onClick={() => saveSlots(mySlots.map((x) => (x.day === s.day ? { ...x, hours: on ? x.hours.filter((y) => y !== h) : [...x.hours, h].sort((a, b) => a - b) } : x)))} aria-pressed={on} className={cn(tab(on), "px-2.5 py-1 text-xs")}>
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
          <div className={cn(k.card, "p-5 text-sm")}>
            <div className={k.titleSm}>{tx(locale, "Esta semana", "This week")}</div>
            <div className={cn("mt-2", k.muted)}>{(() => {
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

type TourStatus = "CONFIRMED" | "DONE" | "CANCELLED";

function KindPill({ kind, locale }: { kind: CalEvent["kind"]; locale: Locale }) {
  if (kind === "tour") return <Pill tone="egeo">{tx(locale, "Confirmada", "Confirmed")}</Pill>;
  if (kind === "req") return <Pill tone="warn">{tx(locale, "Solicitada", "Requested")}</Pill>;
  if (kind === "done") return <Pill tone="ok">{tx(locale, "Realizada", "Done")}</Pill>;
  if (kind === "cancelled") return <Pill tone="muted">{tx(locale, "Cancelada", "Cancelled")}</Pill>;
  return <Pill tone="neutral">{tx(locale, "Fotos", "Media")}</Pill>;
}

/** Confirm / mark done / cancel a tour. Cancelling asks first, inline (no browser dialog). */
function TourActions({ locale, ev, onSet, className }: { locale: Locale; ev: CalEvent; onSet: (tourId: string, status: TourStatus) => Promise<boolean>; className?: string }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState<TourStatus | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const promptId = useId();
  useEffect(() => {
    if (confirming) box.current?.querySelector<HTMLElement>("[data-keep]")?.focus();
  }, [confirming]);
  if (!ev.tourId) return null;
  const tourId = ev.tourId;
  const run = async (status: TourStatus) => {
    setBusy(status);
    const ok = await onSet(tourId, status);
    setBusy(null);
    if (ok) setConfirming(false);
  };
  const back = () => {
    setConfirming(false);
    requestAnimationFrame(() => box.current?.querySelector<HTMLElement>("[data-cancel]")?.focus());
  };
  if (confirming)
    return (
      <div
        ref={box}
        role="group"
        aria-labelledby={promptId}
        className={cn("rounded-xl border border-danger/25 bg-[#B3261E0A] p-3 dark:border-[#F3A493]/30 dark:bg-[#B3261E1F]", className)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.stopPropagation();
            back();
          }
        }}
      >
        <p id={promptId} className="text-sm text-navy dark:text-ivory">
          {tx(locale, `¿Cancelar la visita con ${ev.title}? Ya no aparecerá como pendiente y no se puede reactivar desde aquí.`, `Cancel the tour with ${ev.title}? It will no longer show as pending and can't be reactivated from here.`)}
        </p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          <Button size="sm" variant="ghost" className={cn(k.ghost, "min-h-10 text-danger dark:text-[#F3A493]")} disabled={busy !== null} onClick={() => run("CANCELLED")}>
            {busy === "CANCELLED" ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <X size={14} aria-hidden />} {tx(locale, "Sí, cancelar visita", "Yes, cancel tour")}
          </Button>
          <Button data-keep size="sm" variant="outline" className={cn(k.outline, "min-h-10")} disabled={busy !== null} onClick={back}>
            {tx(locale, "No, mantenerla", "No, keep it")}
          </Button>
        </div>
      </div>
    );
  return (
    <div ref={box} className={cn("flex flex-wrap gap-2", className)}>
      {ev.kind === "req" && (
        <Button size="sm" className={cn(k.primary, "min-h-10")} disabled={busy !== null} onClick={() => run("CONFIRMED")}>
          {busy === "CONFIRMED" ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <Check size={14} />} {tx(locale, "Confirmar", "Confirm")}
        </Button>
      )}
      <Button size="sm" variant="outline" className={cn(k.outline, "min-h-10")} disabled={busy !== null} onClick={() => run("DONE")}>
        {busy === "DONE" && <Loader2 size={14} className="animate-spin" aria-hidden />} {tx(locale, "Marcar realizada", "Mark done")}
      </Button>
      <Button data-cancel size="sm" variant="ghost" className={cn(k.ghost, "min-h-10")} disabled={busy !== null} onClick={() => setConfirming(true)}>
        {tx(locale, "Cancelar", "Cancel")}
      </Button>
    </div>
  );
}

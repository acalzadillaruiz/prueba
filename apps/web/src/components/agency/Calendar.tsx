"use client";

import { useState } from "react";
import { Camera, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import type { Locale } from "@/types/domain";
import { AdminShell } from "@/components/layout/AdminShell";
import { Button } from "@/components/ui";
import { listingById } from "@/mock/listings";
import { AGENT_SLOTS, MEDIA_JOBS, TOURS } from "@/mock/ops";
import { userById } from "@/mock/people";
import { tx } from "@/lib/i18n";
import { cn } from "@/lib/cn";

const WEEK0 = Date.parse("2026-09-26T00:00:00-04:00"); // Saturday
const HOURS = Array.from({ length: 12 }, (_, i) => 8 + i);

export function CalendarView({ locale }: { locale: Locale }) {
  const [slots, setSlots] = useState(AGENT_SLOTS);
  const days = Array.from({ length: 7 }, (_, i) => new Date(WEEK0 + i * 864e5));
  const events = [
    ...TOURS.map((t) => ({ id: t.id, start: Date.parse(t.start), title: t.seekerName, sub: listingById(t.listingId)!.zone, kind: t.status === "DONE" ? "done" : t.status === "REQUESTED" ? "req" : "tour", agent: t.agentId })),
    ...MEDIA_JOBS.map((m) => ({ id: m.id, start: Date.parse(m.date), title: tx(locale, "Sesión de fotos", "Photo shoot"), sub: listingById(m.listingId)!.zone, kind: "media", agent: m.photographerId })),
  ];
  const fmt = (d: Date) => new Intl.DateTimeFormat(locale === "es" ? "es-VE" : "en-US", { weekday: "short", day: "numeric", timeZone: "America/Caracas" }).format(d);
  const localHour = (ms: number) => new Date(ms - 4 * 3600e3).getUTCHours() + new Date(ms).getUTCMinutes() / 60;
  const dayIdx = (ms: number) => Math.floor((ms - WEEK0) / 864e5);
  const slotDay = (i: number) => (i + 5) % 7; // Mon=2 in our week starting Saturday → AGENT_SLOTS day 0 = Monday
  return (
    <AdminShell locale={locale} area="agency" title={tx(locale, "Calendario", "Calendar")} actions={<Button size="sm"><Plus size={15} /> {tx(locale, "Nueva visita", "New tour")}</Button>}>
      <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
        <div className="overflow-hidden rounded-np border border-navy-line bg-navy-card">
          <div className="flex items-center gap-3 border-b border-navy-line px-4 py-3">
            <button className="rounded-lg p-1.5 hover:bg-white/5"><ChevronLeft size={18} /></button>
            <button className="rounded-lg p-1.5 hover:bg-white/5"><ChevronRight size={18} /></button>
            <span className="font-display text-lg font-semibold">26 sept – 2 oct 2026</span>
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
              <div key={i} className={cn("border-l border-navy-line py-2 text-center font-display text-sm capitalize", i === 0 && "text-coral")}>{fmt(d)}</div>
            ))}
            {HOURS.map((h) => (
              <div key={h} className="contents">
                <div className="h-14 border-t border-navy-line pr-2 pt-1 text-right text-[11px] text-mist">{String(h).padStart(2, "0")}:00</div>
                {days.map((_, i) => {
                  const s = slots.find((x) => x.day === slotDay(i));
                  const open = !!s?.hours.includes(h);
                  return <div key={i} className={cn("relative h-14 border-l border-t border-navy-line", open && "bg-white/[.04]")} />;
                })}
              </div>
            ))}
          </div>
          <div className="relative -mt-[672px] ml-[56px] h-[672px]">
            {events.map((e) => {
              const di = dayIdx(e.start);
              const hr = localHour(e.start);
              if (di < 0 || di > 6 || hr < 8 || hr > 19) return null;
              return (
                <div
                  key={e.id}
                  className={cn(
                    "absolute rounded-md px-2 py-1 text-xs",
                    e.kind === "tour" && "bg-coral text-white",
                    e.kind === "req" && "border border-dashed border-gold bg-[#D4AF771f] text-gold",
                    e.kind === "done" && "bg-white/10 text-mist line-through",
                    e.kind === "media" && "bg-[#3E5A6B] text-ivory",
                  )}
                  style={{ left: `calc(${(di / 7) * 100}% + 3px)`, width: `calc(${100 / 7}% - 6px)`, top: (hr - 8) * 56 + 3, height: 50 }}
                >
                  <div className="flex items-center gap-1 font-semibold">{e.kind === "media" && <Camera size={11} />}{e.title}</div>
                  <div className="truncate opacity-80">{e.sub} · {userById(e.agent)?.name.split(" ")[0]}</div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-np border border-navy-line bg-navy-card p-4">
            <div className="font-display text-lg font-semibold">{tx(locale, "Mis slots de visita", "My tour slots")}</div>
            <p className="text-xs text-mist">{tx(locale, "Los compradores solo ven estos horarios en la ficha.", "Buyers only see these slots on the listing.")}</p>
            <div className="mt-3 space-y-3">
              {slots.map((s) => (
                <div key={s.day}>
                  <div className="mb-1 text-sm font-semibold">{[tx(locale, "Lunes", "Monday"), tx(locale, "Martes", "Tuesday"), tx(locale, "Miércoles", "Wednesday"), tx(locale, "Jueves", "Thursday"), tx(locale, "Viernes", "Friday")][s.day]}</div>
                  <div className="flex flex-wrap gap-1">
                    {[9, 10, 11, 14, 15, 16, 17].map((h) => {
                      const on = s.hours.includes(h);
                      return (
                        <button key={h} onClick={() => setSlots(slots.map((x) => (x.day === s.day ? { ...x, hours: on ? x.hours.filter((y) => y !== h) : [...x.hours, h].sort((a, b) => a - b) } : x)))} className={cn("rounded-md px-2 py-1 text-xs font-semibold", on ? "bg-coral text-white" : "bg-white/5 text-mist")}>
                          {h}h
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-np border border-navy-line bg-navy-card p-4 text-sm">
            <div className="font-display text-lg font-semibold">{tx(locale, "Hoy", "Today")}</div>
            <div className="mt-2 text-mist">{tx(locale, "16:00 · Daniel Ortega · Torre Alba (Altamira)", "4 pm · Daniel Ortega · Torre Alba (Altamira)")}</div>
            <div className="mt-1 text-mist">{tx(locale, "17:00 · Sesión de fotos · Los Palos Grandes", "5 pm · Photo shoot · Los Palos Grandes")}</div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

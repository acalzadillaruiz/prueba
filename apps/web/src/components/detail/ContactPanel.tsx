"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarCheck, CheckCircle2, MessageSquare, Phone, ShieldCheck, Video } from "lucide-react";
import type { Listing, Locale } from "@/types/domain";
import { Avatar, Button, inputCls } from "@/components/ui";
import { useDemo } from "@/lib/store";
import { agencyById, userById } from "@/mock/people";
import { AGENT_SLOTS, TOURS } from "@/mock/ops";
import { tx } from "@/lib/i18n";
import { cn } from "@/lib/cn";

const DAY0 = new Date("2026-09-28T00:00:00-04:00"); // next Monday from NOW

export function ContactPanel({ l, locale, dark }: { l: Listing; locale: Locale; dark?: boolean }) {
  const { addLead, userId } = useDemo();
  const me = userById(userId ?? undefined);
  const agent = userById(l.agentId) ?? userById(l.ownerUserId);
  const agency = agencyById(l.agencyId);
  const [mode, setMode] = useState<"tour" | "msg">("tour");
  const [day, setDay] = useState(0);
  const [hour, setHour] = useState<number | null>(11);
  const [virtual, setVirtual] = useState(false);
  const [name, setName] = useState(me?.role === "SEEKER" ? me.name : "");
  const [email, setEmail] = useState(me?.role === "SEEKER" ? me.email : "");
  const [phone, setPhone] = useState(me?.phone ?? "");
  const [msg, setMsg] = useState(tx(locale, "Hola, me interesa este inmueble. ¿Sigue disponible?", "Hi, I’m interested in this property. Is it still available?"));
  const [done, setDone] = useState<string | null>(null);

  const dayDate = (d: number) => new Date(DAY0.getTime() + d * 864e5);
  const fmtDay = (d: number) =>
    new Intl.DateTimeFormat(locale === "es" ? "es-VE" : "en-US", { weekday: "short", day: "numeric", timeZone: "America/Caracas" }).format(dayDate(d));
  const taken = (d: number, h: number) =>
    TOURS.some((t) => t.agentId === l.agentId && Math.abs(Date.parse(t.start) - (dayDate(d).getTime() + h * 3600e3)) < 3600e3);

  const submit = () => {
    const when = hour !== null ? `${fmtDay(day)} · ${String(hour).padStart(2, "0")}:00` : "";
    addLead({
      name: name || "Daniel Ortega",
      email: email || "seeker@gmail.com",
      phone,
      listingId: l.id,
      agentId: l.agentId ?? "u-agent",
      agencyId: l.agencyId ?? "ag-andes",
      source: mode === "tour" ? "TOUR_REQUEST" : "LISTING_FORM",
      budget: Math.round(l.priceAmount * 1.02),
      message: mode === "tour" ? `${tx(locale, "Solicitud de visita", "Tour request")}: ${when}${virtual ? " (virtual)" : ""}. ${msg}` : msg,
      toursRequested: mode === "tour" ? 1 : 0,
    });
    setDone(when);
  };

  const box = dark ? "border-navy-line bg-navy-card text-ivory" : "border-line bg-white";
  const muted = dark ? "text-mist" : "text-ink/55";

  if (done !== null)
    return (
      <div className={cn("np-in rounded-np border p-5", box)}>
        <CheckCircle2 className="text-ok" size={30} />
        <div className="mt-3 font-display text-xl font-semibold">{mode === "tour" ? tx(locale, "Visita solicitada", "Tour requested") : tx(locale, "Mensaje enviado", "Message sent")}</div>
        {mode === "tour" && <div className="mt-1 font-display text-coral">{done}</div>}
        <p className={cn("mt-2 text-sm", muted)}>
          {tx(locale, `${agent?.name.split(" ")[0] ?? "El agente"} suele responder en menos de 15 minutos. Te enviamos la confirmación a ${email || "tu correo"}.`, `${agent?.name.split(" ")[0] ?? "The agent"} usually replies within 15 minutes. Confirmation sent to ${email || "your email"}.`)}
        </p>
        <div className="mt-4 flex gap-2">
          <Button href={`/${locale}/app`} size="sm">{tx(locale, "Ver en mi Hub", "Open my Hub")}</Button>
          <Button size="sm" variant={dark ? "dark-outline" : "outline"} onClick={() => setDone(null)}>{tx(locale, "Nueva solicitud", "New request")}</Button>
        </div>
      </div>
    );

  return (
    <div className={cn("rounded-np border shadow-np", box)}>
      {agent && (
        <div className={cn("flex items-center gap-3 border-b p-4", dark ? "border-navy-line" : "border-line")}>
          <Avatar initials={agent.initials} hue={agent.hue} size={46} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 font-display font-semibold">
              {agent.name}
              {agent.verified && <ShieldCheck size={15} className="text-ok" aria-label="Verified" />}
            </div>
            <div className={cn("text-sm", muted)}>{agency ? agency.name : tx(locale, "Propietario · publica directo", "Owner · listing directly")}</div>
            {agent.verified && <span className="mt-1 inline-block rounded-full bg-[#2F6F4E1F] px-2 py-0.5 text-[11px] font-bold text-ok">VERIFIED</span>}
          </div>
          {agency && (
            <a className={cn("rounded-full border p-2", dark ? "border-navy-line" : "border-line")} aria-label="Phone" title={agency.whatsapp}>
              <Phone size={16} />
            </a>
          )}
        </div>
      )}
      <div className="p-4">
        <div className={cn("mb-4 grid grid-cols-2 rounded-full p-1", dark ? "bg-white/5" : "bg-ivory")}>
          <button onClick={() => setMode("tour")} className={cn("flex items-center justify-center gap-1.5 rounded-full py-1.5 font-display text-sm", mode === "tour" && (dark ? "bg-ivory text-navy" : "bg-navy text-ivory"))}>
            <CalendarCheck size={15} /> {tx(locale, "Pedir visita", "Book a tour")}
          </button>
          <button onClick={() => setMode("msg")} className={cn("flex items-center justify-center gap-1.5 rounded-full py-1.5 font-display text-sm", mode === "msg" && (dark ? "bg-ivory text-navy" : "bg-navy text-ivory"))}>
            <MessageSquare size={15} /> {tx(locale, "Mensaje", "Message")}
          </button>
        </div>
        {mode === "tour" && (
          <>
            <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              {AGENT_SLOTS.map((s) => (
                <button
                  key={s.day}
                  onClick={() => {
                    setDay(s.day);
                    setHour(null);
                  }}
                  className={cn("min-w-[62px] rounded-xl border px-2 py-2 text-center font-display text-sm capitalize", day === s.day ? "border-coral bg-coral text-white" : dark ? "border-navy-line" : "border-line")}
                >
                  {fmtDay(s.day)}
                </button>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {AGENT_SLOTS.find((s) => s.day === day)!.hours.map((h) => {
                const busy = taken(day, h);
                return (
                  <button
                    key={h}
                    disabled={busy}
                    onClick={() => setHour(h)}
                    className={cn(
                      "rounded-lg border py-1.5 text-sm font-semibold disabled:cursor-not-allowed disabled:line-through disabled:opacity-40",
                      hour === h ? "border-navy bg-navy text-ivory" : dark ? "border-navy-line" : "border-line",
                    )}
                  >
                    {String(h).padStart(2, "0")}:00
                  </button>
                );
              })}
            </div>
            <label className={cn("mt-3 flex items-center gap-2 text-sm", muted)}>
              <input type="checkbox" checked={virtual} onChange={(e) => setVirtual(e.target.checked)} className="accent-[#F26B4D]" />
              <Video size={14} /> {tx(locale, "Prefiero visita por videollamada", "I prefer a video tour")}
            </label>
          </>
        )}
        <div className="mt-3 space-y-2">
          <input className={cn(inputCls, "h-10", dark && "border-navy-line bg-navy-2 text-ivory")} placeholder={tx(locale, "Nombre", "Name")} value={name} onChange={(e) => setName(e.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            <input className={cn(inputCls, "h-10", dark && "border-navy-line bg-navy-2 text-ivory")} placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input className={cn(inputCls, "h-10", dark && "border-navy-line bg-navy-2 text-ivory")} placeholder={tx(locale, "Teléfono", "Phone")} value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <textarea className={cn(inputCls, "h-20 py-2", dark && "border-navy-line bg-navy-2 text-ivory")} value={msg} onChange={(e) => setMsg(e.target.value)} />
        </div>
        <Button className="mt-3 w-full" size="lg" onClick={submit} disabled={mode === "tour" && hour === null} variant={dark ? "gold" : "coral"}>
          {mode === "tour" ? tx(locale, "Solicitar visita", "Request tour") : tx(locale, "Enviar mensaje", "Send message")}
        </Button>
        <p className={cn("mt-2 text-center text-xs", muted)}>{tx(locale, "Horarios reales de la agenda del agente. Sin costo.", "Real slots from the agent’s calendar. Free.")}</p>
      </div>
    </div>
  );
}

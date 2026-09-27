"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { leadSchema } from "@newplace/config";
import { fieldError } from "@/lib/form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarCheck, CheckCircle2, Loader2, MessageSquare, Phone, ShieldCheck, Video } from "lucide-react";
import type { Listing, Locale } from "@/types/domain";
import { Avatar, Button, inputCls } from "@/components/ui";
import { useApp } from "@/lib/store";
import { api, ApiClientError } from "@/lib/api";
import { tx } from "@/lib/i18n";
import { cn } from "@/lib/cn";

type Slots = { agentId: string | null; days: { date: string; hours: { hour: number; iso: string; available: boolean }[] }[] };

export function ContactPanel({ l, locale, dark }: { l: Listing; locale: Locale; dark?: boolean }) {
  const { user } = useApp();
  const qc = useQueryClient();
  const agent = l.agent;
  const agency = l.agency;
  // Tours only while the property is available and has an agent calendar.
  const bookable = !!l.agentId && ["ACTIVE", "COMING_SOON", "UNDER_OFFER"].includes(l.status);
  const slots = useQuery({ queryKey: ["slots", l.id], queryFn: () => api<Slots>(`listings/${l.id}/slots`), enabled: bookable, refetchInterval: 15_000 });
  const days = slots.data?.days ?? [];
  const [mode, setMode] = useState<"tour" | "msg">(bookable ? "tour" : "msg");
  const [day, setDay] = useState(0);
  const [iso, setIso] = useState<string | null>(null);
  const [virtual, setVirtual] = useState(false);
  type F = { name: string; email: string; phone?: string; message: string };
  const form = useForm<F>({
    resolver: zodResolver(leadSchema.pick({ name: true, email: true, phone: true, message: true })),
    defaultValues: { name: user?.name ?? "", email: user?.email ?? "", phone: user?.phone ?? "", message: tx(locale, "Hola, me interesa este inmueble. ¿Sigue disponible?", "Hi, I’m interested in this property. Is it still available?") },
    mode: "onTouched",
  });
  const errs = form.formState.errors;
  // Every invalid field at once (not only the first), in the order they appear in the form.
  const fieldErrors = (
    [
      ["name", errs.name && `${tx(locale, "Nombre", "Name")}: ${fieldError(errs.name, locale, "text")}`],
      ["email", errs.email && fieldError(errs.email, locale, "email")],
      ["phone", errs.phone && tx(locale, "El teléfono admite hasta 30 caracteres.", "Phone allows up to 30 characters.")],
      ["message", errs.message && `${tx(locale, "Mensaje", "Message")}: ${fieldError(errs.message, locale, "text")}`],
    ] as [string, string | false | undefined][]
  ).filter((e): e is [string, string] => !!e[1]);
  const email = form.watch("email");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const fmt = (d: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale === "es" ? "es-VE" : "en-US", { ...o, timeZone: "America/Caracas" }).format(new Date(d)).replace(/[  ]/g, " ");
  const firstAvailable = days[day]?.hours.find((h) => h.available)?.iso ?? null;
  const chosen = iso ?? firstAvailable;

  const submit = async ({ name, email, phone, message: msg }: F) => {
    setErr(null);
    setBusy(true);
    try {
      await api("leads", {
        method: "POST",
        json: { listingId: l.id, name, email, phone, message: msg, budget: undefined, ...(mode === "tour" && chosen ? { tourStart: chosen, virtual } : {}) },
      });
      setDone(mode === "tour" && chosen ? fmt(chosen, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }) : "");
      qc.invalidateQueries({ queryKey: ["slots", l.id] });
    } catch (e) {
      const conflict = e instanceof ApiClientError && e.code === "CONFLICT";
      if (conflict) setIso(null);
      setErr(conflict ? tx(locale, "Ese horario acaba de ocuparse. Elige otro.", "That slot was just taken. Pick another.") : (e as Error).message);
      qc.invalidateQueries({ queryKey: ["slots", l.id] });
    } finally {
      setBusy(false);
    }
  };

  const box = dark ? "border-navy-line bg-navy-card text-ivory" : "border-line bg-white";
  const muted = dark ? "text-mist" : "text-ink/65";
  const field = cn(inputCls, "h-10", dark && "border-navy-line bg-navy-2 text-ivory");

  if (done !== null)
    return (
      <div className={cn("np-in rounded-np border p-5", box)} data-testid="lead-done">
        <CheckCircle2 className="text-ok" size={30} />
        <div className="mt-3 font-display text-xl font-semibold">{mode === "tour" && done ? tx(locale, "Visita solicitada", "Tour requested") : tx(locale, "Mensaje enviado", "Message sent")}</div>
        {done && <div className="mt-1 font-display capitalize text-coral">{done}</div>}
        <p className={cn("mt-2 text-sm", muted)}>
          {tx(locale, `${agent?.name.split(" ")[0] ?? "El agente"} suele responder en menos de 15 minutos. Te enviamos la confirmación a ${email}.`, `${agent?.name.split(" ")[0] ?? "The agent"} usually replies within 15 minutes. Confirmation sent to ${email}.`)}
        </p>
        <div className="mt-4 flex gap-2">
          {user && <Button href={`/${locale}/app`} size="sm">{tx(locale, "Ver en mi Hub", "Open my Hub")}</Button>}
          <Button size="sm" variant={dark ? "dark-outline" : "outline"} onClick={() => { setDone(null); setIso(null); }}>{tx(locale, "Nueva solicitud", "New request")}</Button>
        </div>
      </div>
    );

  return (
    <div className={cn("rounded-np border shadow-np", box)}>
      {agent && (
        <div className={cn("flex items-center gap-3 border-b p-4", dark ? "border-navy-line" : "border-line")}>
          <Avatar initials={agent.name.split(" ").map((p) => p[0]).slice(0, 2).join("")} hue={agent.hue} size={46} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 font-display font-semibold">
              {agent.name}
              {agent.verified && <ShieldCheck size={15} className="text-ok" aria-label="Verified" />}
            </div>
            <div className={cn("text-sm", muted)}>{agency ? agency.name : tx(locale, "Propietario · publica directo", "Owner · listing directly")}</div>
            {agent.verified && <span className="mt-1 inline-block rounded-full bg-[#2F6F4E1F] px-2 py-0.5 text-[11px] font-bold text-ok">VERIFIED</span>}
          </div>
          {agency?.whatsapp && (
            <span className={cn("flex items-center gap-1 rounded-full border px-2.5 py-1.5 text-xs", dark ? "border-navy-line" : "border-line")} title="WhatsApp">
              <Phone size={13} /> {agency.whatsapp}
            </span>
          )}
        </div>
      )}
      <div className="p-4">
        <div className={cn("mb-4 grid rounded-full p-1", bookable ? "grid-cols-2" : "grid-cols-1", dark ? "bg-white/5" : "bg-ivory")}>
          {bookable && (
            <button onClick={() => setMode("tour")} className={cn("flex items-center justify-center gap-1.5 rounded-full py-1.5 font-display text-sm", mode === "tour" && (dark ? "bg-ivory text-navy" : "bg-navy text-ivory"))}>
              <CalendarCheck size={15} /> {tx(locale, "Pedir visita", "Book a tour")}
            </button>
          )}
          <button onClick={() => setMode("msg")} className={cn("flex items-center justify-center gap-1.5 rounded-full py-1.5 font-display text-sm", mode === "msg" && (dark ? "bg-ivory text-navy" : "bg-navy text-ivory"))}>
            <MessageSquare size={15} /> {tx(locale, "Mensaje", "Message")}
          </button>
        </div>
        {mode === "tour" && (
          <>
            {slots.isLoading && <div className={cn("flex items-center gap-2 text-sm", muted)}><Loader2 size={14} className="animate-spin" /> {tx(locale, "Cargando agenda…", "Loading calendar…")}</div>}
            {!slots.isLoading && days.length === 0 && <div className={cn("text-sm", muted)}>{tx(locale, "Sin horarios esta semana. Envía un mensaje y te propondrán uno.", "No slots this week. Send a message and they’ll propose one.")}</div>}
            <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              {days.map((d, i) => (
                <button
                  key={d.date}
                  onClick={() => {
                    setDay(i);
                    setIso(null);
                  }}
                  className={cn("min-w-[62px] rounded-xl border px-2 py-2 text-center font-display text-sm capitalize", day === i ? "border-coral bg-coral-cta text-white" : dark ? "border-navy-line" : "border-line")}
                >
                  {fmt(d.date, { weekday: "short", day: "numeric" })}
                </button>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {days[day]?.hours.map((h) => (
                <button
                  key={h.iso}
                  disabled={!h.available}
                  onClick={() => setIso(h.iso)}
                  className={cn(
                    "rounded-lg border py-1.5 text-sm font-semibold disabled:cursor-not-allowed disabled:line-through disabled:opacity-40",
                    chosen === h.iso ? "border-navy bg-navy text-ivory" : dark ? "border-navy-line" : "border-line",
                  )}
                >
                  {String(h.hour).padStart(2, "0")}:00
                </button>
              ))}
            </div>
            <label className={cn("mt-3 flex min-h-11 cursor-pointer items-center gap-2 text-sm", muted)}>
              <input type="checkbox" checked={virtual} onChange={(e) => setVirtual(e.target.checked)} className="h-5 w-5 accent-[#C2452A]" />
              <Video size={14} /> {tx(locale, "Prefiero visita por videollamada", "I prefer a video tour")}
            </label>
          </>
        )}
        <div className="mt-3 space-y-2">
          <input className={field} placeholder={tx(locale, "Nombre", "Name")} {...form.register("name")} aria-invalid={!!errs.name} aria-describedby={errs.name ? "cp-err-name" : undefined} aria-label={tx(locale, "Nombre", "Name")} />
          <div className="grid grid-cols-2 gap-2">
            <input className={field} type="email" placeholder="Email" {...form.register("email")} aria-invalid={!!errs.email} aria-describedby={errs.email ? "cp-err-email" : undefined} aria-label="Email" />
            <input className={field} type="tel" placeholder={tx(locale, "Teléfono", "Phone")} {...form.register("phone")} aria-invalid={!!errs.phone} aria-describedby={errs.phone ? "cp-err-phone" : undefined} aria-label={tx(locale, "Teléfono", "Phone")} />
          </div>
          <textarea className={cn(field, "h-20 py-2")} {...form.register("message")} aria-invalid={!!errs.message} aria-describedby={errs.message ? "cp-err-message" : undefined} aria-label={tx(locale, "Mensaje", "Message")} />
          {fieldErrors.length > 0 && (
            <ul className="space-y-0.5 text-xs font-semibold text-danger" role="alert">
              {fieldErrors.map(([k, msg]) => (
                <li key={k} id={`cp-err-${k}`}>{msg}</li>
              ))}
            </ul>
          )}
        </div>
        {err && <div role="alert" className="mt-2 rounded-lg bg-[#B423181A] px-3 py-2 text-sm text-danger">{err}</div>}
        <Button className="mt-3 w-full" size="lg" onClick={form.handleSubmit(submit)} disabled={busy || (mode === "tour" && !chosen)} variant={dark ? "gold" : "coral"}>
          {busy && <Loader2 size={16} className="animate-spin" />}
          {mode === "tour" ? tx(locale, "Solicitar visita", "Request tour") : tx(locale, "Enviar mensaje", "Send message")}
        </Button>
        {bookable && mode === "tour" && <p className={cn("mt-2 text-center text-xs", muted)}>{tx(locale, "Horarios reales de la agenda del agente. Sin costo.", "Real slots from the agent’s calendar. Free.")}</p>}
      </div>
    </div>
  );
}

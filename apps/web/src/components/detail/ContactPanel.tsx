"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { leadSchema } from "@newplace/config";
import { fieldError } from "@/lib/form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarCheck, CheckCircle2, Loader2, MessageSquare, MessagesSquare, PhoneCall, ShieldCheck, Video } from "lucide-react";
import type { Listing, Locale } from "@/types/domain";
import { Button, inputCls } from "@/components/ui";
import { OnCallButton, WhatsAppIcon } from "@/components/brand/PublicChrome";
import { whatsappHref } from "@/lib/listing-href";
import { useApp } from "@/lib/store";
import { api, ApiClientError } from "@/lib/api";
import { tx } from "@/lib/i18n";
import { cn } from "@/lib/cn";

type Slots = { agentId: string | null; days: { date: string; hours: { hour: number; iso: string; available: boolean }[] }[] };

export function ContactPanel({ l, locale, dark }: { l: Listing; locale: Locale; dark?: boolean }) {
  const { user, requireLogin } = useApp();
  const router = useRouter();
  const qc = useQueryClient();
  const agent = l.agent;
  const agency = l.agency;
  // Tours only while the property is available and has an agent calendar.
  const bookable = !!l.agentId && ["ACTIVE", "COMING_SOON", "UNDER_OFFER"].includes(l.status);
  const slots = useQuery({ queryKey: ["slots", l.id], queryFn: () => api<Slots>(`listings/${l.id}/slots`), enabled: bookable, refetchInterval: 15_000 });
  const days = slots.data?.days ?? [];
  const [mode, setMode] = useState<"tour" | "msg">(bookable ? "tour" : "msg");
  // Open on the first day that still has a free slot (a fully booked "today" used to leave the button disabled with no hint).
  const [dayPick, setDay] = useState<number | null>(null);
  const firstOpenDay = days.findIndex((d) => d.hours.some((h) => h.available));
  const day = dayPick ?? Math.max(0, firstOpenDay);
  const [iso, setIso] = useState<string | null>(null);
  const [virtual, setVirtual] = useState(false);
  type F = { name: string; email: string; phone?: string; message: string };
  const form = useForm<F>({
    resolver: zodResolver(leadSchema.pick({ name: true, email: true, phone: true, message: true })),
    defaultValues: { name: user?.name ?? "", email: user?.email ?? "", phone: user?.phone ?? "", message: tx(locale, "Hola, me interesa este inmueble. ¿Sigue disponible?", "Hi, I’m interested in this property. Is it still available?") },
    mode: "onTouched",
  });
  // The session arrives after first paint on cached pages: pre-fill whatever the visitor hasn't typed yet.
  useEffect(() => {
    if (!user) return;
    // Re-validate a field that already shows an error (sent before the session arrived) so a stale "too short" disappears.
    for (const [k, v] of [["name", user.name], ["email", user.email], ["phone", user.phone ?? ""]] as const) if (!form.getValues(k) && v) form.setValue(k, v, { shouldValidate: !!form.getFieldState(k).error });
  }, [user, form]);
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
  const [chatBusy, setChatBusy] = useState(false);
  // "Contactar": in-app chat with the listing's advisor. Anonymous visitors go to login and come back here.
  const canChat = !!agent && !!l.agentId && user?.id !== l.agentId;
  const openChat = async () => {
    if (!requireLogin()) return;
    setErr(null);
    setChatBusy(true);
    try {
      const t = await api<{ id: string }>("threads", { method: "POST", json: { listingId: l.id } });
      router.push(`/${locale}/app?thread=${encodeURIComponent(t.id)}#mensajes`);
    } catch (e) {
      setErr((e as Error).message);
      setChatBusy(false);
    }
  };

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

  const muted = dark ? "text-mist" : "text-muted";
  const field = cn(inputCls, "h-12 rounded-xl border-[#DDD3C2]", dark && "border-navy-line bg-navy-2 text-ivory");
  const wa = whatsappHref(l, locale);
  const first = agent?.name.split(" ")[0] ?? agency?.name ?? "";
  const initials = (agent?.name ?? agency?.name ?? "NP").split(" ").map((p) => p[0]).slice(0, 2).join("");
  const box = dark ? "bg-navy-card text-ivory ring-navy-line" : "bg-white ring-black/[.04]";
  const seg = (active: boolean) => cn("flex min-h-11 items-center justify-center gap-1.5 rounded-full border-2 font-display text-sm transition-colors duration-np", active ? "np-sel font-semibold" : "border-transparent text-muted hover:text-ink");

  if (done !== null)
    return (
      <div id="contact-panel" tabIndex={-1} className={cn("np-in rounded-[24px] p-6 shadow-[0_24px_60px_rgba(22,38,56,.12)] ring-1", box)} data-testid="lead-done">
        <CheckCircle2 className="text-ok" size={30} />
        <div className="mt-3 font-serif text-[28px] leading-tight">{mode === "tour" && done ? tx(locale, "Visita solicitada", "Tour requested") : tx(locale, "Mensaje enviado", "Message sent")}</div>
        {done && <div className="mt-1 font-display text-[17px] font-semibold first-letter:uppercase text-ink">{done}</div>}
        <p className={cn("mt-2 text-[15px]", muted)}>
          {tx(locale, `${agent?.name.split(" ")[0] ?? "El agente"} suele responder en menos de 15 minutos. Te enviamos la confirmación a ${email}.`, `${agent?.name.split(" ")[0] ?? "The agent"} usually replies within 15 minutes. Confirmation sent to ${email}.`)}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {user && <Button href={`/${locale}/app`} size="sm" variant="navy">{tx(locale, "Ver en mi Hub", "Open my Hub")}</Button>}
          <Button size="sm" variant={dark ? "dark-outline" : "outline"} onClick={() => { setDone(null); setIso(null); setDay(null); }}>{tx(locale, "Nueva solicitud", "New request")}</Button>
        </div>
      </div>
    );

  return (
    <div id="contact-panel" tabIndex={-1} data-hide-fab className={cn("rounded-[24px] p-6 shadow-[0_24px_60px_rgba(22,38,56,.12)] ring-1", box)}>
      {(agent || agency) && (
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#E8DCC8] font-serif text-[22px] font-semibold text-[#162638]" aria-hidden>{initials}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-[17px] font-semibold">
              {agent?.name ?? agency?.name}
              {agent?.verified && <ShieldCheck size={15} className="text-ok" aria-label={tx(locale, "Verificado", "Verified")} />}
            </div>
            <div className={cn("text-sm", muted)}>
              {agent?.verified ? tx(locale, "Asesor verificado", "Verified advisor") : tx(locale, "Asesor", "Advisor")}
              {agency ? ` · ${agency.name}` : ""}
            </div>
          </div>
        </div>
      )}
      {(canChat || (agency?.verified && l.agencyId)) && (
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          {canChat && (
            <Button size="md" variant={dark ? "dark-outline" : "outline"} onClick={openChat} disabled={chatBusy} aria-label={tx(locale, `Contactar a ${agent!.name} por chat`, `Chat with ${agent!.name}`)}>
              {chatBusy ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <MessagesSquare size={16} aria-hidden />} {tx(locale, "Contactar", "Contact")}
            </Button>
          )}
          {agency?.verified && l.agencyId && (
            <OnCallButton
              locale={locale}
              listingSlug={l.slug}
              className={cn("inline-flex min-h-11 items-center gap-1.5 rounded-full px-1 text-sm font-semibold underline decoration-current/30 underline-offset-4 hover:decoration-current focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2", dark ? "text-ivory focus-visible:outline-ivory" : "text-navy focus-visible:outline-navy")}
            >
              <PhoneCall size={15} aria-hidden /> {tx(locale, "Guardia 24/7", "24/7 on-call")}
            </OnCallButton>
          )}
        </div>
      )}
      {!agent && !agency && <div className={cn("text-sm", muted)}>{tx(locale, "Propietario · publica directo", "Owner · listing directly")}</div>}
      <div className={cn("mt-5 grid gap-1 rounded-full bg-[#F3EEE5] p-1 dark:bg-white/5", bookable ? "grid-cols-2" : "grid-cols-1")}>
        {bookable && (
          <button onClick={() => setMode("tour")} aria-pressed={mode === "tour"} className={seg(mode === "tour")}>
            <CalendarCheck size={15} aria-hidden /> {tx(locale, "Pedir visita", "Book a tour")}
          </button>
        )}
        <button onClick={() => setMode("msg")} aria-pressed={mode === "msg"} className={seg(mode === "msg")}>
          <MessageSquare size={15} aria-hidden /> {tx(locale, "Mensaje", "Message")}
        </button>
      </div>
      {mode === "tour" && (
        <div className="mt-5">
          <div className="np-eyebrow mb-3 text-gold-text">{tx(locale, "Agendar una visita privada", "Book a private viewing")}</div>
          {slots.isLoading && (
            <div className="grid grid-cols-4 gap-2" aria-label={tx(locale, "Cargando agenda…", "Loading calendar…")}>
              {[0, 1, 2, 3].map((i) => <div key={i} className="np-skeleton h-[86px] rounded-xl" />)}
            </div>
          )}
          {!slots.isLoading && days.length === 0 && <div className={cn("text-sm", muted)}>{tx(locale, "Sin horarios esta semana. Envía un mensaje y te propondrán uno.", "No slots this week. Send a message and they’ll propose one.")}</div>}
          <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {days.map((d, i) => {
              const label = fmt(d.date, { weekday: "short", day: "numeric" });
              const cut = label.lastIndexOf(" ");
              return (
                <button
                  key={d.date}
                  onClick={() => {
                    setDay(i);
                    setIso(null);
                  }}
                  aria-pressed={day === i}
                  data-month={fmt(d.date, { month: "short" }).replace(".", "")}
                  className={cn(
                    "min-w-[62px] flex-1 rounded-xl border px-2 py-2.5 text-center font-display text-sm first-letter:uppercase after:mt-0.5 after:block after:text-[13px] after:text-muted after:content-[attr(data-month)]",
                    day === i ? "np-sel border-2" : dark ? "border-navy-line" : "border-[#DDD3C2] hover:border-navy/50",
                  )}
                >
                  <span className="block">{label.slice(0, cut)}</span> <span className="mt-0.5 block font-serif text-[24px] font-semibold leading-none">{label.slice(cut + 1)}</span>
                  <span className="sr-only">{fmt(d.date, { weekday: "long", day: "numeric", month: "long" })}</span>
                </button>
              );
            })}
          </div>
          {days.length > 0 && !days[day]?.hours.some((h) => h.available) && (
            <div className={cn("mt-3 text-sm", muted)} role="status">
              {firstOpenDay === -1 ? tx(locale, "No quedan horarios libres esta semana. Envía un mensaje y te propondrán uno.", "No free slots left this week. Send a message and they’ll propose one.") : tx(locale, "Este día ya no tiene horarios libres. Elige otro día.", "No free slots left on this day. Pick another day.")}
            </div>
          )}
          <div className="mt-3 grid grid-cols-3 gap-2">
            {days[day]?.hours.map((h) => (
              <button
                key={h.iso}
                disabled={!h.available}
                aria-pressed={chosen === h.iso}
                onClick={() => {
                  setDay(day); // pin the day shown, so a refresh of the calendar can't move the view away from the chosen slot
                  setIso(h.iso);
                }}
                className={cn(
                  "min-h-11 rounded-xl border font-display text-[15px] font-semibold tracking-[0.04em] disabled:cursor-not-allowed disabled:line-through disabled:opacity-40",
                  chosen === h.iso ? "np-sel border-2" : dark ? "border-navy-line" : "border-[#DDD3C2] hover:border-navy/50",
                )}
              >
                {String(h.hour).padStart(2, "0")}:00
              </button>
            ))}
          </div>
          <label className={cn("mt-3 flex min-h-11 cursor-pointer items-center gap-2 text-sm", muted)}>
            <input type="checkbox" checked={virtual} onChange={(e) => setVirtual(e.target.checked)} className="h-5 w-5 accent-[#162638]" />
            <Video size={14} aria-hidden /> {tx(locale, "Prefiero visita por videollamada", "I prefer a video tour")}
          </label>
        </div>
      )}
      {wa && (
        <>
          <a href={wa} target="_blank" rel="noopener noreferrer" className="mt-4 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-coral-cta font-display text-[15px] font-semibold text-white transition-colors duration-np hover:bg-coral-cta-hover">
            <WhatsAppIcon size={19} /> {tx(locale, `WhatsApp con ${first}`, `WhatsApp ${first}`)}
            <span className="sr-only">{tx(locale, "(se abre en una pestaña nueva)", "(opens in a new tab)")}</span>
          </a>
          <div className={cn("my-4 flex items-center gap-3 text-sm", muted)}>
            <span className="h-px flex-1 bg-line" aria-hidden /> {tx(locale, "o déjenos sus datos", "or leave your details")} <span className="h-px flex-1 bg-line" aria-hidden />
          </div>
        </>
      )}
      <div className={cn("space-y-2", !wa && "mt-4")}>
        <input className={field} placeholder={tx(locale, "Nombre", "Name")} {...form.register("name")} aria-invalid={!!errs.name} aria-describedby={errs.name ? "cp-err-name" : undefined} aria-label={tx(locale, "Nombre", "Name")} />
        <div className="grid grid-cols-2 gap-2">
          <input className={field} type="email" placeholder="Email" {...form.register("email")} aria-invalid={!!errs.email} aria-describedby={errs.email ? "cp-err-email" : undefined} aria-label="Email" />
          <input className={field} type="tel" placeholder={tx(locale, "Teléfono", "Phone")} {...form.register("phone")} aria-invalid={!!errs.phone} aria-describedby={errs.phone ? "cp-err-phone" : undefined} aria-label={tx(locale, "Teléfono", "Phone")} />
        </div>
        <textarea className={cn(field, "h-20 py-2.5")} {...form.register("message")} aria-invalid={!!errs.message} aria-describedby={errs.message ? "cp-err-message" : undefined} aria-label={tx(locale, "Mensaje", "Message")} />
        {fieldErrors.length > 0 && (
          <ul className="space-y-0.5 text-sm font-semibold text-danger" role="alert">
            {fieldErrors.map(([k, msg]) => (
              <li key={k} id={`cp-err-${k}`}>{msg}</li>
            ))}
          </ul>
        )}
      </div>
      {err && <div role="alert" className="mt-2 rounded-xl bg-[#B3261E1A] px-3 py-2 text-sm text-danger">{err}</div>}
      <Button className="mt-3 h-[52px] w-full md:h-[52px]" size="lg" onClick={form.handleSubmit(submit)} disabled={busy || (mode === "tour" && !chosen)} variant={wa ? (dark ? "dark-outline" : "outline") : "primary"}>
        {busy && <Loader2 size={16} className="animate-spin" />}
        {mode === "tour" ? tx(locale, "Solicitar visita", "Request tour") : tx(locale, "Enviar mensaje", "Send message")}
      </Button>
      <p className={cn("mt-3 text-center text-sm", muted)}>
        {bookable && mode === "tour" ? tx(locale, "Horarios reales de la agenda del asesor · Sin costo", "Real slots from the advisor’s calendar · Free") : tx(locale, "Suele responder en menos de 15 minutos", "Usually replies within 15 minutes")}
      </p>
    </div>
  );
}

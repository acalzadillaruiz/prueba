"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { leadSchema } from "@newplace/config";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarCheck, CheckCircle2, Clock, Loader2, MessageSquare, MessagesSquare, PhoneCall, ShieldCheck, Video } from "lucide-react";
import type { Listing, Locale } from "@/types/domain";
import { Button, inputCls } from "@/components/ui";
import { OnCallButton, WhatsAppIcon } from "@/components/brand/PublicChrome";
import { whatsappHref } from "@/lib/listing-href";
import { useApp } from "@/lib/store";
import { api, ApiClientError } from "@/lib/api";
import { tx } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { isFsbo, takesTours, VISIT_PREF_LABEL, VISIT_PREFS, type VisitPref } from "@/lib/visit-hours";
import { useListingWhatsApp } from "./useListingWhatsApp";

/** GET listings/:id/slots — the agent's calendar, or (owner: true) the FSBO owner's visit hours. */
type Slots = { agentId: string | null; owner?: boolean; hasCalendar?: boolean; days: { date: string; hours: { hour: number; minute?: number; label?: string; iso: string; available: boolean }[] }[] };

/** Optional phone: when given, at least 7 digits; only digits, "+", spaces, dashes, dots and parentheses. */
const phoneOk = (v: string | undefined) => {
  const t = (v ?? "").trim();
  return !t || (/^\+?[\d\s().-]+$/.test(t) && t.replace(/\D/g, "").length >= 7);
};
const contactSchema = leadSchema.pick({ name: true, email: true, message: true }).extend({
  phone: z.string().max(30).optional().refine(phoneOk),
});

export function ContactPanel({ l, locale, dark }: { l: Listing; locale: Locale; dark?: boolean }) {
  const { user, requireLogin } = useApp();
  const router = useRouter();
  const qc = useQueryClient();
  const uid = useId();
  const agent = l.agent;
  const agency = l.agency;
  // Tours only while the property is available: on the agent's calendar, or with the owner (FSBO) — their visit hours,
  // or, when they have none or they're full, a request with preferred times that the owner answers.
  const bookable = takesTours(l);
  const fsbo = isFsbo(l);
  const slots = useQuery({ queryKey: ["slots", l.id], queryFn: () => api<Slots>(`listings/${l.id}/slots`), enabled: bookable, refetchInterval: 15_000 });
  const days = slots.data?.days ?? [];
  const [mode, setMode] = useState<"tour" | "msg">(bookable ? "tour" : "msg");
  const tabRefs = useRef<Record<"tour" | "msg", HTMLButtonElement | null>>({ tour: null, msg: null });
  // Open on the first day that still has a free slot (a fully booked "today" used to leave the button disabled with no hint).
  const [dayPick, setDay] = useState<number | null>(null);
  const firstOpenDay = days.findIndex((d) => d.hours.some((h) => h.available));
  const day = dayPick ?? Math.max(0, firstOpenDay);
  // FSBO with no free slot (no calendar yet, or fully booked): "Pide una visita" with preferred times instead of a dead end.
  const askMode = fsbo && !slots.isLoading && firstOpenDay === -1;
  const [prefs, setPrefs] = useState<VisitPref[]>([]);
  const [visitNote, setVisitNote] = useState("");
  const [asked, setAsked] = useState(false);
  const askReady = prefs.length > 0 || visitNote.trim().length > 0;
  // No time is pre-selected: the visitor picks one, and the main button then names it.
  const [iso, setIso] = useState<string | null>(null);
  const [virtual, setVirtual] = useState(false);
  type F = { name: string; email: string; phone?: string; message: string };
  const form = useForm<F>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: user?.name ?? "", email: user?.email ?? "", phone: user?.phone ?? "", message: tx(locale, "Hola, vi este anuncio en New Place y me interesa. ¿Sigue disponible?", "Hi, I saw this on New Place and I’m interested. Is it still available?") },
    mode: "onTouched",
  });
  // The session arrives after first paint on cached pages: pre-fill whatever the visitor hasn't typed yet.
  useEffect(() => {
    if (!user) return;
    // Re-validate a field that already shows an error (sent before the session arrived) so a stale error disappears.
    for (const [k, v] of [["name", user.name], ["email", user.email], ["phone", user.phone ?? ""]] as const) if (!form.getValues(k) && v) form.setValue(k, v, { shouldValidate: !!form.getFieldState(k).error });
  }, [user, form]);
  const errs = form.formState.errors;
  // One plain-language message per field, shown right under it.
  const fieldMsg: Record<keyof F, string | undefined> = {
    name: errs.name && tx(locale, "Escribe tu nombre", "Enter your name"),
    email: errs.email && tx(locale, "Escribe un email válido", "Enter a valid email"),
    phone: errs.phone && tx(locale, "Escribe un teléfono con código de país", "Enter a phone number with country code"),
    message: errs.message && (errs.message.type === "too_big" ? tx(locale, "Tu mensaje es muy largo: máximo 1000 caracteres", "Your message is too long: 1000 characters max") : tx(locale, "Escribe tu mensaje", "Write your message")),
  };
  const errId = (k: keyof F) => `${uid}-err-${k}`;
  const a11y = (k: keyof F) => ({ "aria-invalid": !!fieldMsg[k], "aria-describedby": fieldMsg[k] ? errId(k) : undefined });
  const fieldErr = (k: keyof F) =>
    fieldMsg[k] ? (
      <p id={errId(k)} className="mt-1 px-1 text-sm font-semibold text-danger">
        {fieldMsg[k]}
      </p>
    ) : null;
  const email = form.watch("email");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [chatBusy, setChatBusy] = useState(false);
  // In-app chat with the listing's advisor. Anonymous visitors go to login and come back here.
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

  const fmt = (d: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale === "es" ? "es-VE" : "en-US", { ...o, timeZone: "America/Caracas" }).format(new Date(d)).replace(/[  ]/g, " ");
  // A pick that the calendar no longer offers (booked meanwhile) is dropped, never sent.
  const chosen = iso && days[day]?.hours.some((h) => h.iso === iso && h.available) ? iso : null;
  // "jue 8, 11:00" / "Thu 8, 11:00"
  const slotLabel = (d: string) => `${fmt(d, { weekday: "short" }).replace(".", "")} ${fmt(d, { day: "numeric" })}, ${fmt(d, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" })}`;

  const submit = async ({ name, email, phone, message: msg }: F) => {
    setErr(null);
    setBusy(true);
    const ask = mode === "tour" && askMode && !chosen;
    try {
      await api("leads", {
        method: "POST",
        json: {
          listingId: l.id, name, email, phone, message: msg, budget: undefined,
          ...(mode === "tour" && chosen ? { tourStart: chosen, virtual } : {}),
          ...(ask ? { visitPrefs: prefs, visitNote: visitNote.trim() || undefined, virtual } : {}),
        },
      });
      setAsked(ask);
      setDone(mode === "tour" && chosen ? fmt(chosen, { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }) : "");
      qc.invalidateQueries({ queryKey: ["slots", l.id] });
    } catch (e) {
      const conflict = e instanceof ApiClientError && e.code === "CONFLICT";
      if (conflict) setIso(null);
      setErr(conflict ? tx(locale, "Alguien acaba de reservar esa hora. Elige otra, por favor.", "Someone just booked that time. Please pick another.") : (e as Error).message);
      qc.invalidateQueries({ queryKey: ["slots", l.id] });
    } finally {
      setBusy(false);
    }
  };

  const muted = dark ? "text-mist" : "text-muted";
  const field = cn(inputCls, "h-12 rounded-xl border-[#D8CBB7]", dark && "border-navy-line bg-navy-2 text-ivory");
  const wa = useListingWhatsApp(whatsappHref(l, locale));
  const first = agent?.name.split(" ")[0] ?? agency?.name ?? "";
  const confirmer = first || (fsbo ? tx(locale, "su dueño", "the owner") : tx(locale, "el anunciante", "the lister"));
  const initials = (agent?.name ?? agency?.name ?? "NP").split(" ").map((p) => p[0]).slice(0, 2).join("");
  const box = dark ? "bg-navy-card text-ivory ring-navy-line" : "np-glass ring-0";
  const seg = (active: boolean) => cn("flex min-h-11 items-center justify-center gap-1.5 rounded-full border-2 font-display text-sm transition-colors duration-np focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2", dark ? "focus-visible:outline-ivory" : "focus-visible:outline-ink", active ? "np-sel font-semibold" : "border-transparent text-muted hover:text-ink");
  const quietLink = cn("inline-flex min-h-11 items-center gap-1.5 rounded-full px-1 text-sm font-semibold underline decoration-current/30 underline-offset-4 hover:decoration-current focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60", dark ? "text-ivory focus-visible:outline-ivory" : "text-navy focus-visible:outline-navy");
  const modes: ("tour" | "msg")[] = bookable ? ["tour", "msg"] : ["msg"];
  const onTabKey = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft" && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    const i = modes.indexOf(mode);
    const next = e.key === "Home" ? modes[0] : e.key === "End" ? modes[modes.length - 1] : modes[(i + (e.key === "ArrowRight" ? 1 : modes.length - 1)) % modes.length];
    setMode(next);
    tabRefs.current[next]?.focus();
  };

  if (done !== null) {
    const tour = mode === "tour" && !!done;
    const replier = agent ? agent.name.split(" ")[0] : fsbo ? tx(locale, "Su dueño", "The owner") : tx(locale, "Tu asesor", "Your advisor");
    return (
      <div id="contact-panel" tabIndex={-1} className={cn("np-in rounded-[28px] p-6 ring-1", box)} data-testid="lead-done" role="status">
        <CheckCircle2 className="text-ok" size={30} aria-hidden />
        <div className="mt-3 font-serif text-[28px] leading-tight">
          {tour ? tx(locale, "Visita pedida", "Viewing requested") : asked ? tx(locale, "Tu pedido de visita ya llegó", "Your visit request is in") : tx(locale, "Tu mensaje ya llegó", "Your message is on its way")}
        </div>
        {tour && (
          <>
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#F3EEE5] px-3 py-1 font-display text-[15px] font-semibold text-ink">
              <Clock size={15} aria-hidden /> {tx(locale, `Pendiente de que ${confirmer} la confirme`, `Waiting for ${confirmer} to confirm`)}
            </div>
            <div className="mt-2 font-display text-[17px] font-semibold first-letter:uppercase">{done}</div>
          </>
        )}
        <p className={cn("mt-2 text-[15px]", muted)}>
          {asked
            ? tx(locale, `Su dueño ya sabe cuándo te viene bien. Te escribirá a ${email} para cuadrar el día.`, `The owner now knows when suits you and will write to you at ${email} to set the day.`)
            : fsbo
              ? tx(locale, `${replier} te escribirá a ${email}. Lo publica sin intermediarios, así que le hablas directo.`, `${replier} will write to you at ${email}. It’s listed without middlemen, so you talk to them directly.`)
              : tx(locale, `${replier} suele contestar en menos de 15 minutos. Te escribirá a ${email}.`, `${replier} usually replies within 15 minutes and will write to you at ${email}.`)}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {tour ? (
            <Button href={`/${locale}/app`} size="sm" variant="navy">{tx(locale, "Ver mis visitas", "See my viewings")}</Button>
          ) : (
            user && <Button href={`/${locale}/app`} size="sm" variant="navy">{tx(locale, "Ver en mi Hub", "Open my Hub")}</Button>
          )}
          <Button size="sm" variant={dark ? "dark-outline" : "outline"} onClick={() => { setDone(null); setIso(null); setDay(null); setAsked(false); setPrefs([]); setVisitNote(""); }}>{tx(locale, "Enviar otra", "Send another")}</Button>
        </div>
      </div>
    );
  }

  const primaryLabel =
    mode === "tour"
      ? askMode
        ? tx(locale, "Pedir una visita", "Request a visit")
        : chosen
        ? `${tx(locale, "Pedir visita", "Request a viewing")} · ${slotLabel(chosen)}`
        : tx(locale, "Pedir visita", "Request a viewing")
      : tx(locale, "Enviar mensaje", "Send message");

  return (
    <div id="contact-panel" tabIndex={-1} data-hide-fab className={cn("rounded-[28px] p-6 ring-1", box)}>
      {(agent || agency) && (
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#D9C6AB] font-serif text-[22px] font-semibold text-[#1E1A18]" aria-hidden>{initials}</span>
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
      {!agent && !agency && <div className={cn("text-sm", muted)}>{tx(locale, "La publica su dueño, sin intermediarios", "Listed directly by the owner")}</div>}
      <div role="tablist" aria-label={tx(locale, "Cómo quieres contactar", "How to get in touch")} className={cn("mt-5 grid gap-1 rounded-full bg-[#F3EEE5] p-1 dark:bg-white/5", bookable ? "grid-cols-2" : "grid-cols-1")} onKeyDown={onTabKey}>
        {modes.map((m) => (
          <button
            key={m}
            ref={(el) => {
              tabRefs.current[m] = el;
            }}
            type="button"
            role="tab"
            id={`${uid}-tab-${m}`}
            aria-selected={mode === m}
            aria-controls={`${uid}-panel`}
            tabIndex={mode === m ? 0 : -1}
            onClick={() => setMode(m)}
            className={seg(mode === m)}
          >
            {m === "tour" ? <CalendarCheck size={15} aria-hidden /> : <MessageSquare size={15} aria-hidden />}
            {m === "tour" ? tx(locale, "Pedir visita", "Book a tour") : tx(locale, "Mensaje", "Message")}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`${uid}-panel`} aria-labelledby={`${uid}-tab-${mode}`}>
        {mode === "tour" && askMode && (
          <div className="mt-5" data-testid="visit-ask">
            <div className="np-eyebrow mb-2 text-gold-text">{tx(locale, "Pide una visita", "Ask for a visit")}</div>
            <p className={cn("text-[15px]", muted)}>
              {slots.data?.hasCalendar
                ? tx(locale, "Esta semana ya no quedan horas libres. Cuéntale a su dueño cuándo te viene bien y te propone un momento.", "No free times left this week. Tell the owner when suits you and they’ll suggest a time.")
                : tx(locale, "Su dueño todavía no ha puesto horarios de visita. Dinos cuándo te viene bien y se lo hacemos llegar.", "The owner hasn’t set visit hours yet. Tell us when suits you and we’ll pass it on.")}
            </p>
            <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label={tx(locale, "Cuándo te viene bien", "When suits you")}>
              {VISIT_PREFS.map((p) => {
                const on = prefs.includes(p);
                return (
                  <button
                    key={p}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setPrefs(on ? prefs.filter((x) => x !== p) : [...prefs, p])}
                    className={cn("inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3.5 font-display text-sm font-semibold", on ? "np-sel border-2" : dark ? "border-navy-line" : "border-[#D8CBB7] hover:border-navy/50")}
                  >
                    {on && <CheckCircle2 size={14} aria-hidden />} {tx(locale, ...VISIT_PREF_LABEL[p])}
                  </button>
                );
              })}
            </div>
            <input
              className={cn(field, "mt-2")}
              maxLength={200}
              value={visitNote}
              onChange={(e) => setVisitNote(e.target.value)}
              placeholder={tx(locale, "¿Algún día u hora en concreto? (opcional)", "Any particular day or time? (optional)")}
              aria-label={tx(locale, "Día u hora que prefieres", "Preferred day or time")}
            />
            <label className={cn("mt-2 flex min-h-11 cursor-pointer items-center gap-2 text-sm", muted)}>
              <input type="checkbox" checked={virtual} onChange={(e) => setVirtual(e.target.checked)} className="h-5 w-5 accent-[#1E1A18]" />
              <Video size={14} aria-hidden /> {tx(locale, "Prefiero verla por videollamada", "I’d rather see it on a video call")}
            </label>
          </div>
        )}
        {mode === "tour" && !askMode && (
          <div className="mt-5">
            <div className="np-eyebrow mb-3 text-gold-text">{tx(locale, "Elige cuándo quieres verla", "Choose when to see it")}</div>
            {slots.isLoading && (
              <div className="grid grid-cols-4 gap-2" aria-label={tx(locale, "Buscando horarios libres…", "Finding free times…")}>
                {[0, 1, 2, 3].map((i) => <div key={i} className="np-skeleton h-[86px] rounded-xl" />)}
              </div>
            )}
            {!slots.isLoading && days.length === 0 && <div className={cn("text-sm", muted)}>{tx(locale, "Esta semana no hay horarios abiertos. Escribe un mensaje y te proponemos otro momento.", "No open times this week. Send a message and we’ll suggest another.")}</div>}
            <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              {days.map((d, i) => {
                const label = fmt(d.date, { weekday: "short", day: "numeric" });
                const cut = label.lastIndexOf(" ");
                return (
                  <button
                    key={d.date}
                    type="button"
                    onClick={() => {
                      setDay(i);
                      setIso(null);
                    }}
                    aria-pressed={day === i}
                    data-month={fmt(d.date, { month: "short" }).replace(".", "")}
                    className={cn(
                      "min-w-[62px] flex-1 rounded-xl border px-2 py-2.5 text-center font-display text-sm first-letter:uppercase after:mt-0.5 after:block after:text-[13px] after:text-muted after:content-[attr(data-month)]",
                      day === i ? "np-sel border-2" : dark ? "border-navy-line" : "border-[#D8CBB7] hover:border-navy/50",
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
                {firstOpenDay === -1 ? tx(locale, "Esta semana ya está completa. Escribe un mensaje y te proponemos otro momento.", "This week is fully booked. Send a message and we’ll suggest another time.") : tx(locale, "Ese día ya está completo. Prueba con otro.", "That day is fully booked. Try another.")}
              </div>
            )}
            <div className="mt-3 grid grid-cols-3 gap-2">
              {days[day]?.hours.map((h) => (
                <button
                  key={h.iso}
                  type="button"
                  disabled={!h.available}
                  aria-pressed={chosen === h.iso}
                  onClick={() => {
                    setDay(day); // pin the day shown, so a refresh of the calendar can't move the view away from the chosen slot
                    setIso(h.iso);
                  }}
                  className={cn(
                    "min-h-11 rounded-xl border font-display text-[15px] font-semibold tracking-[0.04em] disabled:cursor-not-allowed disabled:line-through disabled:opacity-40",
                    chosen === h.iso ? "np-sel border-2" : dark ? "border-navy-line" : "border-[#D8CBB7] hover:border-navy/50",
                  )}
                >
                  {h.label ?? `${String(h.hour).padStart(2, "0")}:00`}
                </button>
              ))}
            </div>
            <label className={cn("mt-3 flex min-h-11 cursor-pointer items-center gap-2 text-sm", muted)}>
              <input type="checkbox" checked={virtual} onChange={(e) => setVirtual(e.target.checked)} className="h-5 w-5 accent-[#1E1A18]" />
              <Video size={14} aria-hidden /> {tx(locale, "Prefiero verla por videollamada", "I’d rather see it on a video call")}
            </label>
          </div>
        )}
        <form
          noValidate
          onSubmit={form.handleSubmit(submit)}
          className="mt-4 space-y-2"
          aria-label={mode === "tour" ? tx(locale, "Tus datos para la visita", "Your details for the viewing") : tx(locale, "Tu mensaje", "Your message")}
        >
          <div>
            <input className={field} placeholder={tx(locale, "Nombre", "Name")} autoComplete="name" {...form.register("name")} {...a11y("name")} aria-label={tx(locale, "Nombre", "Name")} />
            {fieldErr("name")}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <input className={field} type="email" placeholder="Email" autoComplete="email" {...form.register("email")} {...a11y("email")} aria-label="Email" />
              {fieldErr("email")}
            </div>
            <div>
              <input className={field} type="tel" placeholder={tx(locale, "Teléfono", "Phone")} autoComplete="tel" {...form.register("phone")} {...a11y("phone")} aria-label={tx(locale, "Teléfono", "Phone")} />
              {fieldErr("phone")}
            </div>
          </div>
          <div>
            <textarea className={cn(field, "h-20 py-2.5")} {...form.register("message")} {...a11y("message")} aria-label={tx(locale, "Mensaje", "Message")} />
            {fieldErr("message")}
          </div>
          {err && <div role="alert" className="rounded-xl bg-[#B3261E1A] px-3 py-2 text-sm text-danger">{err}</div>}
          {/* The one terracotta action of each tab: confirm the visit (naming the chosen time) or send the message. */}
          <Button type="submit" className="!mt-3 h-[52px] w-full md:h-[52px]" size="lg" disabled={busy || (mode === "tour" && !chosen && !(askMode && askReady))} variant="primary">
            {busy && <Loader2 size={16} className="animate-spin" aria-hidden />}
            {primaryLabel}
          </Button>
          {mode === "tour" && askMode && !askReady && (
            <p className={cn("text-center text-sm", muted)}>{tx(locale, "Elige cuándo te viene bien para pedir la visita", "Pick when suits you to request the visit")}</p>
          )}
          {mode === "tour" && !chosen && days.some((d) => d.hours.some((h) => h.available)) && (
            <p className={cn("text-center text-sm", muted)}>{tx(locale, "Elige un día y una hora para pedir la visita", "Pick a day and a time to request the viewing")}</p>
          )}
        </form>
        {wa && (
          <a href={wa} target="_blank" rel="noopener noreferrer" className={cn("mt-2 flex min-h-12 w-full items-center justify-center gap-2 rounded-full border-[1.5px] font-display text-[15px] font-semibold transition-colors duration-np focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2", dark ? "border-ivory/60 text-ivory hover:border-ivory hover:bg-white/5 focus-visible:outline-ivory" : "np-btn-outline border-navy text-navy hover:bg-navy/5 focus-visible:outline-navy")}>
            <WhatsAppIcon size={19} /> {tx(locale, `WhatsApp con ${first}`, `WhatsApp ${first}`)}
            <span className="sr-only">{tx(locale, "(se abre en una pestaña nueva)", "(opens in a new tab)")}</span>
          </a>
        )}
      </div>
      {(canChat || (agency?.verified && l.agencyId)) && (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          {canChat && (
            <button type="button" onClick={openChat} disabled={chatBusy} className={quietLink}>
              {chatBusy ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <MessagesSquare size={15} aria-hidden />}
              {/* Accessible name starts with the visible text (WCAG 2.5.3); "por chat" only adds context. */}
              {tx(locale, `Escribirle a ${agent!.name}`, `Message ${agent!.name}`)}
              <span className="sr-only">{tx(locale, " por chat", " in chat")}</span>
            </button>
          )}
          {agency?.verified && l.agencyId && (
            <OnCallButton locale={locale} listingSlug={l.slug} className={quietLink}>
              <PhoneCall size={15} aria-hidden /> {tx(locale, "Guardia 24/7", "24/7 on-call")}
            </OnCallButton>
          )}
        </div>
      )}
      <p className={cn("mt-3 text-center text-sm", muted)}>
        {bookable && mode === "tour"
          ? fsbo
            ? askMode
              ? tx(locale, "Le llega directo a su dueño · Sin costo", "Goes straight to the owner · Free")
              : tx(locale, "Horarios que puso su dueño · Sin costo", "Times set by the owner · Free")
            : tx(locale, "Horarios reales de tu asesor · Sin costo", "Your advisor’s real availability · Free")
          : fsbo
            ? tx(locale, "Le escribes directo a su dueño", "You write straight to the owner")
            : tx(locale, "Suele contestar en menos de 15 minutos", "Usually replies within 15 minutes")}
      </p>
    </div>
  );
}

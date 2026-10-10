"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { leadSchema } from "@newplace/config";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarCheck, CalendarDays, CheckCircle2, Clock, Loader2, MessageSquare, MessagesSquare, Minus, PhoneCall, Plus, ShieldCheck, Video } from "lucide-react";
import type { Listing, Locale } from "@/types/domain";
import { Button, inputCls } from "@/components/ui";
import { OnCallButton, WhatsAppIcon } from "@/components/brand/PublicChrome";
import { whatsappHref } from "@/lib/listing-href";
import { useApp } from "@/lib/store";
import { api, ApiClientError } from "@/lib/api";
import { money, plural, tx } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { isFsbo, OPEN_FOR_TOURS, takesTours, VISIT_PREF_LABEL, VISIT_PREFS, type VisitPref } from "@/lib/visit-hours";
import { addDays, stayDay, stayEstimate, todayCaracas, validateStay, type StayError } from "@/lib/stay";
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
  // Vacation rentals are booked by dates, not visited: "Consultar disponibilidad" (arrival, departure, guests) replaces the visit flow.
  const stay = l.listingType === "SHORT_RENT" && OPEN_FOR_TOURS.includes(l.status);
  const bookable = takesTours(l) && !stay;
  const fsbo = isFsbo(l);
  const slots = useQuery({ queryKey: ["slots", l.id], queryFn: () => api<Slots>(`listings/${l.id}/slots`), enabled: bookable, refetchInterval: 15_000 });
  const days = slots.data?.days ?? [];
  type Mode = "tour" | "stay" | "msg";
  const [mode, setMode] = useState<Mode>(stay ? "stay" : bookable ? "tour" : "msg");
  const tabRefs = useRef<Record<Mode, HTMLButtonElement | null>>({ tour: null, stay: null, msg: null });
  // Stay request: arrival / departure (calendar days, Venezuela time), party size and an optional note.
  const minNights = Math.max(1, l.shortRent?.minNights ?? 1);
  const maxGuests = Math.max(1, l.shortRent?.maxGuests ?? 16);
  const cleaningFee = l.shortRent?.cleaningFee ?? 0;
  const today = todayCaracas();
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(Math.min(2, maxGuests));
  const [stayNote, setStayNote] = useState("");
  const stayCheck = validateStay(checkIn, checkOut, { today, minNights });
  const stayOk = stay && !stayCheck.error;
  const est = stayEstimate(l.pricePeriod === "night" ? l.priceAmount : null, stayCheck.nights, l.shortRent?.cleaningFee ?? 0);
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
  const [noteOpen, setNoteOpen] = useState(false);
  const actions = useRef<HTMLDivElement>(null);
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
    const asksStay = mode === "stay" && stayOk;
    // The dates also travel in the message itself, so whoever answers reads them in the inbox, the thread and the email.
    const stayLine = asksStay
      ? `${tx(locale, "Consulta de disponibilidad", "Availability request")}: ${stayDay(checkIn, locale)} → ${stayDay(checkOut, locale)} (${plural(stayCheck.nights, locale, ["noche", "noches"], ["night", "nights"])}) · ${plural(guests, locale, ["huésped", "huéspedes"], ["guest", "guests"])}`
      : "";
    try {
      await api("leads", {
        method: "POST",
        json: {
          listingId: l.id, name, email, phone, message: asksStay ? [stayLine, stayNote.trim()].filter(Boolean).join("\n\n") : msg, budget: undefined,
          ...(asksStay ? { checkIn, checkOut, guests } : {}),
          ...(mode === "tour" && chosen ? { tourStart: chosen, virtual } : {}),
          ...(ask ? { visitPrefs: prefs, visitNote: visitNote.trim() || undefined, virtual } : {}),
        },
      });
      setAsked(ask);
      setDone(asksStay ? `${stayDay(checkIn, locale)} → ${stayDay(checkOut, locale)} · ${plural(guests, locale, ["huésped", "huéspedes"], ["guest", "guests"])}` : mode === "tour" && chosen ? fmt(chosen, { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }) : "");
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
  const field = cn(inputCls, "h-12 rounded-xl border-[#CDBFAC]", dark && "border-navy-line bg-navy-2 text-ivory");
  const fieldLbl = cn("mb-1 block px-1 text-[13px] font-semibold", muted);
  // Native date pickers follow the input's language where the browser supports it (dd/mm in Spanish); the chosen day is
  // also spelled out next to the label ("jue 18 oct"), so a mm/dd field never leaves the dates ambiguous.
  const dateLang = locale === "es" ? "es-VE" : "en";
  const wa = useListingWhatsApp(whatsappHref(l, locale));
  const first = agent?.name.split(" ")[0] ?? agency?.name ?? "";
  const confirmer = first || (fsbo ? tx(locale, "su dueño", "the owner") : tx(locale, "el anunciante", "the lister"));
  const initials = (agent?.name ?? agency?.name ?? "NP").split(" ").map((p) => p[0]).slice(0, 2).join("");
  const box = dark ? "bg-navy-card text-ivory ring-navy-line" : "np-glass ring-0";
  const seg = (active: boolean) => cn("flex min-h-11 items-center justify-center gap-1.5 rounded-full border-2 font-display text-sm transition-colors duration-np focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2", dark ? "focus-visible:outline-ivory" : "focus-visible:outline-ink", active ? "np-sel font-semibold" : "border-transparent text-muted hover:text-ink");
  const quietLink = cn("inline-flex min-h-11 items-center gap-1.5 rounded-full px-1 text-sm font-semibold underline decoration-current/30 underline-offset-4 hover:decoration-current focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60", dark ? "text-ivory focus-visible:outline-ivory" : "text-navy focus-visible:outline-navy");
  const modes: Mode[] = stay ? ["stay", "msg"] : bookable ? ["tour", "msg"] : ["msg"];
  const onTabKey = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft" && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    const i = modes.indexOf(mode);
    const next = e.key === "Home" ? modes[0] : e.key === "End" ? modes[modes.length - 1] : modes[(i + (e.key === "ArrowRight" ? 1 : modes.length - 1)) % modes.length];
    setMode(next);
    tabRefs.current[next]?.focus();
  };

  // Booking: the personal details show once there is something to book (a time, or the FSBO owner's preferred times).
  const reveal = mode === "msg" || (mode === "stay" && stayOk) || (mode === "tour" && (!!chosen || (askMode && askReady))) || Object.keys(errs).length > 0;
  // While booking, the (pre-written) message stays folded behind "Añadir un mensaje" unless the visitor opens it.
  const showNote = mode === "msg" || noteOpen || !!errs.message;

  // When the details appear after a pick, keep the main button on screen (scrolls the sticky card or the page just enough).
  const wasRevealed = useRef(reveal);
  useEffect(() => {
    if (reveal && !wasRevealed.current && mode !== "msg") {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      actions.current?.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
    }
    wasRevealed.current = reveal;
  }, [reveal, mode]);

  if (done !== null) {
    const tour = mode === "tour" && !!done;
    const stayDone = mode === "stay" && !!done;
    const replier = agent ? agent.name.split(" ")[0] : fsbo ? tx(locale, "Su dueño", "The owner") : tx(locale, "Tu asesor", "Your advisor");
    return (
      <div id="contact-panel" tabIndex={-1} className={cn("np-in rounded-[4px] p-6 ring-1", box)} data-testid="lead-done" role="status">
        <CheckCircle2 className="text-ok" size={30} aria-hidden />
        <div className="mt-3 font-serif text-[28px] leading-tight">
          {tour ? tx(locale, "Visita pedida", "Viewing requested") : stayDone ? tx(locale, "Tu consulta ya llegó", "Your availability request is in") : asked ? tx(locale, "Tu pedido de visita ya llegó", "Your visit request is in") : tx(locale, "Tu mensaje ya llegó", "Your message is on its way")}
        </div>
        {stayDone && (
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#F1ECE4] px-3 py-1 font-display text-[15px] font-semibold text-ink first-letter:uppercase">
            <CalendarDays size={15} aria-hidden /> {done}
          </div>
        )}
        {tour && (
          <>
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#F1ECE4] px-3 py-1 font-display text-[15px] font-semibold text-ink">
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
          <Button size="sm" variant={dark ? "dark-outline" : "outline"} onClick={() => { setDone(null); setIso(null); setDay(null); setAsked(false); setPrefs([]); setVisitNote(""); setStayNote(""); }}>{tx(locale, "Enviar otra", "Send another")}</Button>
        </div>
      </div>
    );
  }

  // Date problems are shown once both dates are in (a lone arrival is just work in progress), except a past arrival.
  const stayErrMsg: Partial<Record<StayError, string>> = {
    "bad-date": tx(locale, "Revisa las fechas", "Check the dates"),
    past: tx(locale, "La llegada no puede ser antes de hoy", "Arrival can’t be before today"),
    order: tx(locale, "La salida tiene que ser después de la llegada", "Departure must be after arrival"),
    min: tx(locale, `La estancia mínima es de ${plural(minNights, locale, ["noche", "noches"], ["night", "nights"])}`, `Minimum stay is ${plural(minNights, locale, ["night", "nights"], ["night", "nights"])}`),
    max: tx(locale, "Para estancias de más de un año, escríbele un mensaje", "For stays longer than a year, send a message"),
  };
  const stayMsg = mode === "stay" && stayCheck.error && (checkOut || stayCheck.error === "past") ? stayErrMsg[stayCheck.error] : undefined;
  const stayErrIn = !!stayMsg && stayCheck.error === "past";
  const stayErrOut = !!stayMsg && !stayErrIn;
  const primaryLabel =
    mode === "stay"
      ? tx(locale, "Consultar disponibilidad", "Check availability")
      : mode === "tour"
      ? askMode
        ? tx(locale, "Pedir una visita", "Request a visit")
        : chosen
        ? `${tx(locale, "Pedir visita", "Request a viewing")} · ${slotLabel(chosen)}`
        : tx(locale, "Pedir visita", "Request a viewing")
      : tx(locale, "Enviar mensaje", "Send message");

  return (
    <div id="contact-panel" tabIndex={-1} data-hide-fab className={cn("rounded-[4px] p-6 ring-1", box)}>
      {(agent || agency) && (
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#D8CFC1] font-serif text-[22px] font-light text-[#1C1D1D]" aria-hidden>{initials}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-[17px] font-semibold">
              {agent?.name ?? agency?.name}
              {agent?.verified && <ShieldCheck size={15} className="text-ok" aria-label={tx(locale, "Verificado", "Verified")} />}
            </div>
            <div className={cn("text-sm", muted)}>
              {/* FSBO: the person shown is the owner (no agent), never "Asesor". Gender-neutral wording. */}
              {fsbo
                ? tx(locale, "Dueño/a · publica sin intermediarios", "Owner · no middlemen")
                : agent?.verified
                  ? tx(locale, "Asesor verificado", "Verified advisor")
                  : tx(locale, "Asesor", "Advisor")}
              {agency && !fsbo ? ` · ${agency.name}` : ""}
            </div>
          </div>
        </div>
      )}
      {!agent && !agency && <div className={cn("text-sm", muted)}>{tx(locale, "Publicada por su dueño/a · sin intermediarios", "Listed by the owner · no middlemen")}</div>}
      <div role="tablist" aria-label={tx(locale, "Cómo quieres contactar", "How to get in touch")} className={cn("mt-5 grid gap-1 rounded-full bg-[#F1ECE4] p-1 dark:bg-white/5", modes.length > 1 ? "grid-cols-2" : "grid-cols-1")} onKeyDown={onTabKey}>
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
            {m === "tour" ? <CalendarCheck size={15} aria-hidden /> : m === "stay" ? <CalendarDays size={15} aria-hidden /> : <MessageSquare size={15} aria-hidden />}
            {m === "tour" ? tx(locale, "Pedir visita", "Book a tour") : m === "stay" ? tx(locale, "Disponibilidad", "Availability") : tx(locale, "Mensaje", "Message")}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`${uid}-panel`} aria-labelledby={`${uid}-tab-${mode}`}>
        {mode === "stay" && (
          <div className="mt-5" data-testid="stay-ask">
            <div className="np-eyebrow text-gold-text">{tx(locale, "¿Cuándo quieres venir?", "When would you like to stay?")}</div>
            <p className={cn("mb-3 mt-1 text-sm", muted)} data-testid="stay-card-terms">
              {tx(locale, "Mín.", "Min.")} {plural(minNights, locale, ["noche", "noches"], ["night", "nights"])}
              {cleaningFee > 0 && ` · ${tx(locale, "limpieza", "cleaning")} ${money(cleaningFee, locale)}`}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div className="min-w-0">
                <div className="mb-1 flex items-baseline justify-between gap-1 px-1 text-sm">
                  <label htmlFor={`${uid}-in`} className={cn("font-semibold", muted)}>{tx(locale, "Llegada", "Arrival")}</label>
                  {checkIn && <span className="truncate font-semibold" data-testid="stay-in-words">{stayDay(checkIn, locale)}</span>}
                </div>
                <input
                  id={`${uid}-in`}
                  type="date"
                  lang={dateLang}
                  className={cn(field, "min-w-0 px-2.5")}
                  min={today}
                  value={checkIn}
                  aria-invalid={stayErrIn || undefined}
                  aria-describedby={stayErrIn ? `${uid}-stay-err` : undefined}
                  onChange={(e) => {
                    const v = e.target.value;
                    setCheckIn(v);
                    // Departure follows: kept when it still works, otherwise moved to the earliest valid night.
                    if (v && (!checkOut || validateStay(v, checkOut, { today: v, minNights }).error)) setCheckOut(addDays(v, minNights));
                  }}
                />
              </div>
              <div className="min-w-0">
                <div className="mb-1 flex items-baseline justify-between gap-1 px-1 text-sm">
                  <label htmlFor={`${uid}-out`} className={cn("font-semibold", muted)}>{tx(locale, "Salida", "Departure")}</label>
                  {checkOut && <span className="truncate font-semibold" data-testid="stay-out-words">{stayDay(checkOut, locale)}</span>}
                </div>
                <input
                  id={`${uid}-out`}
                  type="date"
                  lang={dateLang}
                  className={cn(field, "min-w-0 px-2.5")}
                  min={addDays(checkIn || today, minNights)}
                  value={checkOut}
                  aria-invalid={stayErrOut || undefined}
                  aria-describedby={stayErrOut ? `${uid}-stay-err` : undefined}
                  onChange={(e) => setCheckOut(e.target.value)}
                />
              </div>
            </div>
            {stayMsg && <p id={`${uid}-stay-err`} role="alert" className="mt-1.5 px-1 text-sm font-semibold text-danger">{stayMsg}</p>}
            <div className="mt-3 flex items-center justify-between gap-3">
              <span id={`${uid}-guests`} className="text-sm font-semibold">
                {tx(locale, "Huéspedes", "Guests")}
                {l.shortRent?.maxGuests ? <span className={cn("block text-[13px] font-normal", muted)}>{tx(locale, `Hasta ${maxGuests}`, `Up to ${maxGuests}`)}</span> : null}
              </span>
              <div className="flex items-center gap-1" role="group" aria-labelledby={`${uid}-guests`}>
                <button type="button" onClick={() => setGuests(Math.max(1, guests - 1))} disabled={guests <= 1} aria-label={tx(locale, "Un huésped menos", "One guest fewer")} className={cn("flex h-11 w-11 items-center justify-center rounded-full border disabled:opacity-40", dark ? "border-navy-line" : "border-[#CDBFAC]")}><Minus size={16} aria-hidden /></button>
                <output aria-live="polite" className="w-8 text-center font-display text-[17px] font-semibold" data-testid="stay-guests">{guests}</output>
                <button type="button" onClick={() => setGuests(Math.min(maxGuests, guests + 1))} disabled={guests >= maxGuests} aria-label={tx(locale, "Un huésped más", "One guest more")} className={cn("flex h-11 w-11 items-center justify-center rounded-full border disabled:opacity-40", dark ? "border-navy-line" : "border-[#CDBFAC]")}><Plus size={16} aria-hidden /></button>
              </div>
            </div>
            {stayOk && (
              <div className={cn("np-in mt-3 rounded-xl px-3.5 py-3 text-[15px]", dark ? "bg-white/5" : "bg-[#F1ECE4]")} data-testid="stay-summary" aria-live="polite">
                <div className="flex justify-between gap-3">
                  <span>{est ? `${money(l.priceAmount, locale)} × ${plural(stayCheck.nights, locale, ["noche", "noches"], ["night", "nights"])}` : plural(stayCheck.nights, locale, ["noche", "noches"], ["night", "nights"])}</span>
                  {est && <span className="whitespace-nowrap">{money(est.subtotal, locale)}</span>}
                </div>
                {est && est.cleaning > 0 && (
                  <div className={cn("flex justify-between gap-3", muted)}>
                    <span>{tx(locale, "Limpieza", "Cleaning")}</span>
                    <span className="whitespace-nowrap">{money(est.cleaning, locale)}</span>
                  </div>
                )}
                {est && (
                  <div className="mt-1 flex justify-between gap-3 border-t border-black/10 pt-1 font-semibold dark:border-white/10">
                    <span>{tx(locale, "Total estimado", "Estimated total")}</span>
                    <span className="whitespace-nowrap" data-testid="stay-total">{money(est.total, locale)}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
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
                    className={cn("inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3.5 font-display text-sm font-semibold", on ? "np-sel border-2" : dark ? "border-navy-line" : "border-[#CDBFAC] hover:border-navy/50")}
                  >
                    {on && <CheckCircle2 size={14} aria-hidden />} {tx(locale, ...VISIT_PREF_LABEL[p])}
                  </button>
                );
              })}
            </div>
            <label htmlFor={`${uid}-when`} className={cn(fieldLbl, "mt-4")}>{tx(locale, "Día u hora que prefieres", "Preferred day or time")}</label>
            <input
              id={`${uid}-when`}
              className={field}
              maxLength={200}
              value={visitNote}
              onChange={(e) => setVisitNote(e.target.value)}
              placeholder={tx(locale, "Opcional: p. ej. sábado por la mañana", "Optional: e.g. Saturday morning")}
            />
            <label className={cn("mt-2 flex min-h-11 cursor-pointer items-center gap-2 text-sm", muted)}>
              <input type="checkbox" checked={virtual} onChange={(e) => setVirtual(e.target.checked)} className="h-5 w-5 accent-[#1C1D1D]" />
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
                      day === i ? "np-sel border-2" : dark ? "border-navy-line" : "border-[#CDBFAC] hover:border-navy/50",
                    )}
                  >
                    <span className="block">{label.slice(0, cut)}</span> <span className="mt-0.5 block font-serif text-[24px] font-light leading-none">{label.slice(cut + 1)}</span>
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
                    "min-h-11 rounded-xl border font-display text-[15px] font-semibold tracking-[0.04em] disabled:cursor-not-allowed disabled:border-dashed disabled:font-normal disabled:line-through",
                    // Taken slots stay legible (≥ 4.5:1): dashed border + strike-through, not a 40 % fade.
                    dark ? "disabled:text-mist" : "disabled:text-[#6E655E]",
                    chosen === h.iso ? "np-sel border-2" : dark ? "border-navy-line" : "border-[#CDBFAC] hover:border-navy/50",
                  )}
                >
                  {h.label ?? `${String(h.hour).padStart(2, "0")}:00`}
                  {!h.available && <span className="sr-only">{tx(locale, " · ocupada", " · taken")}</span>}
                </button>
              ))}
            </div>
          </div>
        )}
        <form
          noValidate
          onSubmit={form.handleSubmit(submit)}
          className="mt-4 space-y-2"
          aria-label={mode === "tour" ? tx(locale, "Tus datos para la visita", "Your details for the viewing") : mode === "stay" ? tx(locale, "Tus datos para la consulta", "Your details for the request") : tx(locale, "Tu mensaje", "Your message")}
        >
          {/* Progressive: while booking, name / email / phone appear once a time (or, FSBO, a preference) is chosen, so the
              calendar and the main action stay on the first screen. The message tab shows them right away. */}
          {reveal && (
            <div className="np-in space-y-2" data-testid="contact-fields">
              {mode === "tour" && !askMode && (
                <label className={cn("flex min-h-11 cursor-pointer items-center gap-2 text-sm", muted)}>
                  <input type="checkbox" checked={virtual} onChange={(e) => setVirtual(e.target.checked)} className="h-5 w-5 accent-[#1C1D1D]" />
                  <Video size={14} aria-hidden /> {tx(locale, "Prefiero verla por videollamada", "I’d rather see it on a video call")}
                </label>
              )}
              {/* Visible labels above every field (a placeholder vanishes as soon as you type). */}
              <div>
                <label htmlFor={`${uid}-name`} className={fieldLbl}>{tx(locale, "Nombre", "Name")}</label>
                <input id={`${uid}-name`} className={field} autoComplete="name" {...form.register("name")} {...a11y("name")} />
                {fieldErr("name")}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="min-w-0">
                  <label htmlFor={`${uid}-email`} className={fieldLbl}>Email</label>
                  <input id={`${uid}-email`} className={field} type="email" placeholder={tx(locale, "tu@correo.com", "you@example.com")} autoComplete="email" {...form.register("email")} {...a11y("email")} />
                  {fieldErr("email")}
                </div>
                <div className="min-w-0">
                  <label htmlFor={`${uid}-phone`} className={fieldLbl}>{tx(locale, "Teléfono", "Phone")} <span className="font-normal">{tx(locale, "(opcional)", "(optional)")}</span></label>
                  <input id={`${uid}-phone`} className={field} type="tel" placeholder="+58 412…" autoComplete="tel" {...form.register("phone")} {...a11y("phone")} />
                  {fieldErr("phone")}
                </div>
              </div>
              {mode === "stay" ? (
                <div>
                  <label htmlFor={`${uid}-note`} className={fieldLbl}>{tx(locale, "Mensaje (opcional)", "Message (optional)")}</label>
                  <textarea
                    id={`${uid}-note`}
                    className={cn(field, "h-16 py-2")}
                    maxLength={800}
                    value={stayNote}
                    onChange={(e) => setStayNote(e.target.value)}
                    placeholder={tx(locale, "¿Algo que deba saber?", "Anything they should know?")}
                  />
                </div>
              ) : showNote ? (
                <div>
                  <label htmlFor={`${uid}-msg`} className={fieldLbl}>{tx(locale, "Mensaje", "Message")}</label>
                  <textarea id={`${uid}-msg`} className={cn(field, mode === "tour" ? "h-16 py-2" : "h-20 py-2.5")} {...form.register("message")} {...a11y("message")} />
                  {fieldErr("message")}
                </div>
              ) : (
                <button type="button" onClick={() => setNoteOpen(true)} className={cn(quietLink, "font-normal")}>
                  <MessageSquare size={15} aria-hidden /> {tx(locale, "Añadir un mensaje (opcional)", "Add a message (optional)")}
                </button>
              )}
            </div>
          )}
          {err && <div role="alert" className="rounded-xl bg-[#B3261E1A] px-3 py-2 text-sm text-danger">{err}</div>}
          {/* The one terracotta action of each tab: confirm the visit (naming the chosen time) or send the message. */}
          <div ref={actions} className="!mt-3 flex items-center gap-2">
            <Button type="submit" className="h-[52px] min-w-0 flex-1 disabled:text-[#5E5650] md:h-[52px] dark:disabled:bg-white/10 dark:disabled:text-[#CDC5B9]" size="lg" disabled={busy || (mode === "tour" && !chosen && !(askMode && askReady)) || (mode === "stay" && !stayOk)} variant="primary">
              {busy && <Loader2 size={16} className="animate-spin" aria-hidden />}
              {primaryLabel}
            </Button>
            {/* WhatsApp next to the main action (round, glyph only) so both sit above the fold. */}
            {wa && (
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={tx(locale, `WhatsApp con ${first} (se abre en una pestaña nueva)`, `WhatsApp ${first} (opens in a new tab)`)}
                title={tx(locale, `WhatsApp con ${first}`, `WhatsApp ${first}`)}
                data-testid="contact-whatsapp"
                className={cn("flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors duration-np focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2", dark ? "border-ivory/60 text-ivory hover:border-ivory hover:bg-white/5 focus-visible:outline-ivory" : "np-btn-outline border-navy text-navy hover:bg-navy/5 focus-visible:outline-navy")}
              >
                <WhatsAppIcon size={21} />
              </a>
            )}
          </div>
          {mode === "stay" && !stayOk && !stayMsg && (
            <p className={cn("text-center text-sm", muted)}>{tx(locale, "Elige tus fechas para consultar la disponibilidad", "Pick your dates to check availability")}</p>
          )}
          {mode === "tour" && askMode && !askReady && (
            <p className={cn("text-center text-sm", muted)}>{tx(locale, "Elige cuándo te viene bien para pedir la visita", "Pick when suits you to request the visit")}</p>
          )}
          {mode === "tour" && !chosen && days.some((d) => d.hours.some((h) => h.available)) && (
            <p className={cn("text-center text-sm", muted)}>{/* A day is always preselected (the first with free slots): ask only for what's still missing. */}
              {!days[day]
                ? tx(locale, "Elige un día y una hora para pedir la visita", "Pick a day and a time to request the viewing")
                : days[day].hours.some((h) => h.available)
                  ? tx(locale, "Elige una hora para pedir la visita", "Pick a time to request the viewing")
                  : tx(locale, "Ese día ya no quedan horas: elige otro día", "No times left that day: pick another day")}</p>
          )}
        </form>
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
        {mode === "stay"
          ? tx(locale, "Sin costo ni compromiso · Te confirma fechas y precio final", "Free, no commitment · They confirm dates and final price")
          : bookable && mode === "tour"
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

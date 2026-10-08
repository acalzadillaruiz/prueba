"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { Phone, ShieldCheck, X } from "lucide-react";
import type { Locale } from "@/types/domain";
import type { OnCallAdvisor } from "@/lib/on-call";
import { Avatar } from "@/components/ui";
import { api } from "@/lib/api";
import { tx } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { WhatsAppIcon } from "./WhatsAppIcon";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Guardia 24/7 dialog: today's on-call advisor per verified agency (Caracas weekday), with a visible phone number
 * (`tel:`) and WhatsApp. On a listing (`listingSlug`), only that listing's agency is shown. Accessible modal: labelled, focus kept
 * inside, Esc / backdrop close, focus returns to the trigger. Portalled to <body> so no transformed parent clips it.
 */
export function OnCallDialog({ locale, listingSlug, onClose }: { locale: Locale; listingSlug?: string; onClose: () => void }) {
  const panel = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descId = useId();
  const q = useQuery({
    queryKey: ["on-call", listingSlug ?? ""],
    queryFn: () => api<{ advisors: OnCallAdvisor[] }>(`on-call${listingSlug ? `?listing=${encodeURIComponent(listingSlug)}` : ""}`),
    staleTime: 5 * 60_000,
  });
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panel.current) return;
      const items = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || !panel.current.contains(document.activeElement))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (document.activeElement === last || !panel.current.contains(document.activeElement))) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      prev?.focus?.();
    };
  }, [onClose]);
  const list = q.data?.advisors ?? [];
  const ring = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy";
  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-[#1E1A18]/55 p-0 sm:items-center sm:p-6 print:hidden" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="np-in max-h-[88vh] w-full overflow-y-auto rounded-t-[24px] bg-ivory p-6 text-ink shadow-[0_24px_60px_rgba(30,26,24,.25)] sm:max-w-[480px] sm:rounded-[24px]"
        style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="np-eyebrow text-gold-text">{tx(locale, "Guardia 24/7", "24/7 on-call")}</div>
            <h2 id={titleId} className="mt-1 font-serif text-[28px] font-medium leading-tight text-navy">{tx(locale, "Hoy te atienden", "Here for you today")}</h2>
          </div>
          <button ref={closeBtn} type="button" onClick={onClose} aria-label={tx(locale, "Cerrar", "Close")} className={cn("-mr-2 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-navy hover:bg-navy/5", ring)}>
            <X size={20} aria-hidden />
          </button>
        </div>
        <p id={descId} className="mt-2 text-[15px] text-muted">
          {listingSlug
            ? tx(locale, "La agencia de esta casa tiene a alguien disponible todos los días, también los fines de semana. Llama o escribe por WhatsApp, sin compromiso.", "This home’s agency has someone available every day, weekends included. Call or send a WhatsApp, no strings attached.")
            : tx(locale, "Cada agencia tiene a alguien disponible todos los días, también los fines de semana. Llama o escribe por WhatsApp, sin compromiso.", "Every agency has someone available every day, weekends included. Call or send a WhatsApp, no strings attached.")}
        </p>
        {q.isLoading && (
          <div className="mt-5 space-y-3" aria-label={tx(locale, "Un momento…", "One moment…")}>
            {[0, 1].map((i) => <div key={i} className="np-skeleton h-[124px] rounded-2xl" />)}
          </div>
        )}
        {q.isError && (
          <div role="alert" className="mt-5 rounded-xl bg-[#B3261E1A] px-3.5 py-2.5 text-sm text-danger">
            {tx(locale, "No pudimos ver quién está de guardia. ", "We couldn’t check who’s on call. ")}
            <button type="button" onClick={() => q.refetch()} className={cn("font-semibold underline underline-offset-4", ring)}>{tx(locale, "Intentar de nuevo", "Try again")}</button>
          </div>
        )}
        {q.isSuccess && list.length === 0 && (
          <p className="mt-5 rounded-2xl bg-white p-4 text-[15px] text-muted ring-1 ring-black/[.04]">
            {listingSlug
              ? tx(locale, "Hoy no hay nadie de guardia en esta agencia. Escríbele desde esta página y te responde en horario de oficina.", "No one at this agency is on call today. Write from this page and they’ll reply during office hours.")
              : tx(locale, "Hoy no hay nadie de guardia. Escríbenos desde cualquier casa y te respondemos en horario de oficina.", "No one is on call today. Write to us from any home and we’ll reply during office hours.")}
          </p>
        )}
        {list.length > 0 && (
          <ul className="mt-5 space-y-3">
            {list.map((o, i) => (
              <li key={o.agency.id} className="rounded-2xl bg-white p-4 ring-1 ring-black/[.04]">
                <div className="flex items-center gap-3">
                  <Avatar initials={o.advisor.initials} hue={o.advisor.hue} size={48} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-[17px] font-semibold text-ink">
                      <span className="truncate">{o.advisor.name}</span>
                      {o.advisor.verified && <ShieldCheck size={15} className="shrink-0 text-ok" aria-label={tx(locale, "Verificado", "Verified")} />}
                    </div>
                    <div className="truncate text-sm text-muted">
                      {o.agency.name}
                      {listingSlug && i === 0 ? tx(locale, " · agencia de esta casa", " · this home’s agency") : ""}
                    </div>
                  </div>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {o.advisor.tel && o.advisor.phone && (
                    <a href={o.advisor.tel} className={cn("flex min-h-11 items-center justify-center gap-2 rounded-full border-[1.5px] border-navy px-4 font-display text-[15px] font-semibold text-navy hover:bg-navy/5", ring)}>
                      <Phone size={16} aria-hidden />
                      <span className="sr-only">{tx(locale, `Llamar a ${o.advisor.name}:`, `Call ${o.advisor.name}:`)}</span>
                      <span className="whitespace-nowrap [font-feature-settings:'lnum']">{o.advisor.phone}</span>
                    </a>
                  )}
                  {o.advisor.whatsapp && (
                    <a href={o.advisor.whatsapp} target="_blank" rel="noopener noreferrer" className={cn("flex min-h-11 items-center justify-center gap-2 rounded-full bg-navy px-4 font-display text-[15px] font-semibold text-ivory hover:bg-navy-2", ring)}>
                      <WhatsAppIcon size={18} /> WhatsApp
                      <span className="sr-only">{tx(locale, `con ${o.advisor.name} (se abre en una pestaña nueva)`, `${o.advisor.name} (opens in a new tab)`)}</span>
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-center text-sm text-muted">{tx(locale, "La guardia sigue el horario de Caracas (UTC−4).", "On-call hours follow Caracas time (UTC−4).")}</p>
      </div>
    </div>,
    document.body,
  );
}


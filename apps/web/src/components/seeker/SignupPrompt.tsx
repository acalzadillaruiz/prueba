"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Bell, Heart, X } from "lucide-react";
import type { Locale } from "@/types/domain";
import { tx } from "@/lib/i18n";
import { cn } from "@/lib/cn";

/** Login / register links that bring the visitor back here and tell the auth screen why they came. */
export function authHrefs(locale: Locale, reason: "save" | "alert", next?: string) {
  const back = next ?? (typeof window !== "undefined" ? window.location.pathname + window.location.search : `/${locale}`);
  const q = `?next=${encodeURIComponent(back)}&reason=${reason}`;
  return { register: `/${locale}/register${q}`, login: `/${locale}/login${q}` };
}

/**
 * Small "create your account" dialog for actions that need an account (saved-search alerts): the visitor stays on
 * the page and chooses to register or sign in, both coming back to the same URL. Esc / backdrop / X close it.
 */
export function SignupPrompt({ locale, reason, onClose }: { locale: Locale; reason: "save" | "alert"; onClose: () => void }) {
  const panel = useRef<HTMLDivElement>(null);
  const first = useRef<HTMLAnchorElement>(null);
  const titleId = useId();
  const descId = useId();
  const { register, login } = authHrefs(locale, reason);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    first.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panel.current) return;
      const items = [...panel.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])")];
      if (!items.length) return;
      const [a, z] = [items[0], items[items.length - 1]];
      if (e.shiftKey && document.activeElement === a) {
        e.preventDefault();
        z.focus();
      } else if (!e.shiftKey && document.activeElement === z) {
        e.preventDefault();
        a.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      prev?.focus?.();
    };
  }, [onClose]);
  const alert = reason === "alert";
  const Icon = alert ? Bell : Heart;
  const ring = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy";
  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-[#1E1A18]/45 sm:items-center sm:p-6 print:hidden" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="np-in w-full rounded-t-[24px] bg-ivory p-6 text-ink shadow-[0_24px_60px_rgba(30,26,24,.25)] sm:max-w-[420px] sm:rounded-[24px]"
        style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
      >
        <div className="flex items-start justify-between gap-4">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#8E3B22]/10 text-[#8E3B22]">
            <Icon size={20} strokeWidth={1.7} aria-hidden />
          </span>
          <button type="button" onClick={onClose} aria-label={tx(locale, "Cerrar", "Close")} className={cn("-mr-2 -mt-1 flex h-11 w-11 items-center justify-center rounded-full text-navy hover:bg-navy/5", ring)}>
            <X size={20} aria-hidden />
          </button>
        </div>
        <h2 id={titleId} className="mt-3 font-serif text-[28px] font-medium leading-tight text-navy">
          {alert ? tx(locale, "Crea tu cuenta para que te avisemos", "Create your account and we’ll let you know") : tx(locale, "Crea tu cuenta para guardar tus casas", "Create your account to keep your homes")}
        </h2>
        <p id={descId} className="mt-2 text-[15px] text-muted">
          {alert
            ? tx(locale, "Guardamos esta búsqueda con todos tus filtros y te escribimos en cuanto aparezca una casa que encaje. Es gratis.", "We’ll keep this search with all your filters and write to you as soon as a matching home appears. It’s free.")
            : tx(locale, "Tus casas guardadas te esperan en cualquier dispositivo. Es gratis.", "Your saved homes will wait for you on any device. It’s free.")}
        </p>
        <div className="mt-6 flex flex-col gap-2.5">
          <Link ref={first} href={register} className={cn("inline-flex h-12 items-center justify-center rounded-full bg-coral-cta px-6 font-display font-semibold text-white hover:bg-coral-cta-hover", ring)}>
            {tx(locale, "Crear cuenta gratis", "Create a free account")}
          </Link>
          <Link href={login} className={cn("inline-flex h-12 items-center justify-center rounded-full border-[1.5px] border-navy px-6 font-display font-semibold text-navy hover:bg-navy/5", ring)}>
            {tx(locale, "Ya tengo cuenta · Entrar", "I have an account · Sign in")}
          </Link>
        </div>
      </div>
    </div>,
    document.body,
  );
}

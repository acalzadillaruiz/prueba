"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { ArrowUp, ChevronDown, Heart, House, KeyRound, Menu, Palmtree, Search, Sparkles, User } from "lucide-react";
import Link from "next/link";
import { heuristicSearchParse } from "@newplace/ai";
import type { Locale } from "@/types/domain";
import { tx } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { queryToParams } from "./queryParams";
import { usePlaceSuggest } from "./PlaceSuggest";
import { RoofMark } from "@/components/brand/Logo";
import { OPEN_MENU_EVENT } from "@/components/layout/PublicHeader";
import { roleHome } from "@/components/brand/PublicChrome";
import { Avatar } from "@/components/ui";
import { useApp } from "@/lib/store";

const MODES = [
  ["SALE", "Comprar", "Buy"],
  ["LONG_RENT", "Alquilar", "Rent"],
  ["SHORT_RENT", "Vacacional", "Holiday rentals"],
] as const;

/** Compact bar's mode chip: a short word (+ icon from sm); the full name stays in the native select's options. */
const MODE_CHIP = {
  SALE: { Icon: House, es: "Compra", en: "Buy" },
  LONG_RENT: { Icon: KeyRound, es: "Alquila", en: "Rent" },
  SHORT_RENT: { Icon: Palmtree, es: "Vaca.", en: "Holiday" },
} as const;

/** Chips: one tap runs exactly what the label says, nothing hidden. [label es, label en, query es, query en] */
const CHIPS: [string, string, string, string][] = [
  ["Frente al mar", "By the sea", "frente al mar", "by the sea"],
  ["Con piscina", "With a pool", "con piscina", "with a pool"],
  ["Áticos", "Penthouses", "ático", "penthouse"],
  ["Exclusivas", "Exclusive", "exclusivas de lujo", "exclusive luxury"],
];

/**
 * Conversational search (2035 home): the visitor writes what they want the way they'd tell a friend; the parser
 * (AI when configured, local heuristics otherwise) turns it into filters. While typing, known zones and cities are
 * suggested ("Lech" → Lechería) so a half-written place never silently becomes "every home".
 *
 * `sticky`: once this bar scrolls out under the header, a compact copy (same text, same mode, same submit) stays
 * pinned just below the header, Airbnb-style, so searching is always one tap away. It is portalled into the public
 * shell (so dark mode applies and no transformed parent breaks `position: fixed`) and is `inert` while hidden.
 */
export function AskBar({ locale, className, sticky = false }: { locale: Locale; className?: string; sticky?: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<(typeof MODES)[number][0]>("SALE");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const [stuck, setStuck] = useState(false);
  const [host, setHost] = useState<Element | null>(null);

  // Compact bar: shown while the big one has scrolled up behind the header (not while it's still below the fold).
  useEffect(() => {
    if (!sticky || !form.current || typeof IntersectionObserver === "undefined") return;
    setHost(form.current.closest(".np-public") ?? document.body);
    const io = new IntersectionObserver(([e]) => setStuck(!e.isIntersecting && e.boundingClientRect.top < 0), { rootMargin: "-76px 0px 0px 0px" });
    io.observe(form.current);
    return () => io.disconnect();
  }, [sticky]);

  const go = async (typed: string) => {
    const raw = typed.trim();
    setBusy(true);
    let q = heuristicSearchParse(raw);
    if (raw.trim()) {
      try {
        const r = await fetch("/api/v1/ai/search-parse", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ q: raw, locale }) });
        if (r.ok) q = (await r.json()).query;
      } catch {}
    }
    if (!q.listingType) q.listingType = mode as never;
    router.push(`/${locale}/search?${queryToParams(q, raw).toString()}`);
  };

  // Picking a suggested place searches straight away (Enter or click), like submitting the box.
  const suggest = usePlaceSuggest({ locale, text, setText, onPick: (next) => void go(next) });

  const compact = sticky && host
    ? createPortal(
        <CompactAsk locale={locale} shown={stuck} mode={mode} setMode={setMode} text={text} setText={setText} busy={busy} onSubmit={(typed) => void go(typed ?? text)} />,
        host,
      )
    : null;

  return (
    <>
    {compact}
    <form
      ref={form}
      data-hide-fab-mobile
      role="search"
      aria-label={tx(locale, "Buscar propiedades", "Search properties")}
      onSubmit={(e) => {
        e.preventDefault();
        void go(text);
      }}
      className={cn("np-glass w-full max-w-[760px] rounded-[28px] p-2.5 text-ink", className)}
    >
      <div className="flex items-center gap-1 px-1.5 pb-2 pt-1" role="group" aria-label={tx(locale, "Qué buscas", "What you're after")}>
        {MODES.map(([k, es, en]) => (
          <button
            key={k}
            type="button"
            aria-pressed={mode === k}
            onClick={() => setMode(k)}
            className={cn(
              "min-h-11 rounded-full px-4 font-display text-[14px] transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
              mode === k ? "bg-ink text-ivory shadow-[0_6px_16px_-6px_rgba(30,26,24,.6)]" : "text-ink/65 hover:bg-white/70 hover:text-ink",
            )}
          >
            {tx(locale, es, en)}
          </button>
        ))}
        <span className="ml-auto hidden items-center gap-1.5 pr-2 font-display text-[12px] text-ink/70 sm:flex">
          <Sparkles size={13} aria-hidden /> {tx(locale, "Escríbelo como se lo dirías a un amigo", "Say it like you'd tell a friend")}
        </span>
      </div>
      <div className="relative flex items-center gap-2 rounded-[22px] bg-white/85 py-1.5 pl-5 pr-1.5 ring-1 ring-black/[.04] focus-within:ring-2 focus-within:ring-ink/70">
        <input
          ref={input}
          {...suggest.inputProps}
          value={text}
          enterKeyHint="search"
          aria-label={tx(locale, "Describe la casa que buscas", "Describe the home you're looking for")}
          className="min-h-12 w-full bg-transparent font-display text-[16px] text-ink placeholder:text-ink/60 focus:outline-none sm:text-[17px]"
          placeholder={tx(locale, "Zona, tipo de casa o presupuesto", "Area, type of home or budget")}
        />
        {suggest.listbox}
        <button
          type="submit"
          aria-busy={busy}
          aria-label={tx(locale, "Buscar", "Search")}
          className="flex h-12 shrink-0 items-center justify-center gap-2 rounded-[18px] bg-coral-cta px-4 font-display text-[15px] font-semibold text-white transition-[background-color,transform] duration-300 hover:bg-coral-cta-hover active:scale-95 sm:px-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          <span className="hidden sm:inline">{tx(locale, "Buscar", "Search")}</span>
          <ArrowUp size={18} aria-hidden className="rotate-45 sm:hidden" />
        </button>
      </div>
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-1.5 pb-1 pt-2.5">
        {CHIPS.map(([es, en, qEs, qEn]) => (
          <button
            key={es}
            type="button"
            onClick={() => {
              const v = tx(locale, qEs, qEn);
              setText(v);
              void go(v);
            }}
            className="min-h-11 shrink-0 rounded-full border border-ink/10 bg-white/50 px-3.5 font-display text-[13px] text-ink/75 transition-colors hover:border-ink/30 hover:bg-white hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            {tx(locale, es, en)}
          </button>
        ))}
      </div>
    </form>
    </>
  );
}

/**
 * The pinned compact search: it REPLACES the header while shown (html[data-np-compact="on"] hides the header, see
 * globals.css), so it carries the roof mark (home link) and the menu button (opens the header drawer through
 * OPEN_MENU_EVENT). Mode as a native select (one tap on phones, fully accessible), the same text as the hero bar
 * and a round submit; the place suggestions open under the whole bar, not just the narrow input. Hidden = `inert`
 * (out of the tab order and the a11y tree).
 */
function CompactAsk({
  locale,
  shown,
  mode,
  setMode,
  text,
  setText,
  busy,
  onSubmit,
}: {
  locale: Locale;
  shown: boolean;
  mode: (typeof MODES)[number][0];
  setMode: (m: (typeof MODES)[number][0]) => void;
  text: string;
  setText: (v: string) => void;
  busy: boolean;
  /** `typed`: the completed text when a suggested place was picked (the parent's state isn't updated yet). */
  onSubmit: (typed?: string) => void;
}) {
  const id = useId();
  const suggest = usePlaceSuggest({ locale, text, setText, onPick: (next) => onSubmit(next) });
  const { saved, user, ready } = useApp();
  const chip = MODE_CHIP[mode];
  // Phones get the short placeholder ("Zona…"): the field is ~80 px wide at 360 once the mode word is shown.
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    const on = () => setWide(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  // Contract with the header: while this bar is shown the header steps away (one bar at the top, not two).
  useEffect(() => {
    const el = document.documentElement;
    if (shown) el.dataset.npCompact = "on";
    else delete el.dataset.npCompact;
    return () => void delete el.dataset.npCompact;
  }, [shown]);
  const ring = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";
  return (
    <div
      data-sticky-search
      inert={!shown || undefined}
      aria-hidden={!shown || undefined}
      className={cn(
        "pointer-events-none fixed inset-x-0 z-[39] px-2.5 transition-[opacity,transform,top] duration-500 ease-[cubic-bezier(.16,1,.3,1)] md:px-5 print:hidden",
        "top-[calc(env(safe-area-inset-top)+8px)]",
        shown ? "translate-y-0 opacity-100" : "-translate-y-3 opacity-0",
      )}
    >
      <form
        role="search"
        aria-label={tx(locale, "Búsqueda rápida", "Quick search")}
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className={cn("np-glass relative mx-auto flex h-14 max-w-[720px] items-center gap-1 rounded-full p-1.5 text-ink lg:max-w-[940px]", shown && "pointer-events-auto")}
      >
        <Link href={`/${locale}`} aria-label={tx(locale, "New Place, inicio", "New Place, home")} className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-black/5", ring)}>
          <RoofMark small className="h-[13px] w-[36px]" ink="var(--np-logo-ink, var(--np-navy))" teja="var(--np-logo-teja, var(--np-coral))" />
        </Link>
        <label htmlFor={`${id}-mode`} className="sr-only">
          {tx(locale, "Qué buscas", "What you're after")}
        </label>
        {/* Mode chip: always the short word ("Compra", "Alquila", "Vaca.") so it never reads as a "home" button; the icon
            joins it from sm. The native select sits invisibly on top: one tap opens the system picker with the full names. */}
        <span data-mode-chip className="relative flex h-11 shrink-0 items-center gap-1 rounded-full bg-ink pl-3 pr-2 font-display text-[14px] font-medium text-ivory has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink sm:gap-1.5 sm:pl-3.5 sm:pr-2.5 [html.dark_&]:text-[#1E1A18]">
          <chip.Icon size={16} strokeWidth={1.8} aria-hidden className="hidden sm:block" />
          <span aria-hidden>{tx(locale, chip.es, chip.en)}</span>
          <ChevronDown size={14} aria-hidden className="opacity-80" />
          <select
            id={`${id}-mode`}
            value={mode}
            onChange={(e) => setMode(e.target.value as (typeof MODES)[number][0])}
            className="absolute inset-0 h-full w-full cursor-pointer appearance-none rounded-full opacity-0"
          >
            {MODES.map(([k, es, en]) => (
              <option key={k} value={k}>
                {tx(locale, es, en)}
              </option>
            ))}
          </select>
        </span>
        <Search size={17} aria-hidden className="ml-2 hidden shrink-0 text-ink/55 sm:block" />
        <span className="flex min-w-0 flex-1">
          <input
            id={`${id}-q`}
            {...suggest.inputProps}
            value={text}
            enterKeyHint="search"
            aria-label={tx(locale, "Describe la casa que buscas", "Describe the home you're looking for")}
            placeholder={wide ? tx(locale, "Buscar zona…", "Search area…") : tx(locale, "Zona…", "Area…")}
            className="h-11 min-w-0 flex-1 bg-transparent px-1.5 font-display text-[16px] text-ink placeholder:text-ink/60 focus:outline-none"
          />
        </span>
        {/* Anchored to the whole bar (the form is `relative`): full place names, never "Mara…". */}
        {suggest.listbox}
        <button
          type="submit"
          aria-busy={busy}
          aria-label={tx(locale, "Buscar", "Search")}
          className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-coral-cta text-white transition-[background-color,transform] duration-300 hover:bg-coral-cta-hover active:scale-95 md:w-auto md:gap-2 md:px-5", ring)}
        >
          <ArrowUp size={18} aria-hidden className="rotate-45 md:hidden" />
          <span className="hidden font-display text-[15px] font-semibold md:inline">{tx(locale, "Buscar", "Search")}</span>
        </button>
        {/* Desktop: the compact bar replaces the header, so it keeps the header's everyday shortcuts. */}
        <Link href={`/${locale}/saved`} aria-label={tx(locale, "Guardados", "Saved")} className={cn("relative ml-1 hidden h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-black/5 lg:flex", ring)}>
          <Heart size={19} aria-hidden />
          {saved.length > 0 && <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-navy px-1 text-[11px] font-bold leading-none text-ivory ring-2 ring-ivory">{saved.length}</span>}
        </Link>
        {ready && (
          <Link
            href={user ? `/${locale}${roleHome(user.role)}` : `/${locale}/login`}
            aria-label={user ? tx(locale, "Tu espacio", "Your space") : tx(locale, "Entrar", "Sign in")}
            className={cn("hidden h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-black/5 lg:flex", ring)}
          >
            {user ? <Avatar initials={user.initials} hue={user.hue} size={32} /> : <User size={19} aria-hidden />}
          </Link>
        )}
        <Link href={`/${locale}/sell`} className={cn("hidden h-11 shrink-0 items-center rounded-full border-[1.5px] border-ink/70 px-4 font-display text-[14px] font-semibold text-ink hover:bg-black/5 xl:flex", ring)}>
          {tx(locale, "Vender", "Sell")}
        </Link>
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent(OPEN_MENU_EVENT))}
          aria-label={tx(locale, "Abrir menú", "Open menu")}
          aria-haspopup="dialog"
          className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-black/5", ring)}
        >
          <Menu size={21} aria-hidden />
        </button>
      </form>
    </div>
  );
}

import type { ReactNode, SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import type { ListingStatus, Locale } from "@/types/domain";
import { Monogram, RoofMark } from "@/components/brand/Logo";
import { LISTING_PHASE, listingPhase, phaseHint, phaseLabel } from "@/lib/lifecycle";
import { cn } from "@/lib/cn";

/**
 * Private-area kit (brand v4): light "Cal" cockpit with white cards, Cormorant titles and Manrope UI.
 * Every class carries its dark-mode twin (navy surfaces #2A2420, accent #C9A574) for the theme toggle.
 * Terracotta is reserved for the single main action of a view: never in charts, chips or data.
 */
/**
 * Five KPI cards without orphans: phones 2+2+1 with the fifth spanning the row, lg 3+2 on a 6-track grid (top three
 * span 2, bottom two span 3), xl one row of five.
 */
export const kpiGrid5 =
  "grid grid-cols-2 gap-3 sm:gap-4 [&>*]:min-w-0 [&>:nth-child(5)]:col-span-2 lg:grid-cols-6 lg:[&>*]:col-span-2 lg:[&>:nth-child(n+4)]:col-span-3 xl:grid-cols-5 xl:[&>*]:col-span-1 xl:[&>:nth-child(n+4)]:col-span-1";

export const k = {
  /** White card, radius 18, soft navy shadow. */
  /** Last table column stays in view (actions never hide behind a horizontal scroll). */
  stickyCol: "bg-white shadow-[-14px_0_18px_-14px_rgba(30,26,24,.22)] dark:bg-navy-card",
  card: "rounded-[18px] bg-white shadow-[0_8px_24px_rgba(30,26,24,.06)] dark:bg-navy-card dark:shadow-none dark:ring-1 dark:ring-white/[.07]",
  line: "border-[#ECE6DA] dark:border-white/10",
  divide: "divide-[#ECE6DA] dark:divide-white/10",
  muted: "text-muted dark:text-mist",
  soft: "bg-[#F6F2EA] dark:bg-white/[.05]",
  hover: "hover:bg-[#FAF7F1] dark:hover:bg-white/[.04]",
  /** Table head / KPI label: uppercase 11–12 px, tracking .12em. */
  th: "text-[11px] font-semibold uppercase tracking-[.12em] text-muted dark:text-mist [&_th]:whitespace-nowrap",
  label: "text-[12px] font-semibold uppercase tracking-[.12em] text-muted dark:text-mist",
  eyebrow: "text-[12px] font-semibold uppercase tracking-[.16em] text-gold-text dark:text-[#D4B98C]",
  /** Card titles in Cormorant. */
  title: "font-serif text-[24px] font-medium leading-tight text-navy dark:text-ivory",
  titleSm: "font-serif text-[20px] font-medium leading-tight text-navy dark:text-ivory",
  /** Data figures: Manrope 600 with lining proportional numerals, tight tracking so "14" never splits. */
  num: "font-display font-semibold tracking-[-0.05em] [font-feature-settings:'lnum','pnum'] text-navy dark:text-ivory",
  input:
    "h-11 w-full rounded-xl border border-[#D8CBB7] bg-white px-3.5 text-[15px] text-navy placeholder:text-muted/70 transition-colors duration-np focus:border-navy focus:outline-none disabled:cursor-not-allowed disabled:bg-[#F6F2EA] disabled:text-muted md:h-10 dark:border-white/15 dark:bg-navy dark:text-ivory dark:placeholder:text-mist/60 dark:focus:border-[#C9A574] dark:disabled:bg-white/[.04] dark:disabled:text-mist",
  /** Compact select inside tables. */
  select:
    "h-9 rounded-lg border border-[#D8CBB7] bg-white px-2.5 text-[13px] text-navy focus:border-navy focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/15 dark:bg-navy dark:text-ivory",
  link: "font-semibold text-navy underline decoration-navy/30 underline-offset-4 hover:decoration-navy dark:text-[#C9A574] dark:decoration-[#C9A574]/40",
  err: "rounded-xl border border-danger/25 bg-[#B3261E0D] px-3.5 py-2.5 text-sm text-danger dark:border-[#C9A574]/30 dark:bg-[#B3261E26] dark:text-[#F3B4A3]",
  warnBox: "rounded-xl border border-warn/25 bg-[#8A5A000F] px-3.5 py-2.5 text-sm text-warn dark:border-[#F2B866]/30 dark:bg-[#8A5A0026] dark:text-[#F2C987]",
  okBox: "rounded-xl border border-ok/25 bg-[#2F6B4F0F] px-3.5 py-2.5 text-sm text-ok dark:border-[#7FC8A4]/30 dark:bg-[#2F6B4F33] dark:text-[#9AD6B6]",
  /** Button skins (pass as className to ui/Button). */
  primary: "dark:bg-[#C9A574] dark:text-navy dark:hover:bg-[#EDAE97]",
  navy: "dark:bg-ivory dark:text-navy dark:hover:bg-white",
  /** On top of ui/Button "outline" (1.5 px navy): selected-state hover + dark-theme twin. */
  outline: "border-navy bg-transparent text-navy hover:bg-[#E6DDD2] dark:border-ivory/50 dark:bg-transparent dark:text-ivory dark:hover:bg-white/[.06]",
  ghost: "text-navy hover:bg-[#E6DDD2] dark:text-ivory dark:hover:bg-white/[.06]",
  okText: "text-ok dark:text-[#7FC8A4]",
  warnText: "text-warn dark:text-[#F2B866]",
  dangerText: "text-danger dark:text-[#F3A493]",
  /** Dark-mode token remap for the admin wrapper (ui primitives use the ink/line/muted tokens). */
  darkVars: "dark:[--np-ink-rgb:238_241_244] dark:[--np-ink:#F1EBE3] dark:[--np-line-rgb:42_62_85] dark:[--np-muted-rgb:169_180_194]",
};

/** Filter tab / segmented choice. Selected = #E6DDD2 with a 2 px navy border (brand interaction states). */
export const tab = (on: boolean) =>
  cn(
    "inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 font-display text-[14px] font-medium transition-colors duration-np",
    on
      ? "bg-[#E6DDD2] text-navy shadow-[inset_0_0_0_2px_#1E1A18] dark:bg-white/10 dark:text-ivory dark:shadow-[inset_0_0_0_2px_#C9A574]"
      : "bg-white text-navy/80 shadow-[inset_0_0_0_1px_#D8CBB7] hover:text-navy hover:shadow-[inset_0_0_0_1px_#1E1A18] dark:bg-transparent dark:text-ivory/75 dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,.18)] dark:hover:text-ivory",
  );

/** Counter inside a tab or nav item: neutral, never terracotta. */
export function Count({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#F1EBE3] px-1.5 text-[11px] font-semibold text-navy [font-feature-settings:'lnum','tnum']", className)}>{children}</span>;
}

export function Panel({ title, eyebrow, action, children, className, bodyClass, id, as: As = "section" }: { title?: ReactNode; eyebrow?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; bodyClass?: string; id?: string; as?: "section" | "div" | "form" }) {
  return (
    <As id={id} className={cn(k.card, "p-5 md:p-6", className)}>
      {(title || action) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <div className="min-w-0">
            {eyebrow && <div className={cn(k.label, "mb-1")}>{eyebrow}</div>}
            {title && <h2 className={k.title}>{title}</h2>}
          </div>
          {action}
        </div>
      )}
      <div className={bodyClass}>{children}</div>
    </As>
  );
}

export function Kpi({ label, value, delta, hint, down, deltaNote, className }: { label: string; value: ReactNode; delta?: string; hint?: string; down?: boolean; /** Shown as a muted "—" with this tooltip instead of a delta (e.g. too little data to compare). */ deltaNote?: string; className?: string }) {
  return (
    <div className={cn(k.card, "min-w-0 px-4 pb-4 pt-4 sm:px-5 sm:pb-5 sm:pt-[18px] md:px-6", className)}>
      <div className={cn(k.label, "line-clamp-2 min-h-[2.5em] leading-[1.25] sm:line-clamp-1 sm:min-h-0 xl:line-clamp-2 xl:min-h-[2.5em]")}>{label}</div>
      <div className={cn(k.num, "mt-2 text-[30px] leading-none sm:text-[34px] md:text-[40px]")}>{value}</div>
      {(delta || hint || deltaNote) && (
        <div className="mt-2.5 flex flex-wrap items-baseline gap-x-1.5 text-[13px] sm:text-[14px]">
          {!delta && deltaNote && <span className={cn("cursor-help font-semibold", k.muted)} title={deltaNote}><span aria-hidden>—</span><span className="sr-only">{deltaNote}</span></span>}
          {delta && <span className={cn("font-semibold", down ? k.dangerText : k.okText)}>{down ? "▼" : "▲"}&#8239;{delta}</span>}
          {hint && <span className={delta ? k.muted : cn(k.muted)}>{hint}</span>}
        </div>
      )}
    </div>
  );
}

type Tone = "neutral" | "egeo" | "arena" | "ok" | "warn" | "danger" | "navy" | "exclusive" | "muted";
const TONE: Record<Tone, string> = {
  neutral: "bg-[#E6DDD2] text-navy dark:bg-white/10 dark:text-ivory",
  egeo: "bg-egeo/55 text-[#413934] dark:bg-egeo/20 dark:text-[#E3D8CA]",
  arena: "bg-arena text-[#5E4A2A] dark:bg-arena/15 dark:text-[#D9C6AB]",
  ok: "bg-[#2F6B4F14] text-ok dark:bg-[#2F6B4F40] dark:text-[#9AD6B6]",
  warn: "bg-[#8A5A0014] text-warn dark:bg-[#8A5A0033] dark:text-[#F2C987]",
  danger: "bg-[#B3261E12] text-danger dark:bg-[#B3261E33] dark:text-[#F3B4A3]",
  navy: "bg-navy text-ivory dark:bg-ivory dark:text-navy",
  muted: "bg-transparent text-muted shadow-[inset_0_0_0_1px_#D8CBB7] dark:text-mist dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,.18)]",
  exclusive: "bg-white text-coral shadow-[inset_0_0_0_1px_rgb(168_69_42/.3)] dark:bg-transparent dark:text-[#C9A574] dark:shadow-[inset_0_0_0_1px_rgb(231_154_127/.4)]",
};

/** Status badge: uppercase, tracking .12em; "Exclusiva" carries the roof glyph. */
export function Pill({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-[3px] text-[11px] font-semibold uppercase tracking-[.12em]", TONE[tone], className)}>
      {tone === "exclusive" && <RoofMark className="h-[7px] w-[18px]" ink="currentColor" teja="currentColor" small />}
      {children}
    </span>
  );
}

/** Neutral data chip (e.g. "Interés 92"): never terracotta. */
export function Chip({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center whitespace-nowrap rounded-full bg-[#E6DDD2] px-2.5 py-1 text-[12px] font-semibold text-navy [font-feature-settings:'lnum','pnum'] dark:bg-white/10 dark:text-ivory", className)}>{children}</span>;
}

/** Listing status for the private areas, with the shared lifecycle labels (@/lib/lifecycle): review wins while it isn't approved. */
export function StatusPill({ status, review, takedownReason, locale, className }: { status: ListingStatus; review?: "PENDING" | "APPROVED" | "REJECTED"; takedownReason?: string | null; locale: Locale; className?: string }) {
  const p = listingPhase({ status, review, takedownReason });
  return (
    <Pill tone={LISTING_PHASE[p].tone} className={className}>
      <span title={phaseHint(p, locale)}>{phaseLabel(p, locale)}</span>
    </Pill>
  );
}

/** Initials on an arena disc, serif (lead lists, as in the approved dashboard). */
export function Initials({ name, size = 44, className }: { name: string; size?: number; className?: string }) {
  const ini = name.split(/\s+/).filter(Boolean).map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "?";
  return (
    <span className={cn("inline-flex shrink-0 items-center justify-center rounded-full bg-arena font-serif font-medium text-navy dark:bg-arena/20 dark:text-ivory", className)} style={{ width: size, height: size, fontSize: size * 0.42 }} aria-hidden>
      {ini}
    </span>
  );
}

/** Empty state from the brand sheet: NP monogram on a rosa disc, Cormorant title, one quiet action. */
export function Empty({ title, body, cta, className }: { title: string; body?: string; cta?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-12 text-center", className)}>
      <Monogram className="h-20 w-20" bg="#EBD5C8" ink="#1E1A18" teja="#8E3B22" />
      <div className="mt-4 max-w-sm font-serif text-[26px] font-medium leading-tight text-navy dark:text-ivory">{title}</div>
      {body && <p className={cn("mt-2 max-w-sm text-[15px]", k.muted)}>{body}</p>}
      {cta && <div className="mt-5">{cta}</div>}
    </div>
  );
}

/** Page heading for the client/owner areas (public shell): gold eyebrow + Cormorant title. */
export function PageHead({ eyebrow, title, sub, action, className }: { eyebrow?: ReactNode; title: ReactNode; sub?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        {eyebrow && <div className={k.eyebrow}>{eyebrow}</div>}
        <h1 className="mt-1.5 font-serif text-[40px] font-medium leading-[1.05] text-navy md:text-[48px] dark:text-ivory">{title}</h1>
        {sub && <p className={cn("mt-2 text-[15px]", k.muted)}>{sub}</p>}
      </div>
      {action}
    </div>
  );
}

/**
 * Native select in the cockpit skin (palette A): no OS chrome (appearance-none), rounded, a quiet custom chevron and a
 * dark twin (color-scheme dark so the option list opens dark too). `compact` = the 36 px in-table size (k.select);
 * `wrapClassName` sizes the wrapper (e.g. "flex-1 min-w-0", "w-full"); `className` reaches the <select>.
 */
export function Select({ compact, className, wrapClassName, children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { compact?: boolean; wrapClassName?: string }) {
  return (
    <span className={cn("relative inline-flex min-w-0 align-middle", compact ? "" : "w-full", wrapClassName)}>
      <select
        {...props}
        className={cn(
          compact ? k.select : k.input,
          "w-full min-w-0 cursor-pointer appearance-none truncate hover:border-navy/60 disabled:cursor-not-allowed dark:[color-scheme:dark] dark:hover:border-white/30",
          compact ? "pr-8" : "pr-10",
          className,
        )}
      >
        {children}
      </select>
      <ChevronDown aria-hidden size={compact ? 14 : 16} strokeWidth={1.8} className={cn("pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted dark:text-mist", compact ? "right-2.5" : "right-3.5")} />
    </span>
  );
}

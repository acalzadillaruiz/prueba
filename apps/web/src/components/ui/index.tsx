import Link from "next/link";
import { cn } from "@/lib/cn";
import type { HTMLAttributes, ReactNode } from "react";
import { Monogram } from "@/components/brand/Logo";

/**
 * Buttons (043 · Caracas Night, DESIGN.md §5): flat 2 px rectangles, Jost 500 in sentence case, no shadow, no arrow.
 * Primary = night fill with bone text (bone with night text on night surfaces, see globals.css); secondary ("outline")
 * = 1 px currentColor border on a transparent ground; "light" = bone fill for night and photo grounds.
 * Legacy names stay valid: "coral" and "navy" = primary, "gold" = light.
 */
type BtnVariant = "primary" | "coral" | "navy" | "ghost" | "outline" | "light" | "dark-ghost" | "dark-outline" | "gold";
const PRIMARY = "bg-coral-cta text-white hover:bg-coral-cta-hover active:bg-coral-cta-hover";
const LIGHT = "bg-[#F6F2EC] text-[#0E1A2B] hover:bg-[#E9E1D3]"; // fixed hexes: stays bone on night in dark mode too
const BTN: Record<BtnVariant, string> = {
  primary: PRIMARY,
  coral: PRIMARY,
  navy: "np-btn-navy bg-navy text-white hover:bg-navy-2",
  outline: "np-btn-outline border border-current bg-transparent text-ink hover:bg-ink/5",
  ghost: "text-ink hover:bg-ink/5",
  light: LIGHT,
  gold: LIGHT,
  "dark-ghost": "text-white/85 hover:bg-white/10 hover:text-white",
  "dark-outline": "border border-current bg-transparent text-ivory hover:bg-white/10",
};
// 48 px for the main sizes (DESIGN.md: CTA 48), 40 px for the small one (dense panels).
const SIZE = { sm: "h-10 px-4 text-[14px]", md: "h-12 px-6 text-[16px]", lg: "h-12 px-8 text-[16px]" };
const SIZE_ARROW = { sm: "h-10 pl-4 pr-1.5", md: "h-12 pl-6 pr-1.5", lg: "h-12 pl-8 pr-1.5" };
const CIRCLE = { sm: "h-7 w-7", md: "h-8 w-8", lg: "h-9 w-9" };

export function ArrowCircle({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("ml-2 inline-flex shrink-0 items-center justify-center rounded-full bg-white text-ink", className)}>
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6.5 3.5 11 8l-4.5 4.5" /></svg>
    </span>
  );
}

export function Button({
  children,
  variant = "coral",
  size = "md",
  className,
  href,
  arrow,
  ...rest
}: {
  children: ReactNode;
  variant?: BtnVariant;
  size?: keyof typeof SIZE;
  className?: string;
  href?: string;
  /** The arrow circle (off by default since 043: the label names the action). */
  arrow?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const withArrow = arrow ?? false;
  const cls = cn(
    "inline-flex items-center justify-center gap-2 rounded-[2px] font-display font-medium transition-[background-color,color,transform] duration-np ease-np active:scale-[.98] disabled:cursor-not-allowed disabled:bg-[#E9E1D3] disabled:text-[#77706A] disabled:border-transparent whitespace-nowrap",
    BTN[variant],
    withArrow ? cn(SIZE[size].split(" ").filter((c) => c.startsWith("text-")).join(" "), SIZE_ARROW[size]) : SIZE[size],
    className,
  );
  const body = withArrow ? (
    <>
      <span className="inline-flex flex-1 items-center justify-center gap-2">{children}</span>
      <ArrowCircle className={CIRCLE[size]} />
    </>
  ) : (
    children
  );
  if (href) return <Link href={href} className={cls} aria-label={rest["aria-label"]}>{body}</Link>;
  return <button className={cls} {...rest}>{body}</button>;
}

type BadgeTone = "neutral" | "coral" | "gold" | "ok" | "warn" | "danger" | "navy" | "mist" | "dark" | "exclusive" | "egeo" | "arena";
/**
 * Pills. Brand tones: "exclusive" (white, terracotta text, roof glyph, 1 px terracotta 30 % border), "egeo" (map/chips blue)
 * and "arena". Status tones (ok/warn/danger) are for notices only, never decoration.
 */
export function Badge({ children, tone = "neutral", className }: { children: ReactNode; tone?: BadgeTone; className?: string }) {
  const t = {
    neutral: "bg-black/5 text-ink dark:bg-white/10 dark:text-[#F6F2EC]",
    coral: "bg-[#0E1A2B1F] text-coral-hover dark:bg-[#E9E1D326] dark:text-[#E9E1D3]",
    gold: "bg-[#C9BFAE29] text-gold-text dark:text-[#C9BFAE]",
    ok: "bg-[#2F6F4E1F] text-ok dark:bg-[#7FC8A426] dark:text-[#7FC8A4]",
    warn: "bg-[#8A5A0024] text-[#7A4F00] dark:bg-[#F2B86626] dark:text-[#F2B866]",
    danger: "bg-[#B3261E1A] text-danger dark:bg-[#F2A09A26] dark:text-[#F2A09A]",
    navy: "bg-navy text-ivory",
    mist: "bg-[#A9B1BC2E] text-[#4E453F] dark:text-[#DECEB9]",
    dark: "bg-white/10 text-ivory",
    exclusive: "bg-white/90 text-[#0E1A2B] outline outline-1 -outline-offset-1 outline-[rgb(14_26_43/.3)]",
    egeo: "bg-[#C9BFAE] text-[#0E1A2B]",
    arena: "bg-[#E9E1D3] text-[#1A2026]",
  }[tone];
  const caps = tone === "exclusive" || tone === "egeo" || tone === "arena";
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full", caps ? "px-3 py-1 text-[11px] font-semibold" : "px-2.5 py-0.5 text-xs font-semibold", t, className)}>
      {children}
    </span>
  );
}

export function Card({ children, className, dark, ...rest }: { children: ReactNode; className?: string; dark?: boolean } & Omit<HTMLAttributes<HTMLDivElement>, "className" | "children">) {
  return (
    <div {...rest} className={cn(dark ? "rounded-np border border-navy-line bg-navy-card text-ivory" : "rounded-np border border-line bg-white", className)}>
      {children}
    </div>
  );
}

export function Avatar({ initials, hue = 12, size = 36, className }: { initials: string; hue?: number; size?: number; className?: string }) {
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-display font-semibold text-white", className)}
      style={{ width: size, height: size, fontSize: size * 0.38, background: `linear-gradient(135deg, hsl(${hue} 55% 55%), hsl(${(hue + 40) % 360} 45% 35%))` }}
    >
      {initials}
    </span>
  );
}

export function Field({ label, children, hint, dark, error }: { label: string; children: ReactNode; hint?: string; dark?: boolean; error?: string }) {
  return (
    <label className="block">
      <span className={cn("mb-1.5 block text-sm font-semibold", dark ? "text-ivory/80" : "text-ink/80")}>{label}</span>
      {children}
      {error ? (
        <span role="alert" className={cn("mt-1 block text-xs font-semibold", dark ? "text-[#E9E1D3]" : "text-danger")}>{error}</span>
      ) : (
        hint && <span className={cn("mt-1 block text-xs", dark ? "text-mist" : "text-muted")}>{hint}</span>
      )}
    </label>
  );
}

export const inputCls =
  "h-11 w-full rounded-np border border-line bg-white px-3.5 text-[15px] text-ink placeholder:text-muted transition-colors duration-np focus:border-navy focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#735D3F] aria-[invalid=true]:border-danger";
export const darkInputCls =
  "h-10 w-full rounded-np border border-navy-line bg-navy-2 px-3 text-sm text-ivory placeholder:text-mist/60 focus:border-coral focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E9E1D3]";

export function Stat({ label, value, delta, dark, hint }: { label: string; value: ReactNode; delta?: string; dark?: boolean; hint?: string }) {
  const up = delta?.startsWith("+");
  return (
    <div className={cn("rounded-np p-4", dark ? "border border-navy-line bg-navy-card" : "border border-line bg-white")}>
      <div className={cn("text-[13px] font-semibold", dark ? "text-mist" : "text-muted")}>{label}</div>
      <div className="mt-1.5 flex items-baseline gap-2">
        <span className="font-display text-2xl font-semibold">{value}</span>
        {delta && <span className={cn("text-xs font-semibold", up ? "text-[#5FBF8F]" : "text-coral")}>{delta}</span>}
      </div>
      {hint && <div className={cn("mt-1 text-xs", dark ? "text-mist/80" : "text-muted")}>{hint}</div>}
    </div>
  );
}

export function SectionTitle({ children, action, className }: { children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("mb-4 flex items-end justify-between gap-4", className)}>
      <h2 className="font-serif text-[28px] leading-tight md:text-[34px]">{children}</h2>
      {action}
    </div>
  );
}

export function Progress({ value, className, tone = "coral" }: { value: number; className?: string; tone?: "coral" | "ok" | "gold" | "warn" }) {
  const c = { coral: "bg-coral", ok: "bg-ok", gold: "bg-gold", warn: "bg-warn" }[tone];
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-black/10", className)}>
      <div className={cn("h-full rounded-full", c)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

/** Empty state: rosa-cal circle with the NP monogram whose roof draws itself (static under reduced motion). */
export function EmptyState({ icon, title, body, cta, dark, monogram }: { icon?: ReactNode; title: string; body: string; cta?: ReactNode; dark?: boolean; monogram?: boolean }) {
  return (
    <div className={cn("flex flex-col items-center rounded-np border px-6 py-12 text-center", dark ? "border-navy-line" : "border-line bg-white")}>
      {monogram || !icon ? (
        <Monogram className="mb-4 h-16 w-16" bg={dark ? "#1E3049" : "#E9E1D3"} ink={dark ? "#F6F2EC" : "#1A2026"} teja={dark ? "#E9E1D3" : "#0E1A2B"} animate />
      ) : (
        <div className={cn("mb-4 flex h-14 w-14 items-center justify-center rounded-full", dark ? "bg-white/5 text-[#E9E1D3]" : "bg-rosa text-coral")}>{icon}</div>
      )}
      <div className="font-serif text-2xl">{title}</div>
      <p className={cn("mt-1.5 max-w-sm text-[15px]", dark ? "text-mist" : "text-muted")}>{body}</p>
      {cta && <div className="mt-5">{cta}</div>}
    </div>
  );
}

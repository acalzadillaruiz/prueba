import Link from "next/link";
import { cn } from "@/lib/cn";
import type { HTMLAttributes, ReactNode } from "react";
import { Monogram, RoofGlyph } from "@/components/brand/Logo";

/**
 * Brand v4 buttons (pill). One solid terracotta ("primary") per visible view: the main action only.
 * Everything else is navy: solid ("navy") or 1.5 px outline ("outline"). On navy surfaces use "light" / "dark-outline".
 * Legacy names stay valid: "coral" = primary, "gold" = light (gold is reserved for thin fillets).
 */
type BtnVariant = "primary" | "coral" | "navy" | "ghost" | "outline" | "light" | "dark-ghost" | "dark-outline" | "gold";
const PRIMARY = "bg-coral-cta text-white hover:bg-coral-cta-hover active:bg-coral-cta-hover";
const LIGHT = "bg-ivory text-navy hover:bg-white";
const BTN: Record<BtnVariant, string> = {
  primary: PRIMARY,
  coral: PRIMARY,
  navy: "np-btn-navy bg-navy text-ivory hover:bg-navy-2",
  outline: "np-btn-outline border-[1.5px] border-navy bg-transparent text-navy hover:bg-navy/5",
  ghost: "text-ink hover:bg-black/5",
  light: LIGHT,
  gold: LIGHT,
  "dark-ghost": "text-ivory/80 hover:bg-white/5 hover:text-ivory",
  "dark-outline": "border-[1.5px] border-ivory/60 text-ivory hover:border-ivory hover:bg-white/5",
};
// md is 44 px tall on touch-sized screens (tap target), 40 px from md up.
const SIZE = { sm: "h-9 px-4 text-sm", md: "h-11 px-5 text-[15px] md:h-10", lg: "h-12 px-7 text-[15px]" };

export function Button({
  children,
  variant = "coral",
  size = "md",
  className,
  href,
  ...rest
}: {
  children: ReactNode;
  variant?: BtnVariant;
  size?: keyof typeof SIZE;
  className?: string;
  href?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const cls = cn(
    "inline-flex items-center justify-center gap-2 rounded-full font-display font-semibold tracking-[0.01em] transition-colors duration-np ease-np disabled:cursor-not-allowed disabled:bg-[#E3DDD3] disabled:text-[#8A8F96] disabled:border-transparent whitespace-nowrap",
    BTN[variant],
    SIZE[size],
    className,
  );
  if (href) return <Link href={href} className={cls}>{children}</Link>;
  return <button className={cls} {...rest}>{children}</button>;
}

type BadgeTone = "neutral" | "coral" | "gold" | "ok" | "warn" | "danger" | "navy" | "mist" | "dark" | "exclusive" | "egeo" | "arena";
/**
 * Pills. Brand tones: "exclusive" (white, terracotta text, roof glyph, 1 px terracotta 30 % border), "egeo" (map/chips blue)
 * and "arena". Status tones (ok/warn/danger) are for notices only, never decoration.
 */
export function Badge({ children, tone = "neutral", className }: { children: ReactNode; tone?: BadgeTone; className?: string }) {
  const t = {
    neutral: "bg-black/5 text-ink dark:bg-white/10 dark:text-[#F1EBE3]",
    coral: "bg-[#8E3B221F] text-coral-hover dark:bg-[#C9A57426] dark:text-[#C9A574]",
    gold: "bg-[#B08A5529] text-gold-text dark:text-[#D4B98C]",
    ok: "bg-[#2F6B4F1F] text-ok dark:bg-[#7FC8A426] dark:text-[#7FC8A4]",
    warn: "bg-[#8A5A0024] text-[#7A4F00] dark:bg-[#F2B86626] dark:text-[#F2B866]",
    danger: "bg-[#B3261E1A] text-danger dark:bg-[#F2A09A26] dark:text-[#F2A09A]",
    navy: "bg-navy text-ivory",
    mist: "bg-[#B5AAA02E] text-[#4E453F] dark:text-[#DECEB9]",
    dark: "bg-white/10 text-ivory",
    exclusive: "bg-[#ffffff] text-[#8E3B22] shadow-[inset_0_0_0_1px_rgba(142,59,34,.3)]",
    egeo: "bg-[#C2A988] text-[#433B35]",
    arena: "bg-[#D9C6AB] text-[#1E1A18]",
  }[tone];
  const caps = tone === "exclusive" || tone === "egeo" || tone === "arena";
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full", caps ? "px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]" : "px-2.5 py-0.5 text-xs font-semibold", t, className)}>
      {tone === "exclusive" && <RoofGlyph className="h-[6px] w-[13px]" />}
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
        <span role="alert" className={cn("mt-1 block text-xs font-semibold", dark ? "text-[#C9A574]" : "text-danger")}>{error}</span>
      ) : (
        hint && <span className={cn("mt-1 block text-xs", dark ? "text-mist" : "text-muted")}>{hint}</span>
      )}
    </label>
  );
}

export const inputCls =
  "h-11 w-full rounded-np border border-line bg-white px-3.5 text-[15px] text-ink placeholder:text-muted transition-colors duration-np focus:border-navy focus:shadow-[0_0_0_1px_var(--np-navy)] focus:outline-none aria-[invalid=true]:border-danger";
export const darkInputCls =
  "h-10 w-full rounded-np border border-navy-line bg-navy-2 px-3 text-sm text-ivory placeholder:text-mist/60 focus:border-coral focus:outline-none";

export function Stat({ label, value, delta, dark, hint }: { label: string; value: ReactNode; delta?: string; dark?: boolean; hint?: string }) {
  const up = delta?.startsWith("+");
  return (
    <div className={cn("rounded-np p-4", dark ? "border border-navy-line bg-navy-card" : "border border-line bg-white")}>
      <div className={cn("text-xs font-semibold uppercase tracking-wide", dark ? "text-mist" : "text-muted")}>{label}</div>
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
        <Monogram className="mb-4 h-16 w-16" bg={dark ? "#3A322D" : "#EBD5C8"} ink={dark ? "#F1EBE3" : "#1E1A18"} teja={dark ? "#C9A574" : "#8E3B22"} animate />
      ) : (
        <div className={cn("mb-4 flex h-14 w-14 items-center justify-center rounded-full", dark ? "bg-white/5 text-[#C9A574]" : "bg-rosa text-coral")}>{icon}</div>
      )}
      <div className="font-serif text-2xl">{title}</div>
      <p className={cn("mt-1.5 max-w-sm text-[15px]", dark ? "text-mist" : "text-muted")}>{body}</p>
      {cta && <div className="mt-5">{cta}</div>}
    </div>
  );
}

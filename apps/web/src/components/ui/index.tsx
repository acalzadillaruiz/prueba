import Link from "next/link";
import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

type BtnVariant = "coral" | "navy" | "ghost" | "outline" | "dark-ghost" | "dark-outline" | "gold";
const BTN: Record<BtnVariant, string> = {
  coral: "bg-coral text-white hover:bg-coral-hover shadow-sm",
  navy: "bg-navy text-ivory hover:bg-navy-2",
  gold: "bg-gold text-navy hover:brightness-95",
  ghost: "text-ink hover:bg-black/5",
  outline: "border border-line bg-white text-ink hover:border-navy/30",
  "dark-ghost": "text-ivory/80 hover:bg-white/5 hover:text-ivory",
  "dark-outline": "border border-navy-line text-ivory hover:bg-white/5",
};
const SIZE = { sm: "h-8 px-3 text-sm", md: "h-10 px-4 text-[15px]", lg: "h-12 px-6 text-base" };

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
    "inline-flex items-center justify-center gap-2 rounded-np font-display font-medium transition-all duration-np ease-np disabled:opacity-50 whitespace-nowrap",
    BTN[variant],
    SIZE[size],
    className,
  );
  if (href) return <Link href={href} className={cls}>{children}</Link>;
  return <button className={cls} {...rest}>{children}</button>;
}

export function Badge({ children, tone = "neutral", className }: { children: ReactNode; tone?: "neutral" | "coral" | "gold" | "ok" | "warn" | "danger" | "navy" | "mist" | "dark"; className?: string }) {
  const t = {
    neutral: "bg-black/5 text-ink",
    coral: "bg-coral/12 text-coral-hover bg-[#F26B4D1F]",
    gold: "bg-[#D4AF7729] text-[#8A6A3C]",
    ok: "bg-[#2F6F4E1F] text-ok",
    warn: "bg-[#C9862A24] text-[#8F5E1C]",
    danger: "bg-[#B423181A] text-danger",
    navy: "bg-navy text-ivory",
    mist: "bg-[#8AA4B52E] text-[#3E5A6B]",
    dark: "bg-white/10 text-ivory",
  }[tone];
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", t, className)}>{children}</span>;
}

export function Card({ children, className, dark }: { children: ReactNode; className?: string; dark?: boolean }) {
  return (
    <div className={cn(dark ? "rounded-np border border-navy-line bg-navy-card text-ivory" : "rounded-np border border-line bg-white", className)}>
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
        <span role="alert" className={cn("mt-1 block text-xs font-semibold", dark ? "text-[#FF8A7A]" : "text-danger")}>{error}</span>
      ) : (
        hint && <span className={cn("mt-1 block text-xs", dark ? "text-mist" : "text-ink/50")}>{hint}</span>
      )}
    </label>
  );
}

export const inputCls =
  "h-11 w-full rounded-np border border-line bg-white px-3.5 text-[15px] text-ink placeholder:text-ink/40 transition-colors duration-np focus:border-coral focus:outline-none";
export const darkInputCls =
  "h-10 w-full rounded-np border border-navy-line bg-navy-2 px-3 text-sm text-ivory placeholder:text-mist/60 focus:border-coral focus:outline-none";

export function Stat({ label, value, delta, dark, hint }: { label: string; value: ReactNode; delta?: string; dark?: boolean; hint?: string }) {
  const up = delta?.startsWith("+");
  return (
    <div className={cn("rounded-np p-4", dark ? "border border-navy-line bg-navy-card" : "border border-line bg-white")}>
      <div className={cn("text-xs font-semibold uppercase tracking-wide", dark ? "text-mist" : "text-ink/50")}>{label}</div>
      <div className="mt-1.5 flex items-baseline gap-2">
        <span className="font-display text-2xl font-semibold">{value}</span>
        {delta && <span className={cn("text-xs font-semibold", up ? "text-[#5FBF8F]" : "text-coral")}>{delta}</span>}
      </div>
      {hint && <div className={cn("mt-1 text-xs", dark ? "text-mist/80" : "text-ink/50")}>{hint}</div>}
    </div>
  );
}

export function SectionTitle({ children, action, className }: { children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("mb-4 flex items-end justify-between gap-4", className)}>
      <h2 className="font-display text-xl font-semibold md:text-2xl">{children}</h2>
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

export function EmptyState({ icon, title, body, cta, dark }: { icon: ReactNode; title: string; body: string; cta?: ReactNode; dark?: boolean }) {
  return (
    <div className={cn("flex flex-col items-center rounded-np border border-dashed px-6 py-12 text-center", dark ? "border-navy-line" : "border-line bg-white/60")}>
      <div className={cn("mb-3 flex h-12 w-12 items-center justify-center rounded-full", dark ? "bg-white/5 text-coral" : "bg-coral/10 text-coral bg-[#F26B4D14]")}>{icon}</div>
      <div className="font-display text-lg font-semibold">{title}</div>
      <p className={cn("mt-1 max-w-sm text-sm", dark ? "text-mist" : "text-ink/60")}>{body}</p>
      {cta && <div className="mt-4">{cta}</div>}
    </div>
  );
}

import { cn } from "@/lib/cn";

/** Geometric pin: rounded triangle with an inner dot. */
export function Pin({ className, color = "var(--np-coral)", dot = "var(--np-ivory)" }: { className?: string; color?: string; dot?: string }) {
  return (
    <svg viewBox="0 0 32 36" className={className} aria-hidden>
      <path d="M16 35 C 14.6 35 13.8 34.2 13 33 L 3.2 16.4 C -0.6 9.8 4.2 1.5 11.8 1.5 H 20.2 C 27.8 1.5 32.6 9.8 28.8 16.4 L 19 33 C 18.2 34.2 17.4 35 16 35 Z" fill={color} />
      <circle cx="16" cy="12.5" r="4.6" fill={dot} />
    </svg>
  );
}

export function Logo({ tone = "navy", className, size = "md" }: { tone?: "navy" | "ivory"; className?: string; size?: "sm" | "md" | "lg" }) {
  const text = tone === "navy" ? "text-navy" : "text-ivory";
  const s = { sm: "text-lg", md: "text-xl", lg: "text-4xl" }[size];
  const p = { sm: "h-5 w-5", md: "h-6 w-6", lg: "h-11 w-11" }[size];
  return (
    <span className={cn("inline-flex items-center gap-1.5 font-display font-bold tracking-[-0.02em]", text, s, className)}>
      <Pin className={p} dot={tone === "navy" ? "var(--np-ivory)" : "var(--np-navy)"} />
      New Place
    </span>
  );
}

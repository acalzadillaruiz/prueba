import { cn } from "@/lib/cn";

/**
 * New Place mark: the agency's double roof. Outer roof in ink, inner roof (the "teja") in terracotta.
 * Below ~70 px wide the strokes thicken so the teja stays legible (header, sidebar, favicon).
 */
export function RoofMark({ className, ink = "currentColor", teja = "var(--np-coral)", small = false }: { className?: string; ink?: string; teja?: string; small?: boolean }) {
  return small ? (
    <svg viewBox="0 0 120 42" className={className} aria-hidden>
      <path d="M6 37 60 7l54 30" fill="none" stroke={ink} strokeWidth="6" />
      <path d="M30 38 60 21.5 90 38" fill="none" stroke={teja} strokeWidth="5" />
    </svg>
  ) : (
    <svg viewBox="0 0 120 42" className={className} aria-hidden>
      <path d="M4 37 60 6l56 31" fill="none" stroke={ink} strokeWidth="3.4" strokeMiterlimit={10} />
      <path d="M24 37 60 17 96 37" fill="none" stroke={teja} strokeWidth="2.05" strokeMiterlimit={10} />
    </svg>
  );
}

/** Kept for existing call sites (404, offline, empty states): now the roof mark. */
export function Pin({ className, color = "var(--np-coral)", dot = "currentColor" }: { className?: string; color?: string; dot?: string }) {
  return <RoofMark className={className} ink={dot} teja={color} small />;
}

/** NP monogram under the roof: avatar, app icon, empty states. */
export function Monogram({ className, bg = "var(--np-navy)", ink = "var(--np-ivory)", teja = "var(--np-coral-light)" }: { className?: string; bg?: string; ink?: string; teja?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden>
      <circle cx="60" cy="60" r="60" fill={bg} />
      <path d="M26 54 60 33l34 21" fill="none" stroke={teja} strokeWidth="3" />
      <text x="60" y="84" textAnchor="middle" fontFamily="var(--font-logo)" fontWeight="500" fontSize="30" letterSpacing="2" fill={ink}>
        NP
      </text>
    </svg>
  );
}

/**
 * Horizontal lockup used in headers: roof + NEW PLACE (Cinzel). `lg` is the stacked lockup with "Bienes raíces".
 * tone="ivory" for navy/photo backgrounds (teja switches to the light terracotta for contrast).
 */
export function Logo({ tone = "navy", className, size = "md" }: { tone?: "navy" | "ivory"; className?: string; size?: "sm" | "md" | "lg" }) {
  const dark = tone === "ivory";
  const ink = dark ? "var(--np-ivory)" : "var(--np-navy)";
  const teja = dark ? "var(--np-coral-light)" : "var(--np-coral)";
  if (size === "lg")
    return (
      <span className={cn("inline-grid justify-items-center gap-2", className)} aria-label="New Place Bienes raíces">
        <RoofMark className="h-11 w-[126px]" ink={ink} teja={teja} />
        <span className="font-logo text-[30px] leading-none tracking-[0.22em]" style={{ color: ink, paddingLeft: "0.22em" }}>
          NEW PLACE
        </span>
        <span className="text-[11px] font-medium uppercase tracking-[0.34em]" style={{ color: dark ? "#D9C59C" : "var(--np-muted)", paddingLeft: "0.34em" }}>
          Bienes raíces
        </span>
      </span>
    );
  const m = size === "sm" ? "h-[15px] w-[43px]" : "h-[18px] w-[52px]";
  return (
    <span className={cn("inline-flex items-center gap-2.5 whitespace-nowrap", className)}>
      <RoofMark className={m} ink={ink} teja={teja} small />
      <span className={cn("font-logo leading-none tracking-[0.22em]", size === "sm" ? "text-[15px]" : "text-[17px]")} style={{ color: ink }}>
        NEW PLACE
      </span>
    </span>
  );
}

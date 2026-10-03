import { cn } from "@/lib/cn";

/**
 * New Place mark: the agency's double roof. Outer roof in ink, inner roof (the "teja") in terracotta.
 * Below ~70 px wide the strokes thicken so the teja stays legible (header, sidebar, favicon).
 */
export function RoofMark({ className, ink = "currentColor", teja = "var(--np-coral)", small = false, animate = false }: { className?: string; ink?: string; teja?: string; small?: boolean; animate?: boolean }) {
  // pathLength=1 lets the brand animation draw each stroke with stroke-dasharray (globals.css .np-roof-draw).
  return small ? (
    <svg viewBox="0 0 120 42" className={cn(className, animate && "np-roof-draw")} aria-hidden>
      <path d="M6 37 60 7l54 30" fill="none" stroke={ink} strokeWidth="6" pathLength={1} />
      <path d="M30 38 60 21.5 90 38" fill="none" stroke={teja} strokeWidth="5" pathLength={1} />
    </svg>
  ) : (
    <svg viewBox="0 0 120 42" className={cn(className, animate && "np-roof-draw")} aria-hidden>
      <path d="M4 37 60 6l56 31" fill="none" stroke={ink} strokeWidth="3.4" strokeMiterlimit={10} pathLength={1} />
      <path d="M24 37 60 17 96 37" fill="none" stroke={teja} strokeWidth="2.05" strokeMiterlimit={10} pathLength={1} />
    </svg>
  );
}

/** Mini roof glyph (badges, bullet lists, the active nav item): a single stroke in currentColor. */
export function RoofGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 22 9" className={cn("inline-block h-[7px] w-[17px] shrink-0", className)} aria-hidden>
      <path d="M1.5 8 11 1.8 20.5 8" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

/** Kept for existing call sites (404, offline, empty states): now the roof mark. */
export function Pin({ className, color = "var(--np-coral)", dot = "currentColor" }: { className?: string; color?: string; dot?: string }) {
  return <RoofMark className={className} ink={dot} teja={color} small />;
}

/** NP monogram under the roof: avatar, app icon, empty states. */
export function Monogram({ className, bg = "var(--np-navy)", ink = "var(--np-ivory)", teja = "var(--np-coral-light)", animate = false }: { className?: string; bg?: string; ink?: string; teja?: string; animate?: boolean }) {
  return (
    <svg viewBox="0 0 120 120" className={cn(className, animate && "np-roof-draw")} aria-hidden>
      <circle cx="60" cy="60" r="60" fill={bg} />
      <path d="M26 54 60 33l34 21" fill="none" stroke={teja} strokeWidth="3" pathLength={1} />
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
export function Logo({ tone = "navy", className, size = "md", animate = false }: { tone?: "navy" | "ivory"; className?: string; size?: "sm" | "md" | "lg"; animate?: boolean }) {
  const dark = tone === "ivory";
  // --np-logo-ink / --np-logo-teja let the public dark mode turn the navy lockup into Cal + light terracotta.
  const ink = dark ? "var(--np-ivory)" : "var(--np-logo-ink, var(--np-navy))";
  const teja = dark ? "var(--np-coral-light)" : "var(--np-logo-teja, var(--np-coral))";
  if (size === "lg")
    return (
      <span className={cn("inline-grid justify-items-center gap-2", className)} aria-label="New Place Bienes raíces">
        <RoofMark className="h-11 w-[126px]" ink={ink} teja={teja} animate={animate} />
        <span className={cn("font-logo text-[30px] leading-none tracking-[0.22em]", animate && "np-roof-fade")} style={{ color: ink, paddingLeft: "0.22em" }}>
          NEW PLACE
        </span>
        <span className={cn("text-[11px] font-medium uppercase tracking-[0.34em]", animate && "np-roof-fade")} style={{ color: dark ? "#D9C59C" : "var(--np-muted)", paddingLeft: "0.34em" }}>
          Bienes raíces
        </span>
      </span>
    );
  const m = size === "sm" ? "h-[15px] w-[43px]" : "h-[18px] w-[52px]";
  return (
    <span className={cn("inline-flex items-center gap-2.5 whitespace-nowrap", className)}>
      <RoofMark className={m} ink={ink} teja={teja} small animate={animate} />
      <span className={cn("font-logo leading-none tracking-[0.22em]", size === "sm" ? "text-[15px]" : "text-[17px]")} style={{ color: ink }}>
        NEW PLACE
      </span>
    </span>
  );
}

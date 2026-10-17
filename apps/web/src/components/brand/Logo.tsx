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

/** «NEW PLACE» in Lexend Zetta ExtraLight (200), tracking .2em, as outlines (043): the wordmark paints with the page
 *  and the font file is never downloaded for it. viewBox in font units (1000/em; cap height 700). */
const WORDMARK_D = "M192 0V-700H247L881 -54L871 -28Q870 -43 869.5 -87.0Q869 -131 869.0 -186.5Q869 -242 868.5 -293.5Q868 -345 868.0 -380.5Q868 -416 867 -417V-700H917V0H859L230 -640L234 -668Q234 -661 234.5 -632.5Q235 -604 236.0 -564.0Q237 -524 238.5 -481.0Q240 -438 241.0 -401.5Q242 -365 242 -344V0Z M1501.0 0V-700H2048.0V-650H1551.0V-50H2044.0V0ZM1528.0 -336V-386H1991.0V-336Z M2735.0 0 2497.0 -700H2555.0L2705.0 -243Q2717.0 -207 2725.5 -182.0Q2734.0 -157 2742.0 -135.5Q2750.0 -114 2756.5 -90.0Q2763.0 -66 2771.0 -31H2765.0Q2777.0 -68 2788.0 -97.0Q2799.0 -126 2814.0 -160.5Q2829.0 -195 2851.0 -248L2966.0 -516H3019.0L3171.0 -162Q3189.0 -122 3202.0 -91.0Q3215.0 -60 3221.5 -44.5Q3228.0 -29 3221.0 -31H3210.0Q3215.0 -50 3222.5 -73.5Q3230.0 -97 3237.5 -121.5Q3245.0 -146 3253.0 -170.5Q3261.0 -195 3268.5 -216.0Q3276.0 -237 3282.0 -253L3454.0 -700H3508.0L3240.0 0H3186.0L2980.0 -484L3005.0 -483L2798.0 0Z M4680.0 0V-700H5063.0Q5128.0 -700 5176.0 -674.0Q5224.0 -648 5251.0 -603.0Q5278.0 -558 5278.0 -498Q5278.0 -432 5250.0 -381.0Q5222.0 -330 5172.5 -301.5Q5123.0 -273 5056.0 -273H4730.0V0ZM4730.0 -323H5054.0Q5107.0 -323 5145.0 -345.5Q5183.0 -368 5203.0 -407.5Q5223.0 -447 5223.0 -500Q5223.0 -546 5203.0 -579.5Q5183.0 -613 5145.0 -631.5Q5107.0 -650 5054.0 -650H4730.0Z M5810.0 0V-700H5860.0V-50H6343.0V0Z M6721.0 0 7061.0 -700H7133.0L7470.0 0H7413.0L7152.0 -544Q7135.0 -584 7126.5 -602.0Q7118.0 -620 7112.5 -629.0Q7107.0 -638 7102.0 -649.5Q7097.0 -661 7088.0 -688H7102.0Q7091.0 -655 7084.5 -640.5Q7078.0 -626 7072.0 -616.0Q7066.0 -606 7058.0 -590.0Q7050.0 -574 7035.0 -538L6774.0 0ZM6855.0 -202 6877.0 -251H7318.0L7329.0 -202Z M8325.0 10Q8231.0 10 8152.5 -17.0Q8074.0 -44 8016.5 -93.0Q7959.0 -142 7927.0 -208.0Q7895.0 -274 7895.0 -352Q7895.0 -429 7925.5 -493.0Q7956.0 -557 8012.5 -605.0Q8069.0 -653 8145.0 -679.0Q8221.0 -705 8312.0 -705Q8372.0 -705 8430.5 -689.0Q8489.0 -673 8539.0 -647.0Q8589.0 -621 8621.0 -588L8594.0 -539Q8566.0 -573 8521.0 -599.0Q8476.0 -625 8421.0 -640.5Q8366.0 -656 8309.0 -656Q8231.0 -656 8165.5 -633.5Q8100.0 -611 8051.0 -570.5Q8002.0 -530 7975.0 -474.0Q7948.0 -418 7948.0 -352Q7948.0 -284 7976.0 -226.0Q8004.0 -168 8055.5 -126.5Q8107.0 -85 8174.0 -62.0Q8241.0 -39 8321.0 -39Q8380.0 -39 8432.5 -54.0Q8485.0 -69 8526.0 -94.0Q8567.0 -119 8594.0 -148L8618.0 -103Q8588.0 -74 8541.0 -48.0Q8494.0 -22 8439.0 -6.0Q8384.0 10 8325.0 10Z M9133.0 0V-700H9680.0V-650H9183.0V-50H9676.0V0ZM9160.0 -336V-386H9623.0V-336Z";
function Wordmark({ size, color }: { size: number; color: string }) {
  return (
    <svg viewBox="0 -700 9835 700" width={(9835 / 1000) * size} height={0.7 * size} fill={color} aria-hidden className="block shrink-0">
      <path d={WORDMARK_D} />
    </svg>
  );
}

/**
 * Wordmark (030 · estilo AMALI): NEW PLACE in Lexend Zetta ExtraLight, wide and spaced, no symbol — like AMALI's
 * thin lockup. `lg` stacks a small "VENEZUELA" under it. tone="ivory" for photos and dark blocks.
 */
export function Logo({ tone = "navy", className, size = "md", animate = false }: { tone?: "navy" | "ivory"; className?: string; size?: "sm" | "md" | "lg"; animate?: boolean }) {
  const dark = tone === "ivory";
  // --np-logo-ink lets the public dark mode turn the Noche wordmark into Travertino.
  const ink = dark ? "#FAF8F4" : "var(--np-logo-ink, var(--np-ink))";
  if (size === "lg")
    return (
      <span translate="no" className={cn("inline-grid justify-items-center gap-2", animate && "np-roof-fade", className)} role="img" aria-label="New Place Venezuela">
        <Wordmark size={30} color={ink} />
        <span className="text-[13px] font-medium uppercase tracking-[0.34em]" style={{ color: dark ? "rgb(255 255 255 / .8)" : "var(--np-muted)", paddingLeft: "0.34em" }}>
          Venezuela
        </span>
      </span>
    );
  return (
    <span translate="no" className={cn("inline-flex items-center whitespace-nowrap", animate && "np-roof-fade", className)}>
      <Wordmark size={size === "sm" ? 15 : 18} color={ink} />
      <span className="sr-only">New Place</span>
    </span>
  );
}

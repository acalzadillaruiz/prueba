
/** Stylised Atlantic: the three diaspora cities fly in to Lechería along drawn arcs while the steps light up. */
const CITIES = [
  { name: "Madrid", x: 900, y: 120, d: "M900 120 C 760 40, 470 80, 330 330" },
  { name: "Miami", x: 150, y: 110, d: "M150 110 C 210 170, 260 250, 330 330" },
  { name: "Panamá", x: 70, y: 380, d: "M70 380 C 150 300, 240 300, 330 330" },
];
const LECHERIA = { x: 330, y: 330 };

/**
 * Buying from abroad (043-C): a still map (Madrid, Miami and Panamá arcs into Lechería) beside the four steps, on a
 * sand band. No pinned, scroll-scrubbed scene; the block fades in once like the rest of the page.
 */
export function RemoteRoute({ title, subtitle, steps, children }: { title: string; subtitle?: string; steps: [string, string][]; children?: React.ReactNode }) {
  return (
    <section id="compra-a-distancia" className="np-band scroll-mt-24 bg-arena">
      <div>
        <div data-reveal="stagger" className="np-gutter mx-auto grid w-full max-w-[1280px] items-center gap-10 py-[var(--np-section)] lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <div className="relative overflow-hidden bg-ivory">
            <svg viewBox="0 0 1000 460" className="block h-auto w-full" role="img" aria-label="Madrid, Miami, Panamá → Lechería">
              <defs>
                <pattern id="np-dots" width="14" height="14" patternUnits="userSpaceOnUse">
                  <circle cx="2" cy="2" r="1.3" fill="#1F3A4D" opacity=".12" />
                </pattern>
              </defs>
              <rect width="1000" height="460" fill="url(#np-dots)" />
              {/* Coastlines, abstracted: the Caribbean arc and the Iberian edge */}
              <path d="M0 300 C 120 260, 220 360, 330 350 S 520 330, 600 380 L 600 460 L 0 460 Z" fill="#D6DEE5" opacity=".45" />
              <path d="M860 60 C 900 90, 940 80, 1000 100 L 1000 0 L 840 0 Z" fill="#D6DEE5" opacity=".45" />
              {CITIES.map((c, i) => (
                <g key={c.name}>
                  <path d={c.d} fill="none" stroke="#1F3A4D" strokeOpacity=".14" strokeWidth="2" strokeDasharray="4 7" />
                  <path d={c.d} fill="none" stroke={i === 0 ? "#3A6A92" : "#1F3A4D"} strokeWidth={i === 0 ? 3 : 2} strokeLinecap="round" />
                  <circle cx={c.x} cy={c.y} r="6" fill="#1F3A4D" />
                  <text x={c.x + (c.x > 500 ? -14 : 14)} y={c.y - 12} textAnchor={c.x > 500 ? "end" : "start"} fontFamily="var(--font-display)" fontSize="20" fontWeight="600" fill="#1F3A4D">
                    {c.name}
                  </text>
                </g>
              ))}
              <g>
                <circle cx={LECHERIA.x} cy={LECHERIA.y} r="26" fill="#3A6A92" opacity=".16" />
                <path d={`M${LECHERIA.x - 18} ${LECHERIA.y + 6} L${LECHERIA.x} ${LECHERIA.y - 8} L${LECHERIA.x + 18} ${LECHERIA.y + 6}`} fill="none" stroke="#1F3A4D" strokeWidth="3.5" />
                <path d={`M${LECHERIA.x - 9} ${LECHERIA.y + 7} L${LECHERIA.x} ${LECHERIA.y} L${LECHERIA.x + 9} ${LECHERIA.y + 7}`} fill="none" stroke="#3A6A92" strokeWidth="3" />
                <text x={LECHERIA.x + 34} y={LECHERIA.y + 8} fontFamily="var(--font-title)" fontSize="36" fill="#1F3A4D">
                  Lechería
                </text>
              </g>
            </svg>
          </div>
          <div>
            <h2 className="np-t-band max-w-[600px]">{title}</h2>
            {subtitle && <p className="np-t-lead mt-7 max-w-[480px] text-ink">{subtitle}</p>}
            <ol className="np-steps mt-10">
              {steps.map(([t, b], i) => (
                <li key={t} data-on="1" className="flex items-baseline gap-5 py-2.5 md:items-start md:gap-6 md:py-4 max-md:py-4">
                  <span className="np-step-n w-6 shrink-0 font-serif text-[20px] leading-none md:text-[28px]">{i + 1}</span>
                  <span>
                    <span className="block text-[20px] font-medium text-ink">{t}</span>
                    {/* One short line each, phones included (035: at most two lines per block). */}
                    <span className="np-t-body block text-ink">{b}</span>
                  </span>
                </li>
              ))}
            </ol>
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}

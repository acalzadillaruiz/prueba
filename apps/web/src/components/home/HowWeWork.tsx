import Image from "next/image";
import { PHOTOS } from "@/lib/media";

export type Step = { title: string; body: string };

/**
 * "Así trabajamos" (035 · 043-C sand band): a photograph beside four short steps. Server-rendered and visible without
 * any script; the reveal only adds a soft fade.
 */
export function HowWeWork({ heading, intro, steps, photoAlt }: { heading: string; intro: string; steps: Step[]; photoAlt: string }) {
  return (
    <section className="np-band bg-arena" aria-labelledby="np-how-we-work">
      <div className="np-gutter mx-auto grid max-w-[1280px] box-content items-center gap-10 pb-[var(--np-section)] pt-16 lg:grid-cols-[1fr_1.05fr] lg:gap-16 lg:pt-24">
        <div data-reveal className="relative aspect-[4/3] w-full overflow-hidden bg-[#EFE6D8] lg:aspect-[4/5]">
          <Image src={PHOTOS.torreMarina.src} alt={photoAlt} fill sizes="(max-width: 1024px) 92vw, 600px" className="object-cover" style={{ objectPosition: PHOTOS.torreMarina.focus }} />
        </div>
        <div>
          <h2 id="np-how-we-work" className="np-t-band">
            {heading}
          </h2>
          <p className="np-t-lead mt-7 max-w-[480px] text-ink">{intro}</p>
          <ol data-reveal="stagger" className="mt-10 grid gap-3 sm:grid-cols-2">
            {steps.map((s) => (
              <li key={s.title} className="bg-ivory p-5">
                <h3 className="text-[20px] text-ink">{s.title}</h3>
                <p className="np-t-body mt-2 text-ink">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

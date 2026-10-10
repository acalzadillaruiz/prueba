import Image from "next/image";
import torreAtardecer from "../../../public/brand/torre-atardecer.jpg";

export type Step = { eyebrow: string; title: string; body: string };

/**
 * "Así trabajamos" (035): a realistic photo beside four short steps — no 3D. The photo is illustrative (AI), as its alt
 * says. Server-rendered and visible without any script; the reveal only adds a soft fade.
 */
export function HowWeWork({ heading, intro, steps, photoAlt }: { heading: string; intro: string; steps: Step[]; photoAlt: string }) {
  return (
    <section className="bg-arena" aria-labelledby="np-how-we-work">
      <div className="mx-auto grid max-w-[1320px] items-center gap-8 px-4 py-14 md:px-8 md:py-20 lg:grid-cols-[1fr_1.05fr] lg:gap-16 lg:py-24">
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[2px] bg-[#D9CDB8] lg:aspect-[4/5]">
          {/* Static import: a blurred preview of the photo itself shows until it loads (037b), never an empty block. */}
          <Image src={torreAtardecer} alt={photoAlt} fill placeholder="blur" sizes="(max-width: 1024px) 92vw, 600px" className="object-cover object-[60%_50%]" />
        </div>
        <div>
          <h2 id="np-how-we-work" className="text-[30px] md:text-[44px]">
            {heading}
          </h2>
          <p className="mt-3 max-w-[480px] text-[16px] font-light text-muted md:text-[17px]">{intro}</p>
          <ol data-reveal="stagger" className="mt-7 grid gap-6 sm:grid-cols-2 sm:gap-x-8 sm:gap-y-8">
            {steps.map((s) => (
              <li key={s.title} className="border-t border-egeo/60 pt-4">
                <p className="np-kicker text-gold-text">{s.eyebrow}</p>
                <h3 className="mt-2 text-[22px] text-ink">{s.title}</h3>
                <p className="mt-1.5 text-[15px] font-light leading-relaxed text-muted">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

import Image from "next/image";
import torreAtardecer from "../../../public/brand/torre-atardecer.jpg";

export type Step = { title: string; body: string };

/**
 * "Así trabajamos" (035): a realistic photo beside four short steps — no 3D. The photo is illustrative (AI), as its alt
 * says. Server-rendered and visible without any script; the reveal only adds a soft fade.
 */
export function HowWeWork({ heading, intro, steps, photoAlt }: { heading: string; intro: string; steps: Step[]; photoAlt: string }) {
  return (
    <section className="bg-arena" aria-labelledby="np-how-we-work">
      <div className="mx-auto grid max-w-[1320px] items-center gap-8 px-4 py-14 md:px-8 md:py-20 lg:grid-cols-[1fr_1.05fr] lg:gap-16 lg:py-24">
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[2px] bg-[#E9E1D3] lg:aspect-[4/5]">
          {/* Static import: a blurred preview of the photo itself shows until it loads (037b), never an empty block. */}
          <Image src={torreAtardecer} alt={photoAlt} fill placeholder="blur" sizes="(max-width: 1024px) 92vw, 600px" className="object-cover object-[60%_50%]" />
        </div>
        <div>
          <h2 id="np-how-we-work" className="np-t-h1">
            {heading}
          </h2>
          <p className="np-t-lead mt-4 max-w-[480px] text-ink">{intro}</p>
          <ol data-reveal="stagger" className="mt-7 grid gap-3 sm:grid-cols-2">
            {steps.map((s) => (
              <li key={s.title} className="bg-ivory p-5">
                <h3 className="text-[20px] text-ink">{s.title}</h3>
                <p className="np-t-small mt-2 text-muted">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

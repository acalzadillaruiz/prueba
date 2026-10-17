import Image from "next/image";
import Link from "next/link";
import type { Photo } from "@/lib/media";
import { RailTrack } from "./RailTrack";

export type RailItem = { href: string; title: string; zone: string; price: string; facts: string; photo?: string; badge?: string };

/**
 * Colección privada (048 · Brisa): a light band — one large photograph beside the title, then the homes as a native
 * carousel (RailTrack: scroll-snap, arrows, counter, progress). The next card always peeks in. «Exclusiva» is the one
 * arena-dorada detail on each card.
 */
export function CollectionRail({
  title,
  lead,
  photo,
  photoAlt,
  items,
  more,
  labels,
}: {
  title: string;
  lead: string;
  photo: Photo;
  photoAlt: string;
  items: RailItem[];
  more: { href: string; label: string };
  labels: { prev: string; next: string; hint: string };
}) {
  return (
    <section data-hide-fab className="np-band bg-ivory text-ink" aria-labelledby="np-collection">
      <div className="np-gutter mx-auto grid max-w-[1280px] box-content items-end gap-10 pt-[var(--np-section)] lg:grid-cols-[1fr_1.1fr] lg:gap-16">
        <div data-reveal className="relative aspect-[4/5] w-full overflow-hidden rounded-[24px] bg-arena">
          <Image src={photo.src} alt={photoAlt} fill sizes="(max-width: 1024px) 92vw, 560px" className="object-cover" style={{ objectPosition: photo.focus }} />
        </div>
        <div data-reveal="stagger" className="pb-2">
          <span aria-hidden className="block h-px w-12 bg-gold" />
          <h2 id="np-collection" className="np-t-band mt-6 text-ink">{title}</h2>
          <p className="np-t-lead mt-6 max-w-[480px] text-muted">{lead}</p>
          <Link
            href={more.href}
            className="mt-10 inline-flex min-h-12 items-center rounded-[12px] bg-navy px-6 font-display text-[16px] font-medium text-white transition-colors duration-np ease-np hover:bg-navy-2 active:scale-[.98]"
          >
            {more.label}
          </Link>
        </div>
      </div>
      <RailTrack label={title} count={items.length} prevLabel={labels.prev} nextLabel={labels.next} hint={labels.hint} className="mt-16 pb-[var(--np-section)]">
        {items.map((it) => (
          <li key={it.href} className="w-[80vw] sm:w-[46vw] md:w-[34vw] lg:w-[28vw] xl:w-[380px]">
            <Link href={it.href} className="np-card np-soft-card group block overflow-hidden">
              <span className="relative block aspect-[4/3] overflow-hidden bg-arena">
                {it.photo && <Image src={it.photo} alt="" fill sizes="(max-width: 768px) 80vw, 380px" className="np-card-photo object-cover" />}
                {it.badge && (
                  <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1 text-[13px] font-medium text-ink">
                    <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-gold" />
                    {it.badge}
                  </span>
                )}
              </span>
              <span className="block px-5 pb-5 pt-4">
                <span className="block truncate font-title text-[20px] font-normal text-ink">{it.title}</span>
                <span className="mt-1 block truncate text-[15px] text-muted">{it.zone}</span>
                <span className="np-num mt-3 block text-[20px] font-semibold leading-none text-ink">{it.price}</span>
                <span className="mt-2 block truncate text-[15px] text-muted">{it.facts}</span>
              </span>
            </Link>
          </li>
        ))}
      </RailTrack>
    </section>
  );
}

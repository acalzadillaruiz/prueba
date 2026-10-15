import Image from "next/image";
import Link from "next/link";
import type { Photo } from "@/lib/media";

export type RailItem = { href: string; title: string; zone: string; price: string; facts: string; photo?: string; badge?: string };

/**
 * Colección Privada (043-C, DESIGN.md §5): a night band — one large vertical photograph beside the title, then the
 * homes as a native swipe row (snap; no pinned, scroll-driven glide). Text is bone, secondary text mist.
 */
export function CollectionRail({
  title,
  lead,
  photo,
  photoAlt,
  items,
  more,
}: {
  title: string;
  lead: string;
  photo: Photo;
  photoAlt: string;
  items: RailItem[];
  more: { href: string; label: string };
}) {
  return (
    <section data-hide-fab className="np-band bg-navy text-ivory" aria-labelledby="np-collection">
      <div className="np-gutter mx-auto grid max-w-[1280px] items-end gap-10 pt-[var(--np-section)] lg:grid-cols-[1fr_1.1fr] lg:gap-16">
        <div data-reveal className="relative aspect-[4/5] w-full overflow-hidden bg-navy-2">
          <Image src={photo.src} alt={photoAlt} fill sizes="(max-width: 1024px) 92vw, 560px" className="object-cover" style={{ objectPosition: photo.focus }} />
        </div>
        <div data-reveal="stagger" className="pb-2">
          <h2 id="np-collection" className="np-t-band text-ivory">{title}</h2>
          <p className="np-t-lead mt-7 max-w-[480px] text-mist">{lead}</p>
          <Link
            href={more.href}
            className="mt-10 inline-flex min-h-12 items-center rounded-[2px] bg-[#F6F2EC] px-6 font-display text-[16px] font-medium text-[#0E1A2B] transition-colors duration-np ease-np hover:bg-[#E9E1D3] active:scale-[.98]"
          >
            {more.label}
          </Link>
        </div>
      </div>
      <ul
        aria-label={title}
        className="no-scrollbar mt-16 flex snap-x snap-mandatory gap-6 overflow-x-auto pb-[var(--np-section)] [scroll-padding-inline:clamp(20px,6vw,96px)] [padding-inline:clamp(20px,6vw,96px)] md:gap-8"
      >
        {items.map((it) => (
          <li key={it.href} className="w-[78vw] shrink-0 snap-start sm:w-[46vw] md:w-[34vw] lg:w-[28vw] xl:w-[400px]">
            <Link href={it.href} className="np-card group block">
              <span className="relative block aspect-[4/5] overflow-hidden bg-navy-2">
                {it.photo && <Image src={it.photo} alt="" fill sizes="(max-width: 768px) 78vw, 400px" className="np-card-photo object-cover" />}
                {it.badge && <span className="absolute left-3 top-3 rounded-[2px] bg-[#F6F2EC] px-2.5 py-1 font-display text-[13px] font-medium text-[#0E1A2B]">{it.badge}</span>}
              </span>
              <span className="block pt-4">
                <span className="block truncate font-display text-[17px] font-medium text-ivory">{it.title}</span>
                <span className="mt-1 block truncate text-[16px] text-mist">{it.zone}</span>
                <span className="np-num mt-2 block text-[20px] font-semibold leading-none text-ivory">{it.price}</span>
                <span className="mt-2 block truncate font-display text-[16px] text-mist">{it.facts}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

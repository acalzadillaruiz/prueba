import Image from "next/image";
import type { Locale } from "@/types/domain";
import type { Photo } from "@/lib/media";
import { tx } from "@/lib/i18n";

/**
 * Full-bleed photo band (048 · Brisa): one photograph edge to edge with a soft petróleo gradient at the bottom where
 * the one idea sits (title, a line, an optional action). Text is white; never a text-shadow.
 */
export function PhotoBand({
  photo,
  locale,
  title,
  body,
  children,
  id,
}: {
  photo: Photo;
  locale: Locale;
  title: string;
  body?: string;
  children?: React.ReactNode;
  id?: string;
}) {
  const headingId = id ? `${id}-title` : undefined;
  return (
    <section id={id} aria-labelledby={headingId} className="np-band relative isolate flex min-h-[86svh] items-end overflow-hidden bg-[#1F3A4D] text-ivory">
      <Image
        src={photo.src}
        alt={tx(locale, photo.alt.es, photo.alt.en)}
        fill
        sizes="100vw"
        className="-z-20 object-cover"
        style={{ objectPosition: photo.focus }}
      />
      <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgb(31_58_77/0)_30%,rgb(31_58_77/.45)_65%,rgb(31_58_77/.75)_100%)]" />
      <div data-reveal="stagger" className="np-gutter mx-auto w-full max-w-[1280px] py-[var(--np-section)]">
        <h2 id={headingId} className="np-t-band max-w-[900px] text-ivory">{title}</h2>
        {body && <p className="np-t-lead mt-7 max-w-[560px] text-ivory">{body}</p>}
        {children && <div className="mt-10">{children}</div>}
      </div>
    </section>
  );
}

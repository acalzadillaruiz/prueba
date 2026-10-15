import Image from "next/image";
import type { Locale } from "@/types/domain";
import type { Photo } from "@/lib/media";
import { tx } from "@/lib/i18n";

/**
 * Full-bleed photo band (043-C): one photograph edge to edge — no radius, border or shadow — under the night scrim
 * rgba(14,26,43,.55), with one idea on it (title, a line, an optional action). Text is bone; never a text-shadow.
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
    <section id={id} aria-labelledby={headingId} className="np-band relative isolate flex min-h-[86svh] items-end overflow-hidden bg-navy text-ivory">
      <Image
        src={photo.src}
        alt={tx(locale, photo.alt.es, photo.alt.en)}
        fill
        sizes="100vw"
        className="-z-20 object-cover"
        style={{ objectPosition: photo.focus }}
      />
      <div aria-hidden className="absolute inset-0 -z-10 bg-[rgb(14_26_43/.55)]" />
      <div data-reveal="stagger" className="np-gutter mx-auto w-full max-w-[1280px] py-[var(--np-section)]">
        <h2 id={headingId} className="np-t-band max-w-[900px] text-ivory">{title}</h2>
        {body && <p className="np-t-lead mt-7 max-w-[560px] text-ivory">{body}</p>}
        {children && <div className="mt-10">{children}</div>}
      </div>
    </section>
  );
}

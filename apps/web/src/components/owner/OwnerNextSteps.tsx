"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ImagePlus, Link2, MessagesSquare, Share2 } from "lucide-react";
import type { Locale } from "@/types/domain";
import { WhatsAppIcon } from "@/components/brand/PublicChrome";
import { tx } from "@/lib/i18n";

/**
 * What to do right after publishing: share the listing (copy link / WhatsApp), add photos and keep an eye on messages.
 * Sharing only once it's live (a listing in review has no public page yet).
 */
export function OwnerNextSteps({ locale, slug, title, live }: { locale: Locale; slug: string; title: string; live: boolean }) {
  const [copied, setCopied] = useState(false);
  const [copyErr, setCopyErr] = useState(false);
  const path = `/${locale}/listing/${slug}`;
  const url = () => (typeof window !== "undefined" ? `${window.location.origin}${path}` : path);
  const shareText = (u: string) => tx(locale, `Estoy vendiendo «${title}». Mírala en New Place: ${u}`, `I’m selling “${title}”. Take a look on New Place: ${u}`);
  const card = "rounded-[4px] bg-white p-4 text-left shadow-[0_8px_24px_rgba(28,29,29,.06)] dark:bg-navy-card";
  const link = "inline-flex min-h-11 items-center gap-1.5 rounded-full border-[1.5px] border-navy px-4 text-sm font-semibold text-navy hover:bg-navy/5 dark:border-ivory dark:text-ivory";

  return (
    <section className="mt-10 text-left" aria-labelledby="next-steps" data-testid="owner-next-steps">
      <h2 id="next-steps" className="text-center font-serif text-[26px] font-light leading-tight">{tx(locale, "Y ahora, ¿qué sigue?", "What’s next?")}</h2>
      <div className="mt-4 space-y-3">
        {live && (
          <div className={card}>
            <div className="flex items-center gap-2 font-display font-semibold"><Share2 size={16} aria-hidden /> {tx(locale, "Comparte tu casa", "Share your home")}</div>
            <p className="mt-0.5 text-sm text-muted">{tx(locale, "Mándala a familiares, amigos y grupos de tu zona: así llegan las primeras visitas.", "Send it to family, friends and local groups: that’s how the first visits come in.")}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className={link}
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(url());
                    setCopied(true);
                    setCopyErr(false);
                    setTimeout(() => setCopied(false), 2500);
                  } catch {
                    setCopyErr(true);
                  }
                }}
              >
                {copied ? <Check size={15} /> : <Link2 size={15} />} {copied ? tx(locale, "Enlace copiado", "Link copied") : tx(locale, "Copiar enlace", "Copy link")}
              </button>
              <a className={link} href={`https://wa.me/?text=${encodeURIComponent(shareText(url()))}`} target="_blank" rel="noopener noreferrer">
                <WhatsAppIcon className="h-4 w-4" /> {tx(locale, "Compartir por WhatsApp", "Share on WhatsApp")}
              </a>
            </div>
            <span className="sr-only" role="status">{copied ? tx(locale, "Enlace copiado", "Link copied") : ""}</span>
            {copyErr && <p role="alert" className="mt-2 break-all text-xs text-muted">{tx(locale, "No pudimos copiarlo. Este es el enlace:", "We couldn’t copy it. Here’s the link:")} {url()}</p>}
          </div>
        )}
        <div className={card}>
          <div className="flex items-center gap-2 font-display font-semibold"><ImagePlus size={16} aria-hidden /> {tx(locale, "Añade más fotos", "Add more photos")}</div>
          <p className="mt-0.5 text-sm text-muted">{tx(locale, "Los anuncios con 8 fotos o más reciben muchas más visitas. Súbelas desde «Mis inmuebles».", "Listings with 8 photos or more get far more visits. Upload them from “My properties”.")}</p>
          <Link href={`/${locale}/owner/listings`} className={`${link} mt-3`}>{tx(locale, "Subir fotos", "Upload photos")}</Link>
        </div>
        <div className={card}>
          <div className="flex items-center gap-2 font-display font-semibold"><MessagesSquare size={16} aria-hidden /> {tx(locale, "Ver tus mensajes", "See your messages")}</div>
          <p className="mt-0.5 text-sm text-muted">{tx(locale, "Ahí te llegan las consultas y las visitas. Tú las confirmas y atiendes a cada persona.", "Enquiries and visit requests land there. You confirm them and meet each person.")}</p>
          <Link href={`/${locale}/owner/listings#mensajes`} className={`${link} mt-3`}>{tx(locale, "Ir a mis mensajes", "Go to my messages")}</Link>
        </div>
      </div>
    </section>
  );
}

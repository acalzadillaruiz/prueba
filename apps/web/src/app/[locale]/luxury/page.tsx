import Link from "next/link";
import type { Locale } from "@/types/domain";
import { PublicPage } from "@/components/layout/PublicPage";
import { PropertyArt } from "@/components/art/PropertyArt";
import { publicListings } from "@/mock/listings";
import { money, num, tx } from "@/lib/i18n";

export default async function LuxuryPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const lux = publicListings().filter((l) => l.luxury);
  const [hero, ...rest] = lux;
  return (
    <PublicPage locale={locale} header="dark">
      <div className="bg-navy text-ivory">
        <Link href={`/${locale}/listing/${hero.slug}`} className="relative block h-[78vh] min-h-[520px] overflow-hidden">
          <PropertyArt scene={hero.scenes[0]} seed={hero.id} className="h-full w-full" />
          <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/20 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 mx-auto max-w-[1280px] px-4 pb-12 md:px-6">
            <div className="font-display text-sm font-semibold uppercase tracking-[0.3em] text-gold">New Place Luxury</div>
            <h1 className="mt-3 max-w-3xl font-display text-4xl font-semibold md:text-6xl">{tx(locale, hero.title_es, hero.title_en)}</h1>
            <div className="mt-3 text-lg text-ivory/75">{hero.zone}, {hero.city} · {num(hero.areaM2, locale)} m² · {money(hero.priceAmount, locale)}</div>
          </div>
        </Link>
        <div className="mx-auto max-w-[1280px] px-4 py-16 md:px-6">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4 border-b border-navy-line pb-6">
            <h2 className="font-display text-3xl font-semibold">{tx(locale, "La colección", "The collection")}</h2>
            <p className="max-w-md text-mist">{tx(locale, "Propiedades seleccionadas. Algunas son privadas: solo se muestran con enlace a compradores precalificados.", "Hand-picked homes. Some are private and shared by link with pre-qualified buyers only.")}</p>
          </div>
          <div className="grid gap-x-8 gap-y-14 md:grid-cols-2">
            {rest.map((l, i) => (
              <Link key={l.id} href={`/${locale}/listing/${l.slug}`} className={i % 3 === 0 ? "group md:col-span-2" : "group"}>
                <div className="overflow-hidden rounded-np border border-gold/60 p-2">
                  <PropertyArt scene={l.scenes[0]} seed={l.id} className={(i % 3 === 0 ? "aspect-[21/9]" : "aspect-[4/3]") + " w-full rounded-[10px] transition-transform duration-700 group-hover:scale-[1.02]"} />
                </div>
                <div className="mt-4 flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-display text-2xl">{tx(locale, l.title_es, l.title_en)}</span>
                  <span className="font-display text-xl text-gold">{money(l.priceAmount, locale)}</span>
                </div>
                <div className="mt-1 text-mist">{l.zone}, {l.city} · {l.beds} {tx(locale, "hab", "bd")} · {num(l.areaM2, locale)} m²{l.plotM2 ? ` · ${num(l.plotM2, locale)} m² ${tx(locale, "terreno", "plot")}` : ""}</div>
              </Link>
            ))}
          </div>
          <div className="mt-16 rounded-np border border-gold/40 p-8 text-center">
            <div className="font-display text-2xl">{tx(locale, "1 propiedad privada disponible", "1 private listing available")}</div>
            <p className="mx-auto mt-2 max-w-lg text-mist">{tx(locale, "Pide acceso a un agente Luxury. Te enviamos el enlace tras una precalificación breve.", "Ask a Luxury agent for access. We’ll send the link after a short pre-qualification.")}</p>
            <button className="mt-5 rounded-np bg-gold px-5 py-2.5 font-display text-navy">{tx(locale, "Solicitar acceso", "Request access")}</button>
          </div>
        </div>
      </div>
    </PublicPage>
  );
}

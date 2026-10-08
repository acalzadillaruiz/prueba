import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import type { Locale } from "@/types/domain";
import { RoofGlyph } from "@/components/brand/Logo";
import { PublicPage } from "@/components/layout/PublicPage";

export const metadata = { title: "404", robots: { index: false, follow: false } };

/** 404 inside the normal public layout (header, menu, tab bar on phones): a way on, never a dead end. */
export default async function NotFound() {
  const locale = (await getLocale()) === "en" ? "en" : "es";
  const t = await getTranslations("common");
  const es = locale !== "en";
  const ways: [string, string][] = es
    ? [["Comprar", `/${locale}/search?type=SALE`], ["Alquilar", `/${locale}/search?type=LONG_RENT`], ["Colección Privada", `/${locale}/luxury`], ["Tus guardadas", `/${locale}/saved`]]
    : [["Buy", `/${locale}/search?type=SALE`], ["Rent", `/${locale}/search?type=LONG_RENT`], ["Private Collection", `/${locale}/luxury`], ["Your saved homes", `/${locale}/saved`]];
  return (
    <PublicPage locale={locale as Locale} footer={false} tabbar>
      <section className="mx-auto flex min-h-[calc(100svh-180px)] max-w-[720px] flex-col items-center justify-center px-6 py-16 text-center">
        <RoofGlyph className="h-[10px] w-[34px] text-gold-text" />
        <p className="np-eyebrow mt-6 text-gold-text">{es ? "Error 404" : "Error 404"}</p>
        <h1 className="mt-3 max-w-xl text-[40px] leading-tight md:text-[52px]">{t("notFound")}</h1>
        <p className="mt-3 max-w-md text-[16px] text-muted">{t("notFoundBody")}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href={`/${locale}`} className="np-btn-navy inline-flex h-12 items-center rounded-full bg-navy px-7 font-display text-[15px] font-semibold text-ivory hover:bg-navy-2">{t("back")}</Link>
          <Link href={`/${locale}/search?type=SALE`} className="np-btn-outline inline-flex h-12 items-center rounded-full border-[1.5px] border-navy px-7 font-display text-[15px] font-semibold text-navy hover:bg-navy/5">
            {es ? "Ver casas" : "Browse homes"}
          </Link>
        </div>
        <nav aria-label={es ? "Otros caminos" : "Other ways in"} className="mt-10 flex flex-wrap justify-center gap-x-6 gap-y-1 font-display text-[15px] text-ink/75">
          {ways.map(([label, href]) => (
            <Link key={href} href={href} className="inline-flex min-h-11 items-center underline-offset-4 hover:text-ink hover:underline">
              {label}
            </Link>
          ))}
        </nav>
      </section>
    </PublicPage>
  );
}

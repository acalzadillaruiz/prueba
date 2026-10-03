import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Logo } from "@/components/brand/Logo";

export const metadata = { title: "404", robots: { index: false, follow: false } };

export default async function NotFound() {
  const locale = await getLocale();
  const t = await getTranslations("common");
  const es = locale !== "en";
  return (
    <main id="main" className="np-public flex min-h-screen flex-col items-center justify-center px-6 py-16 text-center">
      <Logo size="lg" animate />
      <p className="np-eyebrow mt-14 text-gold-text">{es ? "Error 404" : "Error 404"}</p>
      <h1 className="mt-3 max-w-xl text-[40px] leading-tight md:text-[52px]">{t("notFound")}</h1>
      <p className="mt-3 max-w-md text-[16px] text-muted">{t("notFoundBody")}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href={`/${locale}`} className="np-btn-navy inline-flex h-12 items-center rounded-full bg-navy px-7 font-display text-[15px] font-semibold text-ivory hover:bg-navy-2">{t("back")}</Link>
        <Link href={`/${locale}/search?type=SALE`} className="np-btn-outline inline-flex h-12 items-center rounded-full border-[1.5px] border-navy px-7 font-display text-[15px] font-semibold text-navy hover:bg-navy/5">
          {es ? "Ver propiedades" : "See properties"}
        </Link>
      </div>
    </main>
  );
}

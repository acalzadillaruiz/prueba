import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/types/domain";
import { Logo } from "@/components/brand/Logo";
import { FooterAccountLink } from "./FooterAccountLink";

export async function PublicFooter({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "footer" });
  const nav = await getTranslations({ locale, namespace: "nav" });
  const linkCls = "inline-flex min-h-11 items-center text-[15px] text-ivory/80 transition-colors hover:text-ivory md:min-h-0 md:py-1";
  const col = (title: string, links: [string, string][], extra?: React.ReactNode) => (
    <div>
      <div className="np-eyebrow mb-4 text-[#D9C59C]">{title}</div>
      <ul className="space-y-1.5 md:space-y-2">
        {links.map(([label, h]) => (
          <li key={label}><Link href={h} className={linkCls}>{label}</Link></li>
        ))}
        {extra && <li>{extra}</li>}
      </ul>
    </div>
  );
  return (
    <footer className="np-navy-panel bg-navy text-ivory">
      <div className="mx-auto grid max-w-[1320px] grid-cols-2 gap-x-6 gap-y-10 px-4 pb-14 pt-16 md:grid-cols-[1.3fr_1fr_1fr_1fr] md:gap-12 md:px-8">
        <div className="col-span-2 flex flex-col items-start md:col-span-1 md:items-center md:text-center">
          <Logo tone="ivory" size="lg" />
          <p className="mt-6 max-w-[280px] text-[15px] leading-relaxed text-ivory/75">{t("about")}</p>
        </div>
        {col(t("search"), [
          [nav("buy"), `/${locale}/search?type=SALE`],
          [nav("rent"), `/${locale}/search?type=LONG_RENT`],
          [nav("privateCollection"), `/${locale}/luxury`],
          [nav("remoteBuying"), `/${locale}#compra-a-distancia`],
          [nav("vacation"), `/${locale}/search?type=SHORT_RENT`],
          [nav("commercial"), `/${locale}/search?type=COMMERCIAL`],
        ])}
        {col(t("owners"), [[t("sellWithUs"), `/${locale}/owner/new`], [t("valuation"), `/${locale}/owner/new`], [t("myProperties"), `/${locale}/owner/listings`]])}
        {col(t("agencies"), [[t("forAgencies"), `/${locale}/register`]], <FooterAccountLink locale={locale} signIn={nav("signIn")} className={linkCls} />)}
      </div>
      <div className="border-t border-[#B4935A]/30">
        <div className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-2 px-4 py-5 text-sm text-ivory/60 md:px-8">
          <span>© {new Date().getFullYear()} New Place · {t("legal")}</span>
          <span>{t("listedOn")}</span>
        </div>
      </div>
    </footer>
  );
}

import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/types/domain";
import { Logo } from "@/components/brand/Logo";

export async function PublicFooter({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "footer" });
  const nav = await getTranslations({ locale, namespace: "nav" });
  const brand = await getTranslations({ locale, namespace: "brand" });
  const col = (title: string, links: [string, string][]) => (
    <div>
      <div className="mb-3 font-display text-sm font-semibold text-ivory">{title}</div>
      <ul className="space-y-2 text-sm text-mist">
        {links.map(([label, h]) => (
          <li key={label}><Link href={h} className="hover:text-ivory">{label}</Link></li>
        ))}
      </ul>
    </div>
  );
  return (
    <footer className="mt-20 bg-navy text-ivory">
      <div className="mx-auto grid max-w-[1400px] gap-10 px-4 py-14 md:grid-cols-5 md:px-6">
        <div className="md:col-span-2">
          <Logo tone="ivory" />
          <p className="mt-3 max-w-xs font-display text-2xl text-ivory/90">{brand("tagline")}</p>
          <p className="mt-3 max-w-sm text-sm text-mist">{t("about")}</p>
        </div>
        {col(t("search"), [[nav("buy"), `/${locale}/search?type=SALE`], [nav("rent"), `/${locale}/search?type=LONG_RENT`], [nav("vacation"), `/${locale}/search?type=SHORT_RENT`], [nav("luxury"), `/${locale}/luxury`]])}
        {col(t("owners"), [[t("listFree"), `/${locale}/owner/new`], [t("hireAgency"), `/${locale}/owner/new`], [t("myProperties"), `/${locale}/owner/listings`]])}
        {col(t("agencies"), [[t("forAgencies"), `/${locale}/register`], [nav("signIn"), `/${locale}/login`]])}
      </div>
      <div className="border-t border-navy-line">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-mist md:px-6">
          <span>© {new Date().getFullYear()} New Place · {t("legal")}</span>
          <span>{t("listedOn")}</span>
        </div>
      </div>
    </footer>
  );
}

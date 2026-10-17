import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/types/domain";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui";
import { FooterAccountLink } from "./FooterAccountLink";
import { FooterPrefs } from "./FooterPrefs";
import { DEMO_ENABLED } from "@/lib/demo";
import { tx } from "@/lib/i18n";

export async function PublicFooter({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "footer" });
  const nav = await getTranslations({ locale, namespace: "nav" });
  const linkCls = "np-link inline-flex min-h-11 items-center text-[17px] text-muted transition-colors duration-np hover:text-ink md:min-h-0 md:py-1";
  // Phones: each column is a closed accordion (native details/summary: keyboard and screen-reader ready), so the
  // footer doesn't repeat ~1,000 px of links the tab bar and the menu already offer. md+: the open columns as before.
  const list = (links: [string, string][], extra?: React.ReactNode) => (
    <ul className="space-y-1.5 md:space-y-2">
      {links.map(([label, h]) => (
        <li key={label}><Link href={h} className={linkCls}>{label}</Link></li>
      ))}
      {extra && <li>{extra}</li>}
    </ul>
  );
  const col = (title: string, links: [string, string][], extra?: React.ReactNode) => (
    <div className="col-span-2 md:col-span-1">
      <details data-footer-group className="group py-1 md:hidden">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between font-display text-[17px] font-medium text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral [&::-webkit-details-marker]:hidden">
          {title}
          <ChevronDown size={18} aria-hidden className="text-muted transition-transform duration-np group-open:rotate-180" />
        </summary>
        <div className="pb-3">{list(links, extra)}</div>
      </details>
      <div className="hidden md:block">
        <div className="mb-4 font-display text-[17px] font-medium text-ink">{title}</div>
        {list(links, extra)}
      </div>
    </div>
  );
  return (
    <footer className="relative overflow-hidden bg-arena text-ink">
      <div className="np-gutter relative mx-auto flex max-w-[1280px] box-content flex-wrap items-end justify-between gap-10 pb-12 pt-[var(--np-section)]">
        <div data-reveal="stagger">
          <p className="np-t-band text-ink">{locale === "es" ? "¿Hablamos?" : "Shall we talk?"}</p>
          <p className="np-t-lead mt-6 text-muted">{locale === "es" ? "Un asesor te atiende a cualquier hora." : "An advisor answers at any hour."}</p>
        </div>
        <Button href={`/${locale}/luxury#acceso`} variant="navy" size="lg">
          {locale === "es" ? "Hablar con un asesor" : "Talk to an advisor"}
        </Button>
      </div>
      <div className="np-gutter relative mx-auto grid max-w-[1280px] box-content grid-cols-2 gap-x-6 gap-y-0 pb-16 pt-10 md:grid-cols-[1.3fr_1fr_1fr_1fr] md:gap-12 md:pt-16">
        <div className="col-span-2 mb-6 flex flex-col items-start md:col-span-1 md:mb-0 md:items-center md:text-center">
          <Logo tone="navy" size="lg" />
          <p className="mt-4 max-w-[280px] text-[17px] leading-relaxed text-muted md:mt-6">{t("about")}</p>
        </div>
        {col(t("search"), [
          [nav("buy"), `/${locale}/search?type=SALE`],
          [nav("rent"), `/${locale}/search?type=LONG_RENT`],
          [nav("privateCollection"), `/${locale}/luxury`],
          [nav("remoteBuying"), `/${locale}#compra-a-distancia`],
          [nav("vacation"), `/${locale}/search?type=SHORT_RENT`],
          [nav("commercial"), `/${locale}/search?type=COMMERCIAL`],
        ])}
        {col(t("owners"), [[t("sellWithUs"), `/${locale}/sell`], [t("valuation"), `/${locale}/sell#estimar`], [t("myProperties"), `/${locale}/owner/listings`]])}
        {col(t("agencies"), [[t("forAgencies"), `/${locale}/register`]], <FooterAccountLink locale={locale} signIn={nav("signIn")} className={linkCls} />)}
      </div>
      <div className="relative bg-[#E8DECD] dark:bg-[#132634]">
        {/* TODO(legal): Privacidad · Términos · Cookies links go here once the client provides and approves the texts. */}
        <div className="np-gutter mx-auto flex max-w-[1280px] box-content flex-wrap items-center justify-between gap-x-6 gap-y-3 py-5 text-[15px] text-muted">
          <span>
            © {new Date().getFullYear()} <span translate="no">New Place</span> · {t("legal")}
            {/* Demo login (DEMO_AUTH) only: a quiet link to the "sign in as…" chooser, never a floating control. */}
            {DEMO_ENABLED && (
              <>
                {" · "}
                <Link href={`/${locale}/login?preview=1`} rel="nofollow" className="inline-block max-h-6 text-[13px] leading-6 text-muted underline-offset-2 hover:text-coral hover:underline" data-private-preview>
                  {tx(locale, "Vista previa privada", "Private preview")}
                </Link>
              </>
            )}
          </span>
          <FooterPrefs locale={locale} />
        </div>
      </div>
    </footer>
  );
}

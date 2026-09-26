import type { Locale } from "@/types/domain";
import { PublicHeader } from "./PublicHeader";
import { PublicFooter } from "./PublicFooter";

export function PublicPage({ locale, children, footer = true, header = "light" }: { locale: Locale; children: React.ReactNode; footer?: boolean; header?: "light" | "dark" | "transparent" }) {
  return (
    <>
      <PublicHeader locale={locale} variant={header} />
      <main>{children}</main>
      {footer && <PublicFooter locale={locale} />}
    </>
  );
}

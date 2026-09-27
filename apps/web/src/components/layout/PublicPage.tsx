import type { Locale } from "@/types/domain";
import { PublicHeader } from "./PublicHeader";
import { PublicFooter } from "./PublicFooter";

export function PublicPage({ locale, children, footer = true, header = "light" }: { locale: Locale; children: React.ReactNode; footer?: boolean; header?: "light" | "dark" | "transparent" }) {
  return (
    <div className="np-public min-h-screen">
      <PublicHeader locale={locale} variant={header} />
      <main id="main">{children}</main>
      {footer && <PublicFooter locale={locale} />}
    </div>
  );
}

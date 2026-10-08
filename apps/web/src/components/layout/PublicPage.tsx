import type { Locale } from "@/types/domain";
import { FloatingContact, MobileTabBar } from "@/components/brand/PublicChrome";
import { CompareTray } from "@/components/compare/CompareTray";
import { cn } from "@/lib/cn";
import { PublicHeader } from "./PublicHeader";
import { PublicFooter } from "./PublicFooter";

/**
 * Public page shell. `tabbar` adds the phone bottom navigation; `contact` adds the floating contact button
 * (WhatsApp only when a real number is passed, otherwise a link to the contact flow).
 */
export function PublicPage({
  locale,
  children,
  footer = true,
  header = "light",
  tabbar = false,
  contact,
}: {
  locale: Locale;
  children: React.ReactNode;
  footer?: boolean;
  header?: "light" | "dark" | "transparent";
  tabbar?: boolean;
  contact?: { href: string; label: string; whatsapp?: boolean };
}) {
  return (
    <div className={cn("np-public min-h-screen", tabbar && "pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0")}>
      <PublicHeader locale={locale} variant={header} />
      <main id="main">{children}</main>
      {footer && <PublicFooter locale={locale} />}
      {contact && <FloatingContact {...contact} tabbar={tabbar} />}
      {tabbar && <MobileTabBar locale={locale} />}
      <CompareTray locale={locale} />
    </div>
  );
}

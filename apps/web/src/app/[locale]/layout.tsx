import { notFound } from "next/navigation";
import { prisma } from "@newplace/db";
import { AppStateProvider } from "@/lib/store";
import { isLocale } from "@/lib/i18n";
import { DemoBar } from "@/components/layout/DemoBar";
import { HtmlLang } from "@/components/layout/HtmlLang";
import { getAppAgency, getAppUser } from "@/server/session";

export function generateStaticParams() {
  return [{ locale: "es" }, { locale: "en" }];
}

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const user = await getAppUser();
  const [agency, saved] = await Promise.all([
    getAppAgency(user?.agencyId ?? null),
    user ? prisma.savedListing.findMany({ where: { userId: user.id }, select: { listingId: true }, orderBy: { createdAt: "desc" } }) : Promise.resolve([]),
  ]);
  return (
    <AppStateProvider user={user} agency={agency} savedIds={saved.map((s) => s.listingId)}>
      <HtmlLang locale={locale} />
      {children}
      <DemoBar locale={locale} />
    </AppStateProvider>
  );
}

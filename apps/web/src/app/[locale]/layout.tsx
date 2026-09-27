import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { prisma } from "@newplace/db";
import { AppStateProvider } from "@/lib/store";
import { isLocale } from "@/lib/i18n";
import { DemoBar } from "@/components/layout/DemoBar";
import { SwUpdate } from "@/components/layout/SwUpdate";
import { getAppAgency, getAppUser } from "@/server/session";

export function generateStaticParams() {
  return [{ locale: "es" }, { locale: "en" }];
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const es = locale !== "en";
  const title = es ? "New Place — Un nuevo lugar." : "New Place — Real estate. Redefined.";
  const description = es
    ? "Compra, alquila y publica inmuebles verificados en Venezuela: mapa, estimación de precio con IA y visitas con la agenda real del agente."
    : "Buy, rent and list verified homes in Venezuela: map search, AI price estimates and tours booked on the agent’s real calendar.";
  return {
    title: { default: title, template: "%s · New Place" },
    description,
    alternates: { canonical: `/${locale}`, languages: { es: "/es", en: "/en", "x-default": "/es" } },
    openGraph: { type: "website", siteName: "New Place", locale: es ? "es_VE" : "en_US", title, description, url: `/${locale}`, images: [{ url: "/icons/og.png", width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, description, images: ["/icons/og.png"] },
  };
}

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const user = await getAppUser();
  const [agency, saved] = await Promise.all([
    getAppAgency(user?.agencyId ?? null),
    user ? prisma.savedListing.findMany({ where: { userId: user.id }, select: { listingId: true }, orderBy: { createdAt: "desc" } }) : Promise.resolve([]),
  ]);
  return (
    <NextIntlClientProvider>
    <AppStateProvider user={user} agency={agency} savedIds={saved.map((s) => s.listingId)}>
      {children}
      <DemoBar locale={locale} />
      <SwUpdate locale={locale} />
    </AppStateProvider>
    </NextIntlClientProvider>
  );
}

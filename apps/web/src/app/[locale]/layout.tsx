import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { AppStateProvider } from "@/lib/store";
import { isLocale } from "@/lib/i18n";
import { DemoBar } from "@/components/layout/DemoBar";
import { SwUpdate } from "@/components/layout/SwUpdate";
import { SITE_URL } from "@/lib/seo";
import { fontVars } from "../fonts";
import "../globals.css";

export const viewport: Viewport = { themeColor: "#0B1220", width: "device-width", initialScale: 1, viewportFit: "cover" };

/** Applies the saved theme before first paint (no flash). */
const THEME_SCRIPT = "try{if(localStorage.getItem('np-theme')==='dark')document.documentElement.classList.add('dark')}catch(e){}";

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
    metadataBase: new URL(SITE_URL),
    applicationName: "New Place",
    manifest: "/manifest.webmanifest",
    icons: { icon: [{ url: "/favicon.ico", sizes: "any" }, { url: "/icons/icon-192.png", type: "image/png" }], apple: "/icons/apple-touch-icon.png" },
    appleWebApp: { capable: true, title: "New Place", statusBarStyle: "black-translucent" },
    other: { "apple-mobile-web-app-capable": "yes" },
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
  // No session read here: public pages stay static/cacheable and free of personal data. Private areas wrap
  // themselves in <PrivateState> (server session); public pages load it in the browser.
  return (
    <html lang={locale} className={fontVars} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-screen">
        <NextIntlClientProvider>
          <AppStateProvider>
            {children}
            <DemoBar locale={locale} />
            <SwUpdate locale={locale} />
          </AppStateProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

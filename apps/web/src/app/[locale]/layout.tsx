import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { AppStateProvider } from "@/lib/store";
import { isLocale } from "@/lib/i18n";
import { DemoBarSlot } from "@/components/layout/DemoBarSlot";
import { SwUpdate } from "@/components/layout/SwUpdate";
import { OG_IMAGE, SITE_URL, jsonLdHtml } from "@/lib/seo";
import { fontVars } from "../fonts";
import "../globals.css";

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#EDE6DA" },
    { media: "(prefers-color-scheme: dark)", color: "#141617" },
  ],
  width: "device-width", initialScale: 1, viewportFit: "cover" };

/**
 * Applies the theme before first paint (no flash): the visitor's explicit choice (np-theme) wins; without one, the
 * device's light/dark setting. PublicHeader follows later device changes while no choice is stored.
 */
const THEME_SCRIPT =
  "try{var t=localStorage.getItem('np-theme');if(t==='dark'||(!t&&window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}";

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
    openGraph: { type: "website", siteName: "New Place", locale: es ? "es_VE" : "en_US", title, description, url: `/${locale}`, images: [OG_IMAGE] },
    twitter: { card: "summary_large_image", title, description, images: [OG_IMAGE.url] },
  };
}

/** Site-wide structured data: the brand (a real-estate agent) and the site search box (sitelinks search). */
function siteJsonLd(locale: string) {
  const home = `${SITE_URL}/${locale}`;
  const es = locale !== "en";
  return [
    {
      "@context": "https://schema.org",
      "@type": "RealEstateAgent",
      "@id": `${SITE_URL}/#organization`,
      name: "New Place",
      url: home,
      logo: `${SITE_URL}/icons/icon-512.png`,
      image: `${SITE_URL}${OG_IMAGE.url}`,
      description: es ? "Inmuebles verificados y de lujo en Venezuela." : "Verified and luxury real estate in Venezuela.",
      areaServed: { "@type": "Country", name: "Venezuela" },
      address: { "@type": "PostalAddress", addressCountry: "VE" },
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: "New Place",
      url: home,
      inLanguage: es ? "es-VE" : "en",
      publisher: { "@id": `${SITE_URL}/#organization` },
      potentialAction: {
        "@type": "SearchAction",
        target: { "@type": "EntryPoint", urlTemplate: `${home}/search?q={search_term_string}` },
        "query-input": "required name=search_term_string",
      },
    },
  ];
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
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(siteJsonLd(locale)) }} />
      </head>
      <body className="min-h-screen">
        <NextIntlClientProvider>
          <AppStateProvider>
            {children}
            <DemoBarSlot locale={locale} />
            <SwUpdate locale={locale} />
          </AppStateProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

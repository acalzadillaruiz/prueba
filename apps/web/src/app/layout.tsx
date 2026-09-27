import type { Metadata, Viewport } from "next";
import { getLocale } from "next-intl/server";
import { SITE_URL } from "@/lib/seo";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "New Place — Un nuevo lugar.", template: "%s · New Place" },
  description: "Marketplace inmobiliario y sistema operativo para agencias. Venezuela primero.",
  applicationName: "New Place",
  manifest: "/manifest.webmanifest",
  icons: { icon: [{ url: "/favicon.ico", sizes: "any" }, { url: "/icons/icon-192.png", type: "image/png" }], apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "New Place", statusBarStyle: "black-translucent" },
  other: { "apple-mobile-web-app-capable": "yes" },
};
export const viewport: Viewport = { themeColor: "#0B1220", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLocale().catch(() => "es");
  return (
    <html lang={lang} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: "try{if(localStorage.getItem('np-theme')==='dark')document.documentElement.classList.add('dark')}catch(e){}" }} />
      </head>
      <body className="min-h-screen">
        {children}
      </body>
    </html>
  );
}

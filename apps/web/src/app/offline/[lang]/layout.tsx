import type { Metadata, Viewport } from "next";
import { fontVars } from "../../fonts";
import "../../globals.css";

export const viewport: Viewport = { themeColor: "#1C1D1D", width: "device-width", initialScale: 1, viewportFit: "cover" };
export const metadata: Metadata = { title: "Offline · New Place", robots: { index: false, follow: false }, manifest: "/manifest.webmanifest" };

/** Standalone root layout: the offline fallback must render with no session, data or locale middleware. */
export default async function OfflineLayout({ children, params }: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  return (
    <html lang={lang === "en" ? "en" : "es"} className={fontVars}>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}

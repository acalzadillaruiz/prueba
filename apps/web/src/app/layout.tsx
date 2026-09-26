import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PwaRegister } from "@/components/layout/PwaRegister";

export const metadata: Metadata = {
  title: { default: "New Place — Un nuevo lugar.", template: "%s · New Place" },
  description: "Marketplace inmobiliario y sistema operativo para agencias. Venezuela primero.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "New Place", statusBarStyle: "black-translucent" },
};
export const viewport: Viewport = { themeColor: "#0B1220", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="min-h-screen">
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { PrivateState } from "@/components/layout/PrivateState";

export const dynamic = "force-dynamic";

/** Private area: titled for the tab, never indexed (pages may override the title). */
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: locale === "en" ? "My account" : "Mi cuenta", robots: { index: false, follow: false } };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <PrivateState>{children}</PrivateState>;
}

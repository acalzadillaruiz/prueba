import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PrivateState } from "@/components/layout/PrivateState";
import { getAppUser } from "@/server/session";

export const dynamic = "force-dynamic";

/** Private area: titled for the tab, never indexed (pages may override the title). */
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: locale === "en" ? "Platform console" : "Consola de plataforma", robots: { index: false, follow: false } };
}

export default async function Layout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  // Middleware gates /platform with the JWT role; re-check the live DB role (a token can outlive a demotion or suspension).
  const user = await getAppUser();
  if (!user) redirect(`/${locale}/login?next=/${locale}/platform`);
  if (user.role !== "SUPERADMIN") redirect(`/${locale}?denied=platform`);
  return <PrivateState>{children}</PrivateState>;
}

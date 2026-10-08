import type { Locale } from "@/types/domain";
import { Suspense } from "react";
import { AuthForm } from "@/components/seeker/AuthForm";
import { PublicPage } from "@/components/layout/PublicPage";
import { pageMeta } from "@/lib/seo";
import { tx } from "@/lib/i18n";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  return pageMeta(locale, tx(locale, "Entrar", "Sign in"), "/login", { index: false });
}

export default async function Login({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  // Normal public layout (header with logo and menu, tab bar on phones): never a dead end.
  return (
    <PublicPage locale={locale} footer={false} tabbar>
      <Suspense>
        <AuthForm locale={locale} mode="login" />
      </Suspense>
    </PublicPage>
  );
}

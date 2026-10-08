import type { Locale } from "@/types/domain";
import { ForgotPasswordForm } from "@/components/seeker/PasswordReset";
import { PublicPage } from "@/components/layout/PublicPage";
import { pageMeta } from "@/lib/seo";
import { tx } from "@/lib/i18n";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  return pageMeta(locale, tx(locale, "Recupera tu contraseña", "Reset your password"), "/forgot-password", { index: false });
}

/** Public: "¿Olvidaste tu contraseña?" (not under a protected area in middleware.ts). */
export default async function ForgotPassword({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<{ email?: string }> }) {
  const { locale } = await params;
  const { email } = await searchParams;
  const initial = typeof email === "string" && email.length <= 254 && /^[^\s@]+@[^\s@]+$/.test(email) ? email : "";
  return (
    <PublicPage locale={locale} footer={false} tabbar>
      <ForgotPasswordForm locale={locale} initialEmail={initial} />
    </PublicPage>
  );
}

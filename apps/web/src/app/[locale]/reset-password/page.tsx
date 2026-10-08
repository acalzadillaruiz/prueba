import type { Locale } from "@/types/domain";
import { ResetPasswordForm } from "@/components/seeker/PasswordReset";
import { PublicPage } from "@/components/layout/PublicPage";
import { checkPasswordReset } from "@/server/password-reset";
import { pageMeta } from "@/lib/seo";
import { tx } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  // The token rides in the query string: never index, never leak it through the Referer of outgoing links.
  return { ...pageMeta(locale, tx(locale, "Nueva contraseña", "New password"), "/reset-password", { index: false }), referrer: "no-referrer" as const };
}

/** Public target of the emailed link (/{locale}/reset-password?token=…). Shows the form or the "link expired" state. */
export default async function ResetPassword({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<{ token?: string }> }) {
  const { locale } = await params;
  const { token } = await searchParams;
  const t = typeof token === "string" ? token : "";
  const valid = await checkPasswordReset(t);
  return (
    <PublicPage locale={locale} footer={false} tabbar>
      <ResetPasswordForm locale={locale} token={t} valid={valid} />
    </PublicPage>
  );
}

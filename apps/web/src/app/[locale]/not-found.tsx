import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Logo } from "@/components/brand/Logo";
import { Pin } from "@/components/brand/Logo";

export default async function NotFound() {
  const locale = await getLocale();
  const t = await getTranslations("common");
  return (
    <main id="main" className="np-public flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <Logo />
      <Pin className="h-14 w-14 opacity-80" />
      <h1 className="font-display text-3xl font-semibold">{t("notFound")}</h1>
      <p className="max-w-sm text-ink/60">{t("notFoundBody")}</p>
      <Link href={`/${locale}`} className="rounded-np bg-coral-cta px-5 py-2.5 font-display text-white hover:bg-coral-cta-hover">{t("back")}</Link>
    </main>
  );
}

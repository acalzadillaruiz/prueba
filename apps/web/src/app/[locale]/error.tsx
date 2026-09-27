"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Logo } from "@/components/brand/Logo";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("common");
  useEffect(() => {
    console.error(error);
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) import("@sentry/nextjs").then((S) => S.captureException(error));
  }, [error]);
  return (
    <main id="main" className="np-public flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <Logo />
      <h1 className="font-display text-3xl font-semibold">{t("error")}</h1>
      <p className="max-w-sm text-ink/60">{t("errorBody")}</p>
      {error.digest && <code className="text-xs text-ink/65">{error.digest}</code>}
      <button onClick={reset} className="rounded-np bg-coral-cta px-5 py-2.5 font-display text-white hover:bg-coral-cta-hover">{t("retry")}</button>
    </main>
  );
}

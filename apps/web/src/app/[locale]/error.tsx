"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { isLocale, msg } from "@/lib/i18n";
import { Logo } from "@/components/brand/Logo";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  // Catalog strings without next-intl client hooks: this boundary ships with every page.
  const lang = useParams<{ locale?: string }>()?.locale ?? "es";
  const t = msg(isLocale(lang) ? lang : "es", "common");
  useEffect(() => {
    console.error(error);
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) import("@sentry/nextjs").then((S) => S.captureException(error));
  }, [error]);
  return (
    <main id="main" className="np-public flex min-h-screen flex-col items-center justify-center px-6 py-16 text-center">
      <Logo size="lg" animate />
      <h1 className="mt-14 max-w-xl text-[40px] leading-tight md:text-[48px]">{t("error")}</h1>
      <p className="mt-3 max-w-sm text-[16px] text-muted">{t("errorBody")}</p>
      {error.digest && <code className="mt-2 text-sm text-muted">{error.digest}</code>}
      <button onClick={reset} className="np-btn-navy mt-8 inline-flex h-12 items-center rounded-full bg-navy px-7 font-display text-[15px] font-semibold text-ivory hover:bg-navy-2">{t("retry")}</button>
    </main>
  );
}

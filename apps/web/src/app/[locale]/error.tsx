"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Logo } from "@/components/brand/Logo";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("common");
  useEffect(() => console.error(error), [error]);
  return (
    <div className="np-public flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <Logo />
      <h1 className="font-display text-3xl font-semibold">{t("error")}</h1>
      <p className="max-w-sm text-ink/60">{t("errorBody")}</p>
      {error.digest && <code className="text-xs text-ink/40">{error.digest}</code>}
      <button onClick={reset} className="rounded-np bg-coral px-5 py-2.5 font-display text-white hover:bg-coral-hover">{t("retry")}</button>
    </div>
  );
}

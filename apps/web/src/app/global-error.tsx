"use client";

import { useEffect } from "react";
import "./globals.css";

/** Last-resort error screen when the root layout itself fails (e.g. database down). Bilingual, no data needed. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) import("@sentry/nextjs").then((S) => S.captureException(error));
  }, [error]);
  return (
    <html lang="es">
      <body className="min-h-screen bg-ivory text-ink">
        <main id="main" className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
          <h1 className="font-display text-3xl font-semibold">New Place</h1>
          <p className="max-w-sm text-ink/70">Algo salió mal. Inténtalo de nuevo en unos segundos. · Something went wrong. Please try again.</p>
          {error.digest && <code className="text-xs text-muted">{error.digest}</code>}
          <button onClick={reset} className="min-h-11 rounded-np bg-coral-cta px-5 py-2.5 font-display text-white">Reintentar · Retry</button>
        </main>
      </body>
    </html>
  );
}

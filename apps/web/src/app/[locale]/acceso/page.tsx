import Image from "next/image";
import type { Locale } from "@/types/domain";
import { Logo } from "@/components/brand/Logo";
import { pageMeta } from "@/lib/seo";
import { tx } from "@/lib/i18n";
import { safeNext } from "@/lib/site-gate";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  return pageMeta(locale, tx(locale, "Acceso privado", "Private access"), "/acceso", { index: false });
}

/** Pre-launch gate (see lib/site-gate.ts): a plain form, works without JavaScript. */
export default async function Acceso({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<{ error?: string; next?: string }> }) {
  const { locale } = await params;
  const { error, next } = await searchParams;
  const msg =
    error === "code"
      ? tx(locale, "El código no es correcto. Revísalo y prueba otra vez.", "That code isn’t right. Check it and try again.")
      : error === "limit"
        ? tx(locale, "Vas muy rápido. Espera unos minutos y vuelve a intentarlo.", "That’s a lot of tries. Wait a few minutes and try again.")
        : null;
  return (
    <main id="main" className="relative isolate grid min-h-[100svh] place-items-center overflow-hidden bg-[#CFE3F1] px-4 py-16 text-ink">
      <Image src="/media/048/hero-playa-2400.webp" alt="" fill priority sizes="100vw" className="-z-10 object-cover" />
      <div className="absolute inset-0 -z-10 bg-[rgb(31_58_77/.25)]" aria-hidden />
      <form action="/api/access" method="post" className="np-soft-card grid w-full max-w-[420px] justify-items-center gap-6 rounded-[24px] bg-[#FAF8F4] px-6 py-10 text-center sm:px-10">
        <Logo tone="navy" size="lg" />
        <div className="grid gap-2">
          <h1 className="np-t-h2 text-ink">{tx(locale, "Acceso privado", "Private access")}</h1>
          <p className="text-[15px] text-muted">{tx(locale, "Estamos en vista previa privada. Escribe el código que te compartimos.", "We’re in private preview. Enter the code we shared with you.")}</p>
        </div>
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="next" value={safeNext(next, `/${locale}`)} />
        <label htmlFor="gate-code" className="sr-only">{tx(locale, "Código de acceso", "Access code")}</label>
        <input
          id="gate-code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9 ]*"
          maxLength={12}
          required
          autoFocus
          aria-invalid={error === "code" || undefined}
          aria-describedby={msg ? "gate-error" : undefined}
          placeholder="••••••"
          className="h-14 w-full rounded-full border border-ink/20 bg-white px-6 text-center font-display text-[28px] tracking-[0.5em] text-ink placeholder:text-ink/40 focus:border-coral focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral"
         spellCheck={false} />
        {msg && (
          <p id="gate-error" role="alert" className="text-[15px] font-semibold text-danger">
            {msg}
          </p>
        )}
        <button type="submit" className="h-12 w-full rounded-full bg-coral font-display text-[15px] font-semibold text-white transition-colors hover:bg-coral-hover">
          {tx(locale, "Entrar", "Enter")}
        </button>
      </form>
    </main>
  );
}

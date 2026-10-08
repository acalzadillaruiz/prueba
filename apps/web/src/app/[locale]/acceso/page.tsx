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
      ? tx(locale, "El código no es correcto. Inténtalo de nuevo.", "That code is not correct. Please try again.")
      : error === "limit"
        ? tx(locale, "Demasiados intentos. Espera unos minutos y vuelve a probar.", "Too many attempts. Wait a few minutes and try again.")
        : null;
  return (
    <main id="main" className="relative isolate grid min-h-[100svh] place-items-center overflow-hidden bg-navy px-4 py-16 text-ivory">
      <Image src="/brand/hero-arco.jpg" alt="" fill priority sizes="100vw" className="-z-10 object-cover opacity-30" />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(30,26,24,.55),rgba(30,26,24,.92))]" aria-hidden />
      <form action="/api/access" method="post" className="grid w-full max-w-[400px] justify-items-center gap-6 text-center">
        <Logo tone="ivory" size="lg" />
        <div className="grid gap-2">
          <h1 className="text-[34px] leading-tight text-ivory">{tx(locale, "Acceso privado", "Private access")}</h1>
          <p className="text-[15px] text-ivory/80">{tx(locale, "La web está en vista previa. Introduce el código que te hemos facilitado.", "The site is in private preview. Enter the code you were given.")}</p>
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
          className="h-14 w-full rounded-full border border-ivory/30 bg-white/10 px-6 text-center font-display text-[24px] tracking-[0.5em] text-ivory placeholder:text-ivory/40 focus:border-ivory focus:outline-none"
        />
        {msg && (
          <p id="gate-error" role="alert" className="text-[14px] font-semibold text-[#F3B4A3]">
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

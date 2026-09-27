"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema } from "@newplace/config";
import { fieldError } from "@/lib/form";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Building2, Eye, EyeOff, FlaskConical, Loader2 } from "lucide-react";
import type { Locale } from "@/types/domain";
import { Logo } from "@/components/brand/Logo";
import { PropertyArt } from "@/components/art/PropertyArt";
import { photo } from "@/lib/photos";
import { Avatar, Button, Field, inputCls } from "@/components/ui";
import { DEMO_ENABLED, DEMO_LOGINS } from "@/lib/demo";
import { api } from "@/lib/api";
import { tx } from "@/lib/i18n";

const GOOGLE = process.env.NEXT_PUBLIC_GOOGLE_AUTH === "true";

function GoogleG() {
  return (
    <svg viewBox="0 0 48 48" width="18" height="18" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.6 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

export function AuthForm({ locale, mode }: { locale: Locale; mode: "login" | "register" }) {
  const [show, setShow] = useState(false);
  const [agency, setAgency] = useState(false);
  const schema = mode === "login" ? registerSchema.pick({ email: true, password: true }) : agency ? registerSchema.required({ agencyName: true }) : registerSchema;
  type FormValues = { name?: string; email: string; password: string; agencyName?: string };
  const { register, handleSubmit, formState } = useForm<FormValues>({ resolver: zodResolver(schema as never), mode: "onTouched" });
  const errs = formState.errors;
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();
  const sp = useSearchParams();
  const rawNext = sp.get("next");
  // Same-origin paths only: "/x" is fine, "//evil.com" and "/\\evil.com" are not.
  const next = rawNext && /^\/(?![\/\\])/.test(rawNext) ? rawNext : null;

  const finish = (home: string) => {
    router.push(next ?? `/${locale}${home}`);
    router.refresh();
  };

  const submit = async ({ name, email, password, agencyName }: FormValues) => {
    setErr(null);
    setBusy("form");
    try {
      if (mode === "register") await api("auth/register", { method: "POST", json: { name, email, password, ...(agency ? { agencyName } : {}) } });
      const r = await signIn("credentials", { email, password, redirect: false });
      if (r?.error) throw new Error(tx(locale, "Email o contraseña incorrectos.", "Wrong email or password."));
      finish(mode === "register" && agency ? "/agency" : "/app");
    } catch (e2) {
      setErr((e2 as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="np-public grid min-h-screen lg:grid-cols-2">
      <main id="main" className="flex flex-col px-6 py-8 md:px-16">
        <Link href={`/${locale}`}><Logo /></Link>
        <div className="mx-auto my-auto w-full max-w-md py-10">
          <h1 className="font-display text-3xl font-semibold">{mode === "login" ? tx(locale, "Entra a New Place", "Sign in to New Place") : tx(locale, "Crea tu cuenta", "Create your account")}</h1>
          <p className="mt-1 text-ink/60">{mode === "login" ? tx(locale, "Guarda, compara y agenda visitas.", "Save, compare and book tours.") : tx(locale, "Gratis. Sin tarjeta.", "Free. No card needed.")}</p>
          <button
            type="button"
            disabled={!GOOGLE}
            title={GOOGLE ? undefined : tx(locale, "Configura AUTH_GOOGLE_ID para activar Google", "Set AUTH_GOOGLE_ID to enable Google")}
            onClick={() => signIn("google", { callbackUrl: next ?? `/${locale}/app` })}
            className="mt-7 flex h-12 w-full items-center justify-center gap-3 rounded-np border border-line bg-white font-display font-medium hover:border-navy/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <GoogleG /> {tx(locale, "Continuar con Google", "Continue with Google")}
          </button>
          <div className="my-6 flex items-center gap-3 text-xs text-ink/65"><span className="h-px flex-1 bg-line" />{tx(locale, "o con tu correo", "or with email")}<span className="h-px flex-1 bg-line" /></div>
          <form className="space-y-4" onSubmit={handleSubmit(submit)} noValidate>
            {mode === "register" && (
              <Field label={tx(locale, "Nombre completo", "Full name")} error={fieldError(errs.name, locale, "name")}><input className={inputCls} {...register("name")} aria-invalid={!!errs.name} autoComplete="name" /></Field>
            )}
            <Field label="Email" error={fieldError(errs.email, locale, "email")}><input className={inputCls} type="email" {...register("email")} aria-invalid={!!errs.email} autoComplete="email" placeholder="tu@gmail.com" /></Field>
            <Field label={tx(locale, "Contraseña", "Password")} error={fieldError(errs.password, locale, "password")} hint={(mode === "register" ? tx(locale, "Mínimo 8 caracteres.", "At least 8 characters.") : undefined)}>
              <div className="relative">
                <input className={inputCls} type={show ? "text" : "password"} {...register("password")} aria-invalid={!!errs.password} autoComplete={mode === "login" ? "current-password" : "new-password"} />
                <button type="button" onClick={() => setShow(!show)} className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center text-ink/65" aria-label={tx(locale, "Mostrar contraseña", "Show password")}>{show ? <EyeOff size={18} /> : <Eye size={18} />}</button>
              </div>
            </Field>
            {mode === "register" && (
              <label className="flex cursor-pointer items-start gap-3 rounded-np border border-line bg-white p-3.5">
                <input type="checkbox" checked={agency} onChange={(e) => setAgency(e.target.checked)} className="mt-1 accent-[#F26B4D]" />
                <span>
                  <span className="flex items-center gap-1.5 font-display font-semibold"><Building2 size={16} /> {tx(locale, "¿Eres agencia?", "Are you an agency?")}</span>
                  <span className="text-sm text-ink/65">{tx(locale, "Crea tu inmobiliaria y empieza con el plan Free.", "Set up your agency on the Free plan.")}</span>
                </span>
              </label>
            )}
            {agency && <Field label={tx(locale, "Nombre de la agencia", "Agency name")} error={fieldError(errs.agencyName, locale, "agencyName")}><input className={inputCls} {...register("agencyName")} placeholder="Andes Prime" /></Field>}
            {err && <div className="rounded-lg bg-[#B423181A] px-3 py-2 text-sm text-danger" role="alert">{err}</div>}
            <Button className="w-full" size="lg" disabled={!!busy}>
              {busy === "form" && <Loader2 size={16} className="animate-spin" />}
              {mode === "login" ? tx(locale, "Entrar", "Sign in") : tx(locale, "Crear cuenta", "Create account")}
            </Button>
          </form>
          <p className="mt-5 text-center text-sm text-ink/60">
            {mode === "login" ? (
              <>{tx(locale, "¿No tienes cuenta?", "No account?")} <Link className="font-semibold text-coral" href={`/${locale}/register`}>{tx(locale, "Regístrate", "Sign up")}</Link></>
            ) : (
              <>{tx(locale, "¿Ya tienes cuenta?", "Have an account?")} <Link className="font-semibold text-coral" href={`/${locale}/login`}>{tx(locale, "Entra", "Sign in")}</Link></>
            )}
          </p>
          {mode === "login" && DEMO_ENABLED && (
            <div className="mt-8 rounded-np border border-dashed border-coral/50 bg-[#F26B4D0D] p-4">
              <div className="flex items-center gap-2 font-display text-sm font-semibold text-coral-hover"><FlaskConical size={15} /> DEMO_AUTH=true · {tx(locale, "Entrar como…", "Sign in as…")}</div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {DEMO_LOGINS.map((d) => (
                  <button
                    key={d.email}
                    disabled={!!busy}
                    onClick={async () => {
                      setBusy(d.email);
                      await signIn("demo", { email: d.email, redirect: false });
                      finish(d.home);
                    }}
                    className="flex items-center gap-2 rounded-lg border border-line bg-white p-2 text-left text-sm hover:border-navy/30"
                  >
                    {busy === d.email ? <Loader2 size={18} className="animate-spin" /> : <Avatar initials={d.initials} hue={d.hue} size={26} />}
                    <span className="font-semibold leading-tight">{tx(locale, d.label.es, d.label.en)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
      <div className="relative hidden overflow-hidden bg-navy lg:block">
        <PropertyArt scene="terrace" seed="auth2" photo={photo("auth")} className="absolute inset-0 h-full w-full opacity-90" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/30 to-transparent" />
        <div className="absolute bottom-12 left-12 right-12 text-ivory">
          <div className="font-display text-5xl font-bold leading-tight">{tx(locale, "Un nuevo", "Real estate.")}<br /><span className="text-coral">{tx(locale, "lugar.", "Redefined.")}</span></div>
          <p className="mt-3 max-w-md text-ivory/75">{tx(locale, "Inmuebles verificados en Caracas, Valencia, Margarita y más.", "Verified listings across Caracas, Valencia, Margarita and more.")}</p>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Eye, EyeOff, Loader2, MailCheck } from "lucide-react";
import { registerSchema } from "@newplace/config";
import type { Locale } from "@/types/domain";
import { Button, Field, inputCls } from "@/components/ui";
import { fieldError } from "@/lib/form";
import { api, ApiClientError } from "@/lib/api";
import { useApp } from "@/lib/store";
import { tx } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { k } from "@/components/agency/kit";
import { FORGOT_EMAIL_KEY, homeFor } from "./AuthForm";

const forgotSchema = registerSchema.pick({ email: true });
// Same rules as sign-up (min 8, max 100) plus a confirmation that must match.
const resetSchema = z.object({ password: registerSchema.shape.password, confirm: z.string() }).refine((v) => v.password === v.confirm, { path: ["confirm"], message: "mismatch" });

function Shell({ eyebrow, title, lead, children }: { eyebrow: string; title: string; lead?: string; children: React.ReactNode }) {
  return (
    <div className="px-5 pb-16 pt-8 sm:px-10">
      <div className="mx-auto w-full max-w-[440px] lg:pt-10">
        <div className={k.eyebrow}>{eyebrow}</div>
        <h1 className="mt-2 font-serif text-[40px] font-medium leading-[1.04] text-navy md:text-[48px]">{title}</h1>
        {lead && <p className={cn("mt-3 text-[16px]", k.muted)}>{lead}</p>}
        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}

/** "¿Olvidaste tu contraseña?": asks for the email and always answers the same way (never says whether it exists). */
export function ForgotPasswordForm({ locale, initialEmail = "" }: { locale: Locale; initialEmail?: string }) {
  const { register, handleSubmit, formState, getValues, setValue } = useForm<{ email: string }>({ resolver: zodResolver(forgotSchema), mode: "onTouched", defaultValues: { email: forgotSchema.safeParse({ email: initialEmail }).success ? initialEmail : "" } });
  // The login form hands over the email it already had through sessionStorage (one shot), not the URL; ?email= still works.
  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = sessionStorage.getItem(FORGOT_EMAIL_KEY);
      sessionStorage.removeItem(FORGOT_EMAIL_KEY);
    } catch {}
    if (stored && !getValues("email") && forgotSchema.safeParse({ email: stored }).success) setValue("email", stored);
  }, [getValues, setValue]);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const submit = async ({ email }: { email: string }) => {
    setErr(null);
    setBusy(true);
    try {
      await api("auth/forgot", { method: "POST", json: { email, locale } });
      setSent(true);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  if (sent)
    return (
      <Shell eyebrow={tx(locale, "Recupera tu cuenta", "Get back into your account")} title={tx(locale, "Revisa tu correo", "Check your inbox")}>
        <div className={cn(k.okBox, "flex gap-3")} role="status" data-testid="forgot-sent">
          <MailCheck size={20} className="mt-0.5 shrink-0" aria-hidden />
          <span>
            {tx(locale, `Si existe una cuenta con ${getValues("email")}, te enviamos un enlace para elegir una nueva contraseña. Vale 30 minutos y sirve una sola vez.`, `If there’s an account for ${getValues("email")}, we sent you a link to choose a new password. It works for 30 minutes, once.`)}
          </span>
        </div>
        <p className={cn("mt-5 text-[15px]", k.muted)}>
          {tx(locale, "¿No llega? Mira en spam o promociones, o ", "Nothing yet? Check spam or promotions, or ")}
          <button type="button" className={k.link} onClick={() => setSent(false)}>{tx(locale, "pide otro enlace", "ask for another link")}</button>.
        </p>
        <p className="mt-8 text-center text-[15px]"><Link className={k.link} href={`/${locale}/login`}>{tx(locale, "Volver a entrar", "Back to sign in")}</Link></p>
      </Shell>
    );
  return (
    <Shell
      eyebrow={tx(locale, "Recupera tu cuenta", "Get back into your account")}
      title={tx(locale, "¿Olvidaste tu contraseña?", "Forgot your password?")}
      lead={tx(locale, "Nos pasa a todos. Escribe el email con el que te registraste y te mandamos un enlace para crear una nueva.", "It happens to everyone. Enter the email you signed up with and we’ll send you a link to create a new one.")}
    >
      <form className="space-y-4" onSubmit={handleSubmit(submit)} noValidate>
        <Field label="Email" error={fieldError(formState.errors.email, locale, "email")}>
          <input className={inputCls} type="email" {...register("email")} aria-invalid={!!formState.errors.email} autoComplete="email" placeholder={tx(locale, "tu@correo.com", "you@example.com")} autoFocus />
        </Field>
        {err && <div className={k.err} role="alert">{err}</div>}
        <Button className="w-full rounded-full" size="lg" disabled={busy}>
          {busy && <Loader2 size={16} className="animate-spin" />}
          {tx(locale, "Enviarme el enlace", "Send me the link")}
        </Button>
      </form>
      <p className={cn("mt-6 text-center text-[15px]", k.muted)}>
        {tx(locale, "¿Te acordaste?", "Remembered it?")} <Link className={k.link} href={`/${locale}/login`}>{tx(locale, "Entra", "Sign in")}</Link>
      </p>
    </Shell>
  );
}

/** Reset page: new password (same rules as sign-up) → signs in and lands where the role belongs. */
export function ResetPasswordForm({ locale, token, valid }: { locale: Locale; token: string; valid: boolean }) {
  type V = { password: string; confirm: string };
  const { register, handleSubmit, formState } = useForm<V>({ resolver: zodResolver(resetSchema), mode: "onTouched" });
  const errs = formState.errors;
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [expired, setExpired] = useState(!valid);
  const router = useRouter();
  const { refresh } = useApp();

  const submit = async ({ password }: V) => {
    setErr(null);
    setBusy(true);
    try {
      const r = await api<{ email: string }>("auth/reset", { method: "POST", json: { token, password } });
      const s = await signIn("credentials", { email: r.email, password, redirect: false });
      if (s?.error) {
        router.push(`/${locale}/login?reset=1`);
        return;
      }
      const me = await api<{ user: { role: string } }>("me").catch(() => null);
      await refresh();
      router.push(`/${locale}${homeFor(me?.user.role ?? "SEEKER")}`);
      router.refresh();
    } catch (e) {
      if (e instanceof ApiClientError && e.code === "VALIDATION") setExpired(true);
      else setErr((e as Error).message);
      setBusy(false);
    }
  };

  if (expired)
    return (
      <Shell
        eyebrow={tx(locale, "Recupera tu cuenta", "Get back into your account")}
        title={tx(locale, "Este enlace ya no sirve", "This link has expired")}
        lead={tx(locale, "Los enlaces para cambiar la contraseña valen 30 minutos y se usan una sola vez. Pide uno nuevo y te llega en un momento.", "Password links work for 30 minutes and only once. Ask for a new one and it’ll arrive in a moment.")}
      >
        <Button href={`/${locale}/forgot-password`} size="lg" className="w-full">
          {tx(locale, "Pedir un enlace nuevo", "Get a new link")}
        </Button>
      </Shell>
    );

  return (
    <Shell
      eyebrow={tx(locale, "Recupera tu cuenta", "Get back into your account")}
      title={tx(locale, "Elige una nueva contraseña", "Choose a new password")}
      lead={tx(locale, "Usa una que no uses en otros sitios. Al guardarla entras directo a tu cuenta.", "Pick one you don’t use elsewhere. Once saved, you’re signed straight in.")}
    >
      <form className="space-y-4" onSubmit={handleSubmit(submit)} noValidate>
        <Field label={tx(locale, "Nueva contraseña", "New password")} error={fieldError(errs.password, locale, "password")} hint={tx(locale, "Usa al menos 8 caracteres.", "Use at least 8 characters.")}>
          <div className="relative">
            <input className={inputCls} type={show ? "text" : "password"} {...register("password")} aria-invalid={!!errs.password} autoComplete="new-password" autoFocus />
            <button type="button" onClick={() => setShow(!show)} className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center text-muted" aria-label={show ? tx(locale, "Ocultar contraseña", "Hide password") : tx(locale, "Mostrar contraseña", "Show password")} aria-pressed={show}>
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </Field>
        <Field label={tx(locale, "Repite la contraseña", "Repeat the password")} error={errs.confirm ? tx(locale, "Las dos contraseñas no coinciden.", "The two passwords don’t match.") : undefined}>
          <input className={inputCls} type={show ? "text" : "password"} {...register("confirm")} aria-invalid={!!errs.confirm} autoComplete="new-password" />
        </Field>
        {err && <div className={k.err} role="alert">{err}</div>}
        <Button className="w-full rounded-full" size="lg" disabled={busy}>
          {busy && <Loader2 size={16} className="animate-spin" />}
          {tx(locale, "Guardar y entrar", "Save and sign in")}
        </Button>
      </form>
    </Shell>
  );
}

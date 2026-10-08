"use client";

import { useEffect, useState } from "react";
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
import { Avatar, Button, Field, inputCls } from "@/components/ui";
import { DEMO_ENABLED, DEMO_LOGINS } from "@/lib/demo";
import { api, ApiClientError } from "@/lib/api";
import { useApp } from "@/lib/store";
import { tx } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { k } from "@/components/agency/kit";

/** One-shot hand-off of the email typed on login to "¿Olvidaste tu contraseña?" (read once and removed there). */
export const FORGOT_EMAIL_KEY = "np-forgot-email";
const GOOGLE = process.env.NEXT_PUBLIC_GOOGLE_AUTH === "true";
const ROLE_LABEL: Record<string, [string, string]> = { AGENT: ["agente", "an agent"], CAPTOR: ["captador", "a listings scout"], PHOTOGRAPHER: ["fotógrafo", "a photographer"], BACKOFFICE: ["backoffice", "backoffice"] };

/** Landing page after sign-in, by role. */
export function homeFor(role: string) {
  if (role === "SUPERADMIN") return "/platform";
  if (["AGENCY_OWNER", "AGENT", "BACKOFFICE", "CAPTOR", "PHOTOGRAPHER"].includes(role)) return "/agency";
  if (role === "OWNER_PRIVATE") return "/owner/listings";
  return "/app";
}

function GoogleG() {
  return (
    <svg viewBox="0 0 48 48" width="18" height="18" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.6 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#696059" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

export function AuthForm({ locale, mode }: { locale: Locale; mode: "login" | "register" }) {
  const [show, setShow] = useState(false);
  const [agency, setAgency] = useState(false);
  const schema = mode === "login" ? registerSchema.pick({ email: true, password: true }) : agency ? registerSchema.required({ agencyName: true }) : registerSchema;
  type FormValues = { name?: string; email: string; password: string; agencyName?: string };
  // shouldUnregister: when "¿Eres agencia?" is unticked the hidden agencyName leaves the form (it used to block submit silently).
  const { register, handleSubmit, formState, setValue, watch } = useForm<FormValues>({ resolver: zodResolver(schema as never), mode: "onTouched", shouldUnregister: true });
  const errs = formState.errors;
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();
  const sp = useSearchParams();
  const invite = sp.get("invite");
  // "¿Olvidaste tu contraseña?" carries the email already typed (only when it looks like one), so it isn't typed twice.
  // It travels in sessionStorage, never in the URL (URLs end up in history, logs and referrers).
  const typed = (watch("email") ?? "").trim();
  const forgotHref = `/${locale}/forgot-password`;
  const rememberForgotEmail = () => {
    try {
      if (typed.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(typed)) sessionStorage.setItem(FORGOT_EMAIL_KEY, typed);
      else sessionStorage.removeItem(FORGOT_EMAIL_KEY);
    } catch {}
  };
  const [inv, setInv] = useState<{ agencyName: string; role: string; email: string } | null>(null);
  useEffect(() => {
    if (!invite) return;
    api<{ agencyName: string; role: string; email: string }>(`invitations/${encodeURIComponent(invite)}`)
      .then((d) => {
        setInv(d);
        setValue("email", d.email);
      })
      .catch(() => setErr(tx(locale, "Esta invitación ya no es válida o ya se usó. Pídele una nueva a tu agencia.", "This invitation is no longer valid or was already used. Ask your agency for a new one.")));
  }, [invite, locale, setValue]);
  const rawNext = sp.get("next");
  // Same-origin paths only: "/x" is fine, "//evil.com" and "/\\evil.com" and "/\tevil.com" are not.
  const next = rawNext && /^\/(?![\/\\])[^\s\\]*$/.test(rawNext) ? rawNext : null;
  // Why the visitor is here (saving a home, a search alert): a contextual welcome instead of "good to see you again".
  const rawReason = sp.get("reason");
  const reason = rawReason === "save" || rawReason === "alert" ? rawReason : null;
  // Switching between sign-in and sign-up keeps where the user was going and the invitation.
  const carry = (() => {
    const p = new URLSearchParams();
    if (next) p.set("next", next);
    if (invite) p.set("invite", invite);
    if (reason) p.set("reason", reason);
    const q = p.toString();
    return q ? `?${q}` : "";
  })();

  const { refresh } = useApp();
  const finish = async (home: string) => {
    await refresh(); // public pages keep the session in client state
    router.push(next ?? `/${locale}${home}`);
    router.refresh();
  };

  const submit = async ({ name, email, password, agencyName }: FormValues) => {
    setErr(null);
    setBusy("form");
    try {
      if (mode === "register") await api("auth/register", { method: "POST", json: { name, email, password, ...(agency && !inv ? { agencyName } : {}), ...(inv && invite ? { invite } : {}) } });
      const r = await signIn("credentials", { email, password, redirect: false });
      if (r?.error) throw new Error(tx(locale, "El email o la contraseña no coinciden. Revísalos e inténtalo otra vez.", "That email and password don’t match. Check them and try again."));
      // Existing account opening an invite link from the login screen: join the agency now.
      if (mode === "login" && inv && invite)
        await api(`invitations/${encodeURIComponent(invite)}`, { method: "POST" }).catch((e3: unknown) => {
          const code = e3 instanceof ApiClientError ? e3.code : "";
          throw new Error(
            code === "CONFLICT"
              ? tx(locale, "Ya entraste, pero tu cuenta ya forma parte de una agencia, así que no pudimos aceptar la invitación.", "You’re in, but your account already belongs to an agency, so we couldn’t accept the invitation.")
              : code === "FORBIDDEN"
                ? tx(locale, "Ya entraste, pero esta invitación es para otro email. Entra con ese correo para aceptarla.", "You’re in, but this invitation is for a different email. Sign in with that one to accept it.")
                : (e3 as Error).message,
          );
        });
      const me = await api<{ user: { role: string } }>("me").catch(() => null);
      finish(homeFor(me?.user.role ?? "SEEKER"));
    } catch (e2) {
      // "Ya existe un registro igual" says nothing to someone signing up: name the email and point to sign-in.
      const taken = mode === "register" && e2 instanceof ApiClientError && e2.code === "CONFLICT";
      setErr(taken ? tx(locale, "Ya tienes una cuenta con este email. Entra con tu contraseña.", "You already have an account with this email. Sign in with your password.") : (e2 as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const title =
    reason === "save"
      ? mode === "login"
        ? tx(locale, "Entra para guardar tus casas", "Sign in to keep your homes")
        : tx(locale, "Crea tu cuenta para guardar tus casas", "Create your account to keep your homes")
      : reason === "alert"
        ? mode === "login"
          ? tx(locale, "Entra y te avisamos", "Sign in and we’ll let you know")
          : tx(locale, "Crea tu cuenta para que te avisemos", "Create your account and we’ll let you know")
        : mode === "login"
          ? tx(locale, "Qué bueno verte de nuevo", "Good to see you again")
          : tx(locale, "Crea tu cuenta", "Create your account");
  const lead = reason
    ? mode === "login"
      ? tx(locale, "¿Primera vez aquí? Crea tu cuenta gratis abajo: las casas que guardaste en este dispositivo pasan a tu cuenta.", "First time here? Create a free account below: the homes you saved on this device move into your account.")
      : reason === "save"
        ? tx(locale, "Es gratis. Las casas que guardaste en este dispositivo pasan a tu cuenta y te avisamos si bajan de precio.", "It’s free. The homes you saved on this device move into your account, and we’ll tell you if their price drops.")
        : tx(locale, "Es gratis. Guardamos tu búsqueda y te escribimos en cuanto aparezca una casa que encaje.", "It’s free. We keep your search and write to you as soon as a matching home appears.")
    : mode === "login"
      ? tx(locale, "Retoma tus casas guardadas, compáralas con calma y agenda tus visitas.", "Pick up where you left off: your saved homes, side by side, and your tours.")
      : tx(locale, "Es gratis y no te pedimos tarjeta.", "It’s free, and no card is needed.");
  return (
    // Rendered inside the public layout (PublicPage: header with the logo, tab bar on phones), so no own <main> or logo.
    <div className="grid lg:min-h-[calc(100svh-84px)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div className="flex flex-col px-5 pb-12 pt-6 sm:px-10 lg:px-16">
        <div className="mx-auto my-auto w-full max-w-[440px] pt-4 lg:pt-10">
          <div className={k.eyebrow}>{mode === "login" ? tx(locale, "Entrar", "Sign in") : tx(locale, "Te damos la bienvenida", "Welcome to New Place")}</div>
          <h1 className="mt-2 font-serif text-[44px] font-medium leading-[1.02] text-navy md:text-[52px]">{title}</h1>
          {inv && (
            <div className="mt-5 rounded-[18px] bg-rosa/60 p-4 text-sm text-navy" role="status">
              {tx(locale, `${inv.agencyName} te invita a su equipo como ${ROLE_LABEL[inv.role]?.[0] ?? inv.role}.`, `${inv.agencyName} invited you to their team as ${ROLE_LABEL[inv.role]?.[1] ?? inv.role}.`)}{" "}
              {mode === "register" ? (
                <Link className={k.link} href={`/${locale}/login${carry}`}>{tx(locale, "¿Ya tienes cuenta? Entra", "Already have an account? Sign in")}</Link>
              ) : null}
            </div>
          )}
          <p className={cn("mt-3 text-[16px]", k.muted)}>{lead}</p>
          {mode === "login" && sp.get("reset") === "1" && (
            <div className={cn(k.okBox, "mt-5")} role="status">{tx(locale, "Listo, tu contraseña cambió. Entra con la nueva.", "Done, your password changed. Sign in with the new one.")}</div>
          )}
          {/* Google sign-in only when it is configured: no disabled button with a developer tooltip for visitors. */}
          {GOOGLE ? (
            <>
              <button
                type="button"
                onClick={() => signIn("google", { callbackUrl: next ?? `/${locale}/app` })}
                className="mt-8 flex h-12 w-full items-center justify-center gap-3 rounded-full bg-white font-display font-medium text-navy shadow-[inset_0_0_0_1px_#D8CBB7] transition-shadow hover:shadow-[inset_0_0_0_1px_#1E1A18]"
              >
                <GoogleG /> {tx(locale, "Continuar con Google", "Continue with Google")}
              </button>
              <div className={cn("my-6 flex items-center gap-3 text-[12px] uppercase tracking-[.14em]", k.muted)}><span className="h-px flex-1 bg-[#D8CBB7]" />{tx(locale, "o con tu correo", "or with your email")}<span className="h-px flex-1 bg-[#D8CBB7]" /></div>
            </>
          ) : (
            <div className="mt-8" />
          )}
          <form className="space-y-4" onSubmit={handleSubmit(submit)} noValidate>
            {mode === "register" && (
              <Field label={tx(locale, "Nombre completo", "Full name")} error={fieldError(errs.name, locale, "name")}><input className={inputCls} {...register("name")} aria-invalid={!!errs.name} autoComplete="name" /></Field>
            )}
            <Field label="Email" error={fieldError(errs.email, locale, "email")}><input className={inputCls} type="email" readOnly={!!inv} {...register("email")} aria-invalid={!!errs.email} autoComplete="email" placeholder={tx(locale, "tu@correo.com", "you@example.com")} /></Field>
            <Field label={tx(locale, "Contraseña", "Password")} error={fieldError(errs.password, locale, "password")} hint={(mode === "register" ? tx(locale, "Usa al menos 8 caracteres.", "Use at least 8 characters.") : undefined)}>
              <div className="relative">
                <input className={inputCls} type={show ? "text" : "password"} {...register("password")} aria-invalid={!!errs.password} autoComplete={mode === "login" ? "current-password" : "new-password"} />
                <button type="button" onClick={() => setShow(!show)} className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center text-muted" aria-label={tx(locale, "Mostrar contraseña", "Show password")}>{show ? <EyeOff size={18} /> : <Eye size={18} />}</button>
              </div>
            </Field>
            {mode === "login" && (
              <div className="-mt-1 text-right">
                <Link className={cn(k.link, "text-[14px]")} href={forgotHref} onClick={rememberForgotEmail}>{tx(locale, "¿Olvidaste tu contraseña?", "Forgot your password?")}</Link>
              </div>
            )}
            {mode === "register" && !inv && (
              <label className={cn("flex cursor-pointer items-start gap-3 rounded-[18px] p-4", agency ? "bg-[#E6DDD2] shadow-[inset_0_0_0_2px_#1E1A18]" : "bg-white shadow-[inset_0_0_0_1px_#D8CBB7]")}>
                <input type="checkbox" checked={agency} onChange={(e) => setAgency(e.target.checked)} className="mt-1 h-4 w-4 accent-navy" />
                <span>
                  <span className="flex items-center gap-1.5 font-display font-semibold"><Building2 size={16} strokeWidth={1.7} /> {tx(locale, "¿Eres agencia?", "Are you an agency?")}</span>
                  <span className="text-sm text-muted">{tx(locale, "Crea el espacio de tu inmobiliaria y empieza con el plan Free.", "Set up your agency and start on the Free plan.")}</span>
                </span>
              </label>
            )}
            {agency && !inv && <Field label={tx(locale, "Nombre de la agencia", "Agency name")} error={fieldError(errs.agencyName, locale, "agencyName")}><input className={inputCls} {...register("agencyName")} placeholder="Andes Prime" /></Field>}
            {err && <div className={k.err} role="alert">{err}</div>}
            <Button className="w-full rounded-full" size="lg" disabled={!!busy}>
              {busy === "form" && <Loader2 size={16} className="animate-spin" />}
              {mode === "login" ? tx(locale, "Entrar", "Sign in") : tx(locale, "Crear cuenta", "Create account")}
            </Button>
          </form>
          <p className={cn("mt-6 text-center text-[15px]", k.muted)}>
            {mode === "login" ? (
              <>{tx(locale, "¿Aún no tienes cuenta?", "New here?")} <Link className={k.link} href={`/${locale}/register${carry}`}>{tx(locale, "Regístrate", "Create an account")}</Link></>
            ) : (
              <>{tx(locale, "¿Ya tienes cuenta?", "Already have an account?")} <Link className={k.link} href={`/${locale}/login${carry}`}>{tx(locale, "Entra", "Sign in")}</Link></>
            )}
          </p>
          {mode === "login" && DEMO_ENABLED && (
            <div className="mt-10 rounded-[18px] border border-dashed border-[#D8CBB7] bg-white/60 p-4">
              <div className={cn("flex items-center gap-2", k.label)}><FlaskConical size={14} /> DEMO_AUTH · {tx(locale, "Entrar como…", "Sign in as…")}</div>
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
                    className="flex items-center gap-2 rounded-xl bg-white p-2 text-left text-sm shadow-[inset_0_0_0_1px_#E4DCCD] transition-shadow hover:shadow-[inset_0_0_0_1px_#1E1A18]"
                  >
                    {busy === d.email ? <Loader2 size={18} className="animate-spin" /> : <Avatar initials={d.initials} hue={d.hue} size={26} />}
                    <span className="font-semibold leading-tight">{tx(locale, d.label.es, d.label.en)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <aside className="relative m-4 hidden overflow-hidden rounded-[32px] bg-arena/60 lg:block" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_0%,#F2DDD3_0%,transparent_60%)]" />
        <div className="relative flex h-full flex-col items-center justify-center px-12 py-16">
          <Logo size="lg" className="mb-10" />
          {/* Arch-framed brand photo (the arch is the signature of the brand imagery). */}
          <div className="relative aspect-[3/4] w-full max-w-[400px] overflow-hidden rounded-t-full shadow-[0_30px_60px_-20px_rgba(30,26,24,.35)] ring-[10px] ring-ivory">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/arco.jpg" alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-navy/80 to-transparent" />
            <div className="absolute inset-x-0 bottom-8 px-8 text-center text-ivory">
              <div className="text-[11px] font-semibold uppercase tracking-[.22em] text-[#EBD5C8]">{tx(locale, "El Caribe, con alma mediterránea", "The Caribbean, with a Mediterranean soul")}</div>
              <div className="mt-2 font-serif text-[34px] leading-[1.05]">{tx(locale, "Tu próximo hogar", "Your next home")}<br /><em>{tx(locale, "ya te está esperando.", "is already waiting.")}</em></div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

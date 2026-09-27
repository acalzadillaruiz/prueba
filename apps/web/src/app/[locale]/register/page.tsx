import type { Locale } from "@/types/domain";
import { Suspense } from "react";
import { AuthForm } from "@/components/seeker/AuthForm";
import { pageMeta } from "@/lib/seo";
import { tx } from "@/lib/i18n";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  return pageMeta(locale, tx(locale, "Crear cuenta", "Create account"), "/register", { index: false });
}

export default async function Register({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  return <Suspense><AuthForm locale={locale} mode="register" /></Suspense>;
}

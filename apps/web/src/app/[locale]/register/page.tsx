import type { Locale } from "@/types/domain";
import { Suspense } from "react";
import { AuthForm } from "@/components/seeker/AuthForm";

export default async function Register({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  return <Suspense><AuthForm locale={locale} mode="register" /></Suspense>;
}

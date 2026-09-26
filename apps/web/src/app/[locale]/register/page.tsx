import type { Locale } from "@/types/domain";
import { AuthForm } from "@/components/seeker/AuthForm";

export default async function Register({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  return <AuthForm locale={locale} mode="register" />;
}

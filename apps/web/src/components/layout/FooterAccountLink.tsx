"use client";

import Link from "next/link";
import type { Locale } from "@/types/domain";
import { useApp } from "@/lib/store";
import { roleHome } from "@/components/brand/PublicChrome";
import { tx } from "@/lib/i18n";

/** Footer link that says "Entrar" to visitors and "Tu espacio" (the role's own area) once the (client-loaded) session is known. */
export function FooterAccountLink({ locale, signIn, className }: { locale: Locale; signIn: string; className: string }) {
  const { user, ready } = useApp();
  if (ready && user) return <Link href={`/${locale}${roleHome(user.role)}`} className={className}>{tx(locale, "Ir a tu espacio", "Go to your space")}</Link>;
  return <Link href={`/${locale}/login`} className={className}>{signIn}</Link>;
}

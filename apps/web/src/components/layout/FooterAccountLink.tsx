"use client";

import Link from "next/link";
import type { Locale } from "@/types/domain";
import { useApp } from "@/lib/store";
import { tx } from "@/lib/i18n";

/** Footer link that says "Entrar" to visitors and "Mi cuenta" once the (client-loaded) session is known. */
export function FooterAccountLink({ locale, signIn, className }: { locale: Locale; signIn: string; className: string }) {
  const { user, ready } = useApp();
  if (ready && user) return <Link href={`/${locale}/account`} className={className}>{tx(locale, "Mi cuenta", "My account")}</Link>;
  return <Link href={`/${locale}/login`} className={className}>{signIn}</Link>;
}

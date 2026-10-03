"use client";

import type { Locale } from "@/types/domain";
import { AdminShell } from "@/components/layout/AdminShell";
import { Button } from "@/components/ui";
import { Empty, k } from "./kit";
import { tx } from "@/lib/i18n";

/** Superadmin (or a user without agency) landing on /agency. */
export function NoAgency({ locale }: { locale: Locale }) {
  return (
    <AdminShell locale={locale} area="agency" title={tx(locale, "Agencia", "Agency")}>
      <Empty
        className={k.card}
        title={tx(locale, "Sin agencia seleccionada", "No agency selected")}
        body={tx(locale, "Como superadmin, impersona una agencia desde Platform → Agencias para ver su panel.", "As superadmin, impersonate an agency from Platform → Agencies to see its dashboard.")}
        cta={<Button className={k.primary} href={`/${locale}/platform/agencies`}>{tx(locale, "Ir a Agencias", "Go to Agencies")}</Button>}
      />
    </AdminShell>
  );
}

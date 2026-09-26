"use client";

import { Building2 } from "lucide-react";
import type { Locale } from "@/types/domain";
import { AdminShell } from "@/components/layout/AdminShell";
import { Button, EmptyState } from "@/components/ui";
import { tx } from "@/lib/i18n";

/** Superadmin (or a user without agency) landing on /agency. */
export function NoAgency({ locale }: { locale: Locale }) {
  return (
    <AdminShell locale={locale} area="agency" title={tx(locale, "Agencia", "Agency")}>
      <EmptyState
        dark
        icon={<Building2 size={20} />}
        title={tx(locale, "Sin agencia seleccionada", "No agency selected")}
        body={tx(locale, "Como superadmin, impersona una agencia desde Platform → Agencias para ver su panel.", "As superadmin, impersonate an agency from Platform → Agencies to see its dashboard.")}
        cta={<Button href={`/${locale}/platform/agencies`}>{tx(locale, "Ir a Agencias", "Go to Agencies")}</Button>}
      />
    </AdminShell>
  );
}

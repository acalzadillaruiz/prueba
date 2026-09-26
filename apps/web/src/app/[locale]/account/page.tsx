import { BadgeCheck, Bell, Globe, Lock, Smartphone, Trash2 } from "lucide-react";
import type { Locale } from "@/types/domain";
import { PublicPage } from "@/components/layout/PublicPage";
import { Avatar, Badge, Button, Card, Field, inputCls } from "@/components/ui";
import { tx } from "@/lib/i18n";

export default async function Account({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const Toggle = ({ on }: { on?: boolean }) => (
    <span className={`relative inline-block h-6 w-11 rounded-full ${on ? "bg-coral" : "bg-black/15"}`}><span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`} /></span>
  );
  return (
    <PublicPage locale={locale}>
      <div className="mx-auto max-w-3xl px-4 py-10 md:px-6">
        <h1 className="font-display text-3xl font-semibold">{tx(locale, "Mi cuenta", "My account")}</h1>
        <Card className="mt-6 p-6">
          <div className="flex items-center gap-4">
            <Avatar initials="DO" hue={200} size={64} />
            <div>
              <div className="font-display text-xl font-semibold">Daniel Ortega</div>
              <div className="flex items-center gap-2 text-sm text-ink/60">seeker@gmail.com <Badge tone="ok"><BadgeCheck size={12} /> {tx(locale, "Email verificado", "Email verified")}</Badge></div>
            </div>
            <Button variant="outline" size="sm" className="ml-auto">{tx(locale, "Cambiar foto", "Change photo")}</Button>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Field label={tx(locale, "Nombre", "Name")}><input className={inputCls} defaultValue="Daniel Ortega" /></Field>
            <Field label={tx(locale, "Teléfono", "Phone")}><input className={inputCls} defaultValue="+58 424 555 0166" /></Field>
            <Field label={tx(locale, "Presupuesto", "Budget")}><input className={inputCls} defaultValue="USD 250.000" /></Field>
            <Field label={tx(locale, "Zonas de interés", "Areas of interest")}><input className={inputCls} defaultValue="Chacao, Altamira, Los Palos Grandes" /></Field>
          </div>
        </Card>
        <Card className="mt-6 divide-y divide-line">
          {[
            [Globe, tx(locale, "Idioma y moneda", "Language & currency"), tx(locale, "Español · USD (mostrar VES referencial)", "English · USD (show VES reference)"), null],
            [Bell, tx(locale, "Alertas por email", "Email alerts"), tx(locale, "Nuevos y bajadas de precio", "New listings & price cuts"), true],
            [Smartphone, tx(locale, "Notificaciones push", "Push notifications"), tx(locale, "Disponible al instalar la app", "Available once the app is installed"), false],
            [Lock, tx(locale, "Inicio de sesión", "Sign-in"), tx(locale, "Google conectado · contraseña configurada", "Google linked · password set"), null],
          ].map(([Icon, t, d, on], i) => {
            const I = Icon as React.ElementType;
            return (
              <div key={i} className="flex items-center gap-4 p-5">
                <I size={20} className="text-coral" />
                <div className="flex-1">
                  <div className="font-semibold">{t as string}</div>
                  <div className="text-sm text-ink/55">{d as string}</div>
                </div>
                {on === null ? <Button variant="outline" size="sm">{tx(locale, "Editar", "Edit")}</Button> : <Toggle on={on as boolean} />}
              </div>
            );
          })}
        </Card>
        <div className="mt-6 flex justify-between">
          <Button variant="ghost" className="text-danger"><Trash2 size={16} /> {tx(locale, "Eliminar cuenta", "Delete account")}</Button>
          <Button>{tx(locale, "Guardar cambios", "Save changes")}</Button>
        </div>
      </div>
    </PublicPage>
  );
}

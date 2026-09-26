import { WifiOff } from "lucide-react";
import type { Locale } from "@/types/domain";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui";
import { tx } from "@/lib/i18n";

export default async function Offline({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-navy px-6 text-center text-ivory">
      <Logo tone="ivory" size="lg" />
      <WifiOff className="text-coral" size={36} />
      <h1 className="font-display text-2xl font-semibold">{tx(locale, "Estás sin conexión", "You’re offline")}</h1>
      <p className="max-w-sm text-mist">{tx(locale, "Tus guardados y la portada siguen disponibles. Reintentaremos en cuanto vuelva la señal.", "Your saved homes and the home page are still available. We’ll retry as soon as you’re back online.")}</p>
      <div className="flex gap-3">
        <Button href={`/${locale}/saved`}>{tx(locale, "Ver guardados", "Saved homes")}</Button>
        <Button href={`/${locale}`} variant="dark-outline">{tx(locale, "Inicio", "Home")}</Button>
      </div>
    </div>
  );
}

import { notFound } from "next/navigation";
import { DemoStoreProvider } from "@/lib/store";
import { isLocale } from "@/lib/i18n";
import { LISTINGS } from "@/mock/listings";
import { DemoBar } from "@/components/layout/DemoBar";

export function generateStaticParams() {
  return [{ locale: "es" }, { locale: "en" }];
}

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const initialSaved = [LISTINGS[0].id, LISTINGS[1].id, LISTINGS[6].id, LISTINGS[41].id, LISTINGS[17].id];
  return (
    <DemoStoreProvider initialSaved={initialSaved}>
      {children}
      <DemoBar locale={locale} />
    </DemoStoreProvider>
  );
}

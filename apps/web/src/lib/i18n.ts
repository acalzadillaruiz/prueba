import type { Amenity, Listing, ListingStatus, ListingType, Locale } from "@/types/domain";
import { NOW } from "@/mock/people";

export const LOCALES: Locale[] = ["es", "en"];
export const isLocale = (s: string): s is Locale => s === "es" || s === "en";

/** Inline bilingual helper for the prototype. The production build uses next-intl message catalogs. */
export const tx = (l: Locale, es: string, en: string) => (l === "es" ? es : en);

const clean = (s: string) => s.replace(/[\u202f\u00a0]/g, " ");

export function money(amount: number, l: Locale, currency = "USD") {
  return clean(new Intl.NumberFormat(l === "es" ? "es-VE" : "en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount));
}
export function compactMoney(amount: number, l: Locale) {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(amount >= 10_000_000 ? 0 : 2).replace(/\.?0+$/, "")}M`;
  if (amount >= 1000) return `$${Math.round(amount / 1000)}k`;
  return `$${amount}`;
}
export function num(n: number, l: Locale) {
  return clean(new Intl.NumberFormat(l === "es" ? "es-VE" : "en-US").format(n));
}

export function ago(iso: string, l: Locale) {
  const m = Math.round((NOW.getTime() - new Date(iso).getTime()) / 60000);
  const future = m < 0;
  const a = Math.abs(m);
  let v: string;
  if (a < 1) return tx(l, "ahora mismo", "just now");
  if (a < 60) v = tx(l, `${a} min`, `${a} min`);
  else if (a < 1440) v = tx(l, `${Math.round(a / 60)} h`, `${Math.round(a / 60)} h`);
  else v = tx(l, `${Math.round(a / 1440)} d`, `${Math.round(a / 1440)} d`);
  return future ? tx(l, `en ${v}`, `in ${v}`) : tx(l, `hace ${v}`, `${v} ago`);
}

export function dateTime(iso: string, l: Locale, opts: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) {
  return clean(new Intl.DateTimeFormat(l === "es" ? "es-VE" : "en-US", { hourCycle: l === "es" ? "h23" : "h12", ...opts, timeZone: "America/Caracas" }).format(new Date(iso)));
}

export const TYPE_LABEL: Record<ListingType, [string, string]> = {
  SALE: ["Venta", "For sale"],
  LONG_RENT: ["Alquiler", "For rent"],
  SHORT_RENT: ["Vacacional", "Vacation"],
  COMMERCIAL_SALE: ["Comercial · venta", "Commercial · sale"],
  COMMERCIAL_RENT: ["Comercial · alquiler", "Commercial · rent"],
};

export const STATUS_LABEL: Record<ListingStatus, [string, string]> = {
  DRAFT: ["Borrador", "Draft"],
  COMING_SOON: ["Próximamente", "Coming soon"],
  ACTIVE: ["Activo", "Active"],
  UNDER_OFFER: ["En oferta", "Under offer"],
  SOLD: ["Vendido", "Sold"],
  RENTED: ["Alquilado", "Rented"],
  WITHDRAWN: ["Retirado", "Withdrawn"],
  EXPIRED: ["Vencido", "Expired"],
};

export const AMENITY_LABEL: Record<Amenity, [string, string]> = {
  pool: ["Piscina", "Pool"],
  gym: ["Gimnasio", "Gym"],
  security: ["Vigilancia 24 h", "24/7 security"],
  generator: ["Planta eléctrica", "Backup generator"],
  waterTank: ["Tanque de agua", "Water tank"],
  view: ["Vista", "View"],
  terrace: ["Terraza", "Terrace"],
  elevator: ["Ascensor", "Elevator"],
  garden: ["Jardín", "Garden"],
  bbq: ["Parrillera", "BBQ"],
  furnished: ["Amoblado", "Furnished"],
  pets: ["Mascotas", "Pets OK"],
  ac: ["Aire acondicionado", "A/C"],
  wifi: ["Wi-Fi", "Wi-Fi"],
  loadingDock: ["Andén de carga", "Loading dock"],
};

export const lbl = (pair: [string, string], l: Locale) => (l === "es" ? pair[0] : pair[1]);

export function priceSuffix(l: Pick<Listing, "pricePeriod">, locale: Locale) {
  return l.pricePeriod === "night" ? tx(locale, " / noche", " / night") : l.pricePeriod === "month" ? tx(locale, " / mes", " / mo") : "";
}

import esMessages from "../../../../packages/config/messages/es.json";
import enMessages from "../../../../packages/config/messages/en.json";
import type { Amenity, EmailOutbox, Listing, ListingStatus, ListingType, Locale } from "@/types/domain";

export const LOCALES: Locale[] = ["es", "en"];
export const isLocale = (s: string): s is Locale => s === "es" || s === "en";

/**
 * Plain (no ICU placeholders) catalog strings for public client components, read straight from the next-intl
 * catalogs: the public pages then don't ship next-intl's client formatter (intl-messageformat, ~12 KB gzip).
 */
type Catalog = typeof esMessages;
const CATALOGS: Record<Locale, Catalog> = { es: esMessages, en: enMessages as Catalog };
export const msg = <N extends keyof Catalog>(l: Locale, ns: N) => (key: keyof Catalog[N]) => String((CATALOGS[l] ?? CATALOGS.es)[ns][key]);

/** Inline bilingual helper for the prototype. The production build uses next-intl message catalogs. */
export const tx = (l: Locale, es: string, en: string) => (l === "es" ? es : en);

const clean = (s: string) => s.replace(/[\u202f\u00a0]/g, " ");

export function money(amount: number, l: Locale, currency = "USD") {
  return clean(new Intl.NumberFormat(l === "es" ? "es-VE" : "en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount));
}
/**
 * Short price in the same style as money() for that locale — the one short format everywhere (map pins, chips, compare
 * pinned row, comparables table, sticky contact bar, alert names and email subjects):
 * "USD 150k" / "USD 1,2M" (es, like "USD 150.000"), "$150k" / "$1.2M" (en, like "$150,000"). Millions keep one decimal
 * (none from 10M), never a space before the M. Under 10 000 the exact amount ("USD 1.800", "$1,800").
 */
export function shortMoney(amount: number, l: Locale) {
  if (amount < 10_000) return money(amount, l); // rents: "USD 1.800", not a rounded "USD 2k"
  const es = l === "es";
  const pre = es ? "USD " : "$";
  const k = Math.round(amount / 1000);
  if (k < 1000) return `${pre}${k}k`;
  const m = new Intl.NumberFormat(es ? "es-VE" : "en-US", { maximumFractionDigits: amount >= 10_000_000 ? 0 : 1 }).format(amount / 1_000_000);
  return `${pre}${m}M`;
}
export function num(n: number, l: Locale) {
  return clean(new Intl.NumberFormat(l === "es" ? "es-VE" : "en-US").format(n));
}

export function ago(iso: string, l: Locale) {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
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

/** "1 baño" / "2 baños", "1 day" / "2 days". */
export function plural(n: number, locale: Locale, es: [string, string], en: [string, string]) {
  const [one, many] = locale === "es" ? es : en;
  return `${n} ${n === 1 ? one : many}`;
}

/** Average dwell time as m:ss, or "—" when no visit has been measured yet. */
export function dwell(sec: number | null | undefined): string {
  if (sec == null) return "—";
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}

/** Outbox delivery states. SIMULATED = no email provider configured: recorded here, never actually sent. */
export const EMAIL_STATUS_LABEL: Record<EmailOutbox["status"], [string, string]> = {
  QUEUED: ["En cola", "Queued"],
  SENT: ["Enviado", "Sent"],
  SIMULATED: ["Registrado", "Recorded"],
  FAILED: ["Fallido", "Failed"],
};

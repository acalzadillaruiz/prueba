import type { Locale } from "@/types/domain";
import { compactMoney } from "@/lib/i18n";

const t = (l: Locale, es: string, en: string) => (l === "es" ? es : en);

/** [es, en] with no property kind (furnished reads "Alquiler amoblado" / "Furnished rental"). */
const TYPE: Record<string, [string, string]> = {
  SALE: ["Compra", "Homes for sale"],
  LONG_RENT: ["Alquiler", "Rental"],
  SHORT_RENT: ["Alquiler vacacional", "Holiday rental"],
};
/** With a kind: "Áticos en venta", "Houses for rent". */
const KIND: Record<string, [string, string]> = {
  penthouse: ["Áticos", "Penthouses"],
  house: ["Casas", "Houses"],
  apartment: ["Apartamentos", "Apartments"],
  land: ["Terrenos", "Plots"],
};
const KIND_TYPE: Record<string, [string, string]> = {
  SALE: ["en venta", "for sale"],
  LONG_RENT: ["en alquiler", "for rent"],
  SHORT_RENT: ["vacacionales", "for holidays"],
};

/**
 * A saved search's filters (its URL query) as a sentence a person would say: "Alquiler amoblado en Altamira · 2+ hab ·
 * hasta $250k · últimos 7 días". The stored name is a machine join of chip labels; this is what the alerts list shows.
 */
export function alertTitle(query: string, hasPolygon: boolean, locale: Locale): string {
  const p = new URLSearchParams(query);
  const kind = p.get("kind");
  const tk = TYPE[p.get("type") ?? ""] ? (p.get("type") as string) : "SALE";
  const furnished = !!p.get("furnished");
  let head: string;
  const extra: string[] = [];
  if (kind && KIND[kind]) {
    head = `${t(locale, ...KIND[kind])} ${t(locale, ...KIND_TYPE[tk])}`;
    if (furnished) extra.push(t(locale, "amoblado", "furnished"));
  } else if (furnished) {
    head = tk === "SALE" ? t(locale, "Compra amoblada", "Furnished homes for sale") : t(locale, `${TYPE[tk][0]} amoblado`, `Furnished ${TYPE[tk][1].toLowerCase()}`);
  } else head = t(locale, ...TYPE[tk]);
  const zone = p.get("zone") ?? p.get("city");
  if (zone) head += t(locale, ` en ${zone}`, ` in ${zone}`);
  else if (p.get("radius")) head += t(locale, " cerca de ti", " near you");
  else if (hasPolygon || p.get("poly")) head += t(locale, " en tu zona dibujada", " in your drawn area");
  else if (p.get("bbox")) head += t(locale, " en la zona del mapa", " in the map area");

  if (p.get("lux")) extra.unshift(t(locale, "Colección Privada", "Private Collection"));
  const beds = p.get("beds");
  if (beds) extra.push(t(locale, `${beds}+ hab`, `${beds}+ bd`));
  const min = Number(p.get("min"));
  const max = Number(p.get("max"));
  if (min && max) extra.push(`${compactMoney(min)}–${compactMoney(max)}`);
  else if (max) extra.push(t(locale, `hasta ${compactMoney(max)}`, `up to ${compactMoney(max)}`));
  else if (min) extra.push(t(locale, `desde ${compactMoney(min)}`, `from ${compactMoney(min)}`));
  if (p.get("pets")) extra.push(t(locale, "con mascotas", "pets OK"));
  if (p.get("sea")) extra.push(t(locale, "frente al mar", "by the sea"));
  const pub = p.get("pub");
  if (pub) extra.push(pub === "24h" ? t(locale, "últimas 24 h", "last 24 h") : t(locale, "últimos 7 días", "last 7 days"));
  return [head, ...extra].join(" · ");
}

/** Names saved by the search page are " · "-joined chip labels; a name the person typed themselves is shown as is. */
export function isMachineName(name: string) {
  return name.includes(" · ") || /^(Polígono|Polygon)\b/.test(name);
}

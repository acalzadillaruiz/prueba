import type { Locale } from "@/types/domain";
import { alertTitle, isMachineName } from "@/components/seeker/alertTitle";
import { shortMoney } from "@/lib/i18n";

const t = (l: Locale, es: string, en: string) => (l === "en" ? en : es);
const loc = (v: string | null | undefined): Locale => (v === "en" ? "en" : "es");

/** A saved search as it reads in an email subject: its filters as a sentence in the recipient's language, or the name the person typed. */
export function alertSubjectName(s: { name: string; query: string; polygon?: unknown }, locale: string | null | undefined) {
  return isMachineName(s.name) ? alertTitle(s.query, Array.isArray(s.polygon) && s.polygon.length >= 3, loc(locale)) : s.name;
}

/** Saved-search alert subjects, in the recipient's language (User.locale). */
export const alertSubject = {
  /** INSTANT alert, a new home matched. */
  fresh: (search: string, title: string, locale: string | null | undefined) => t(loc(locale), `Algo nuevo en «${search}»: ${title}`, `Something new in “${search}”: ${title}`),
  /** INSTANT alert, a matching home dropped its price. */
  price: (title: string, locale: string | null | undefined) => t(loc(locale), `Ahora a mejor precio: ${title}`, `Now at a better price: ${title}`),
  /** DAILY / WEEKLY digest. */
  digest: (count: number, search: string, locale: string | null | undefined) =>
    loc(locale) === "en" ? `${count === 1 ? "1 new home" : `${count} new homes`} in “${search}”` : `${count === 1 ? "1 novedad" : `${count} novedades`} en «${search}»`,
};

/** Older subjects carried a raw "< 250.000 USD": today's short style ("hasta USD 250k" / "up to $250k"). */
const shortAmounts = (s: string) => s.replace(/<\s*([\d.]+)\s*USD/g, (_, n: string) => `hasta ${shortMoney(Number(n.replace(/\./g, "")), "es")}`);

/** Spanish chip words in a machine-made filter list ("Chacao · 2+ hab · hasta USD 250k"); never applied to listing titles. */
const EN_WORDS: [RegExp, string][] = [
  [/\bhab\b/g, "bd"],
  [/\balquiler\b/g, "rental"],
  [/\bhasta USD ([\d,]+)(k|M)/g, "up to $$$1$2"],
];
/** A machine-made search name (alertTitle's Spanish) in English; a name the person typed only gets its chip words swapped. */
const HEADS: [RegExp, string][] = [
  [/^Alquiler vacacional\b/, "Holiday rental"],
  [/^Compra\b/, "Homes for sale"],
  [/^Alquiler\b/, "Rental"],
];
const searchName = (a: string) => chips(HEADS.reduce((out, [w, en]) => out.replace(w, en), a).replace(/^(Holiday rental|Homes for sale|Rental) en /, "$1 in "));
const chips = (a: string) => EN_WORDS.reduce((out, [w, en]) => out.replace(w, en), a).replace(/\$(\d+),(\d)M/g, "$$$1.$2M");

/** Spanish phrases of stored subjects → English, for showing a past email on /en (the stored text itself is left as sent). */
const EN: [RegExp, (...m: string[]) => string][] = [
  [/^Algo nuevo en «(.+)»: (.+)$/, (_, a, b) => `Something new in “${searchName(a)}”: ${b}`],
  [/^Ahora a mejor precio: (.+)$/, (_, a) => `Now at a better price: ${a}`],
  [/^1 novedad en «(.+)»$/, (_, a) => `1 new home in “${searchName(a)}”`],
  [/^(\d+) novedades en «(.+)»$/, (_, n, a) => `${n} new homes in “${searchName(a)}”`],
  [/^(\d+) nuevos en (.+)$/, (_, n, a) => `${n} new in ${chips(a)}`],
  [/^Nuevos hoy en (.+)$/, (_, a) => `New today in ${chips(a)}`],
  [/^Bajó de precio: (.+)$/, (_, a) => `Price drop: ${a}`],
  [/^Visita confirmada: (.+)$/, (_, a) => `Viewing confirmed: ${a.replace(/, hoy (\d)/, ", today $1")}`],
  [/^Tu visita está confirmada · (.+)$/, (_, a) => `Your visit is confirmed · ${a}`],
  [/^Verifica tu correo en New Place$/, () => "Verify your email on New Place"],
  [/^Confirma tu correo para empezar$/, () => "Confirm your email to get started"],
];
/**
 * A stored email subject as shown in the app: on /en, the known Spanish phrasings of our own subjects read in English;
 * old raw amounts ("< 250.000 USD") read in the short style. Anything not recognised is shown as stored.
 */
export function localizeEmailSubject(subject: string, locale: Locale) {
  const s = shortAmounts(subject);
  if (locale !== "en") return s;
  for (const [re, fn] of EN) {
    const m = s.match(re);
    if (m) return fn(...m).replace(/\(-(\d+) %\)$/, "(-$1%)");
  }
  return s;
}

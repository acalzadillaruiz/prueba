import { notFound } from "next/navigation";
import type { Locale } from "@/types/domain";
import { listingBySlug, servedPublicly } from "@/server/listings";
import { money, priceSuffix, tx } from "@/lib/i18n";
import { alternates, ogBase } from "@/lib/seo";
import { ListingView } from "./ListingView";

// Public listing pages are rendered once and cached (ISR); edits show up within a minute, and moderation /
// status changes purge the page immediately (revalidatePath in the listing and moderation APIs).
export const revalidate = 60;
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale; slug: string }> }) {
  const { locale, slug } = await params;
  const l = await listingBySlug(slug);
  // Hidden listings leak nothing (not even title/price in <head>): the page itself 404s too.
  if (!l || !(await servedPublicly(l))) notFound();
  const title = tx(locale, l.title_es, l.title_en);
  const description = `${money(l.priceAmount, locale, l.priceCurrency)}${priceSuffix(l, locale)} · ${l.zone}, ${l.city} · ${tx(locale, l.body_es, l.body_en)}`.slice(0, 180);
  const path = `/listing/${l.slug}`;
  return {
    title,
    description,
    alternates: alternates(locale, path),
    openGraph: { ...ogBase(locale), title, description, url: `/${locale}${path}` },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function ListingPage({ params }: { params: Promise<{ locale: Locale; slug: string }> }) {
  const { locale, slug } = await params;
  const l = await listingBySlug(slug);
  // Hidden listings are never served here (this HTML is cached for everyone): staff use /preview/[slug].
  if (!l || !(await servedPublicly(l))) notFound();
  return <ListingView locale={locale} l={l} />;
}

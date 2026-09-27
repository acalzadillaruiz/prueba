import { notFound } from "next/navigation";
import { prisma } from "@newplace/db";
import type { Locale } from "@/types/domain";
import { listingBySlug } from "@/server/listings";
import { money, priceSuffix, tx } from "@/lib/i18n";
import { alternates, ogBase } from "@/lib/seo";
import { ListingView, isPublicListing } from "./ListingView";

// Public listing pages are rendered once and cached (ISR); edits show up within a minute, and moderation /
// status changes purge the page immediately (revalidatePath in the listing and moderation APIs).
export const revalidate = 60;
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

/** Public = publicly visible status/review, and not owned by a suspended agency (same rule as publicWhere). */
async function servedPublicly(l: NonNullable<Awaited<ReturnType<typeof listingBySlug>>>) {
  if (!isPublicListing(l)) return false;
  if (!l.agencyId) return true;
  const agency = await prisma.agency.findUnique({ where: { id: l.agencyId }, select: { status: true } });
  return agency?.status !== "SUSPENDED";
}

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale; slug: string }> }) {
  const { locale, slug } = await params;
  const l = await listingBySlug(slug);
  if (!l) notFound();
  const title = tx(locale, l.title_es, l.title_en);
  const description = `${money(l.priceAmount, locale, l.priceCurrency)}${priceSuffix(l, locale)} · ${l.zone}, ${l.city} · ${tx(locale, l.body_es, l.body_en)}`.slice(0, 180);
  const path = `/listing/${l.slug}`;
  const hidden = !(await servedPublicly(l));
  return {
    title,
    description,
    alternates: alternates(locale, path),
    openGraph: { ...ogBase(locale), title, description, url: `/${locale}${path}` },
    twitter: { card: "summary_large_image", title, description },
    ...(hidden ? { robots: { index: false, follow: false } } : {}),
  };
}

export default async function ListingPage({ params }: { params: Promise<{ locale: Locale; slug: string }> }) {
  const { locale, slug } = await params;
  const l = await listingBySlug(slug);
  // Hidden listings are never served here (this HTML is cached for everyone): staff use /preview/[slug].
  if (!l || !(await servedPublicly(l))) notFound();
  return <ListingView locale={locale} l={l} />;
}

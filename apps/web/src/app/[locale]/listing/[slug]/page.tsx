import { notFound } from "next/navigation";
import type { Listing, Locale } from "@/types/domain";
import { listingBySlug, servedPublicly } from "@/server/listings";
import { TYPE_LABEL, lbl, money, plural, priceSuffix, tx } from "@/lib/i18n";
import { OG_IMAGE, SITE_URL, alternates, fixCountGrammar, jsonLdHtml, metaDescription, ogBase } from "@/lib/seo";
import { ListingView } from "./ListingView";

// Public listing pages are rendered once and cached (ISR); edits show up within a minute, and moderation /
// status changes purge the page immediately (revalidatePath in the listing and moderation APIs).
export const revalidate = 60;
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

/** "3 hab · 1 baño · 120 m²" with correct singular/plural. Land has no rooms. */
function facts(l: Listing, locale: Locale): string {
  return [
    l.kind !== "land" && l.beds > 0 ? plural(l.beds, locale, ["habitación", "habitaciones"], ["bedroom", "bedrooms"]) : "",
    l.kind !== "land" && l.baths > 0 ? plural(l.baths, locale, ["baño", "baños"], ["bathroom", "bathrooms"]) : "",
    l.areaM2 ? `${l.areaM2} m²` : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

function describe(l: Listing, locale: Locale): string {
  const head = [`${money(l.priceAmount, locale, l.priceCurrency)}${priceSuffix(l, locale)}`, `${l.zone}, ${l.city}`, facts(l, locale)].filter(Boolean).join(" · ");
  return metaDescription(`${head}. ${fixCountGrammar(tx(locale, l.body_es, l.body_en))}`);
}

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale; slug: string }> }) {
  const { locale, slug } = await params;
  const l = await listingBySlug(slug);
  // Hidden listings leak nothing (not even title/price in <head>): the page itself 404s too.
  if (!l || !(await servedPublicly(l))) notFound();
  const title = tx(locale, l.title_es, l.title_en);
  const description = describe(l, locale);
  const path = `/listing/${l.slug}`;
  // og:image comes from the route's opengraph-image.tsx (per-listing card); og:type stays "website" site-wide.
  return {
    title,
    description,
    alternates: alternates(locale, path),
    openGraph: { ...ogBase(locale), title, description, url: `/${locale}${path}` },
    twitter: { card: "summary_large_image", title, description },
    // "Solo con enlace": reachable by its link but never indexed.
    ...(l.privateListing ? { robots: { index: false, follow: false } } : {}),
  };
}

const SEARCH_TYPE: Record<Listing["listingType"], string> = { SALE: "SALE", LONG_RENT: "LONG_RENT", SHORT_RENT: "SHORT_RENT", COMMERCIAL_SALE: "COMMERCIAL", COMMERCIAL_RENT: "COMMERCIAL" };

function listingJsonLd(l: Listing, locale: Locale) {
  const url = `${SITE_URL}/${locale}/listing/${l.slug}`;
  const home = `${SITE_URL}/${locale}`;
  const searchUrl = `${home}/search?type=${SEARCH_TYPE[l.listingType]}`;
  const name = tx(locale, l.title_es, l.title_en);
  const seller = l.agency
    ? { "@type": "RealEstateAgent", name: l.agency.name, ...(l.agency.phone ? { telephone: l.agency.phone } : {}) }
    : l.agent
      ? { "@type": "Person", name: l.agent.name }
      : { "@id": `${SITE_URL}/#organization` };
  const noRooms = l.kind === "land";
  return [
    {
      "@context": "https://schema.org",
      "@type": "RealEstateListing",
      "@id": `${url}#listing`,
      name,
      description: metaDescription(fixCountGrammar(tx(locale, l.body_es, l.body_en)), 500),
      url,
      inLanguage: locale === "es" ? "es-VE" : "en",
      datePosted: l.publishedAt,
      dateModified: l.updatedAt,
      image: l.photos?.length ? l.photos.map((p) => (p.startsWith("http") ? p : `${SITE_URL}${p}`)) : [`${url}/opengraph-image`, `${SITE_URL}${OG_IMAGE.url}`],
      offers: {
        "@type": "Offer",
        price: l.priceAmount,
        priceCurrency: l.priceCurrency,
        businessFunction: l.listingType === "SALE" || l.listingType === "COMMERCIAL_SALE" ? "https://purl.org/goodrelations/v1#Sell" : "https://purl.org/goodrelations/v1#LeaseOut",
        availability: l.status === "SOLD" || l.status === "RENTED" ? "https://schema.org/SoldOut" : "https://schema.org/InStock",
        url,
        seller,
      },
      about: {
        "@type": l.kind === "house" || l.kind === "villa" || l.kind === "townhouse" || l.kind === "chalet" ? "House" : l.kind === "land" ? "Place" : "Apartment",
        name,
        ...(noRooms ? {} : { floorSize: { "@type": "QuantitativeValue", value: l.areaM2, unitCode: "MTK" } }),
        ...(!noRooms && l.beds ? { numberOfRooms: l.beds, numberOfBedrooms: l.beds } : {}),
        ...(!noRooms && l.baths ? { numberOfBathroomsTotal: l.baths } : {}),
        ...(!noRooms && l.yearBuilt ? { yearBuilt: l.yearBuilt } : {}),
        address: {
          "@type": "PostalAddress",
          ...(l.address ? { streetAddress: l.address } : {}),
          addressLocality: l.city || l.zone,
          addressRegion: l.state,
          addressCountry: "VE",
        },
        geo: { "@type": "GeoCoordinates", latitude: l.lat, longitude: l.lng },
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "New Place", item: home },
        { "@type": "ListItem", position: 2, name: lbl(TYPE_LABEL[l.listingType], locale), item: searchUrl },
        { "@type": "ListItem", position: 3, name, item: url },
      ],
    },
  ];
}

export default async function ListingPage({ params }: { params: Promise<{ locale: Locale; slug: string }> }) {
  const { locale, slug } = await params;
  const l = await listingBySlug(slug);
  // Hidden listings are never served here (this HTML is cached for everyone): staff use /preview/[slug].
  if (!l || !(await servedPublicly(l))) notFound();
  return (
    <>
      {/* Private ("solo con enlace") listings are noindex: no rich results for them. */}
      {!l.privateListing && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(listingJsonLd(l, locale)) }} />}
      <ListingView locale={locale} l={l} />
    </>
  );
}

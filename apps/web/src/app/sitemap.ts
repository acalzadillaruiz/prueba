import type { MetadataRoute } from "next";
import { prisma } from "@newplace/db";
import { SITE_URL } from "@/lib/seo";
import { publicWhere } from "@/server/listings";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const both = (path: string, lastModified?: Date, priority = 0.6): MetadataRoute.Sitemap =>
    (["es", "en"] as const).map((l) => ({ url: `${SITE_URL}/${l}${path}`, lastModified, priority, alternates: { languages: { es: `${SITE_URL}/es${path}`, en: `${SITE_URL}/en${path}`, "x-default": `${SITE_URL}/es${path}` } } }));
  const listings = await prisma.listing.findMany({ where: publicWhere(), select: { slug: true, updatedAt: true }, orderBy: { updatedAt: "desc" }, take: 5000 }).catch(() => []);
  return [
    ...both("", undefined, 1),
    ...["SALE", "LONG_RENT", "SHORT_RENT", "COMMERCIAL"].flatMap((t) => both(`/search?type=${t}`, undefined, 0.8)),
    ...both("/luxury", undefined, 0.7),
    ...both("/sell", undefined, 0.6),
    ...listings.flatMap((l) => both(`/listing/${l.slug}`, l.updatedAt)),
  ];
}

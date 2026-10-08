import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/uploads/", "/offline/", "/*/agency", "/*/platform", "/*/owner", "/*/app", "/*/account", "/*/saved", "/*/alerts", "/*/login", "/*/register", "/*/forgot-password", "/*/reset-password", "/*/offline", "/*/preview"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}

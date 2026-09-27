import withSerwistInit from "@serwist/next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const revision = Date.now().toString(36);

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  // No full-page reload when the connection comes back (it would wipe half-filled forms); React Query refetches instead.
  cacheOnNavigation: false,
  reloadOnOnline: false,
  additionalPrecacheEntries: [
    { url: "/offline/es", revision },
    { url: "/offline/en", revision },
  ],
  // Keep the first-visit precache small: no legacy .woff, non-latin font subsets or back-office route chunks.
  exclude: [/\.map$/, /^manifest.*\.js$/, /\.woff$/, /(cyrillic|greek|vietnamese)/, /icon-1024/, /app\/\[locale\]\/(agency|platform)\//, /app\/(api|robots\.txt|sitemap\.xml|uploads)\//, /opengraph-image/],
  disable: process.env.NODE_ENV !== "production",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NEXT_DIST || ".next",
  transpilePackages: ["@newplace/config", "@newplace/ai", "@newplace/db"],
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
  eslint: { ignoreDuringBuilds: true },
  devIndicators: false,
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [{ protocol: "https", hostname: "*.public.blob.vercel-storage.com" }],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self), payment=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self' https://accounts.google.com; object-src 'none'" },
        ],
      },
    ];
  },
};

export default withSerwist(withNextIntl(nextConfig));

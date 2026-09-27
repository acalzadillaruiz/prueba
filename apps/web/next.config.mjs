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
  // The CSS (~12 KB gzip) goes inline in the HTML: no render-blocking stylesheet round trip before first paint.
  experimental: { inlineCss: true },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [{ protocol: "https", hostname: "*.public.blob.vercel-storage.com" }],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  async headers() {
    const dev = process.env.NODE_ENV !== "production";
    // Production over HTTPS only: a local `next start` on http://localhost would have its own assets upgraded.
    const upgrade = !dev && !(process.env.NEXT_PUBLIC_APP_URL ?? "").startsWith("http://");
    // Inline scripts: Next's RSC bootstrap + the pre-paint theme script (no nonce pipeline yet).
    // Dev only: React Refresh needs eval and the HMR websocket.
    const csp = [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""} https://maps.googleapis.com https://maps.gstatic.com`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data: https://fonts.gstatic.com",
      `connect-src 'self' https:${dev ? " ws: wss:" : ""}`,
      "frame-src https://www.google.com",
      "worker-src 'self' blob:",
      "manifest-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self' https://accounts.google.com",
      "frame-ancestors 'none'",
      ...(upgrade ? ["upgrade-insecure-requests"] : []),
    ].join("; ");
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self), payment=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          { key: "Content-Security-Policy", value: csp },
        ],
      },
    ];
  },
};

export default withSerwist(withNextIntl(nextConfig));

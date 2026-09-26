/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NEXT_DIST || ".next",
  transpilePackages: ["@newplace/config", "@newplace/ai"],
  eslint: { ignoreDuringBuilds: true },
  devIndicators: false,
};
export default nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@newplace/config", "@newplace/ai"],
  eslint: { ignoreDuringBuilds: true },
  devIndicators: false,
};
export default nextConfig;

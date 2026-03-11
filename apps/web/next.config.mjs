/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@pulseminer/shared'],
  experimental: {
    typedRoutes: true,
  },
};

export default nextConfig;

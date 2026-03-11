/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  distDir: process.env.VERCEL ? '../../.next' : '.next',
  transpilePackages: ['@pulseminer/shared'],
  experimental: {
    typedRoutes: true,
  },
};

export default nextConfig;

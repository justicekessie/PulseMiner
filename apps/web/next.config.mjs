/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@pulseminer/shared'],
  distDir: process.env.VERCEL ? '../../.next' : '.next',
  experimental: {
    typedRoutes: true,
  },
};

export default nextConfig;

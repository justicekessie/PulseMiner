/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@pulseminer/shared'],
  distDir: process.env.VERCEL ? '../../.next' : '.next',
};

export default nextConfig;

import { fileURLToPath } from 'node:url';

const sharedDistPath = fileURLToPath(new URL('../../packages/shared/dist/index.mjs', import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@pulseminer/shared'],
  experimental: {
    typedRoutes: true,
  },
  webpack: (config) => {
    config.resolve.alias['@pulseminer/shared'] = sharedDistPath;
    return config;
  },
};

export default nextConfig;

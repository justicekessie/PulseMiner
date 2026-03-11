/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@pulseminer/shared'],
  typescript: {
    // Type-checking is handled by turbo run type-check; skip during next build
    // to avoid Next.js auto-injecting .next/types into tsconfig which references
    // unresolvable internal modules (metadata-interface.js)
    ignoreBuildErrors: true,
  },
};

export default nextConfig;

import type { NextConfig } from 'next';

/** Critique and roadmap calls run 30-120 s; Next's rewrite proxy drops them at 30 s by default. */
const API_PROXY_TIMEOUT_MS = 300_000;

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@foyer/ui'],
  experimental: { typedRoutes: false, proxyTimeout: API_PROXY_TIMEOUT_MS },
  // Browser calls and photo URLs go same-origin; the API stays off the public surface.
  async rewrites() {
    return [{ source: '/api/v1/:path*', destination: `${process.env.API_URL ?? 'http://localhost:4000'}/v1/:path*` }];
  },
};

export default config;

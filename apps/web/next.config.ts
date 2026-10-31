import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@foyer/ui'],
  experimental: { typedRoutes: false },
  // Browser calls and photo URLs go same-origin; the API stays off the public surface.
  async rewrites() {
    return [{ source: '/api/v1/:path*', destination: `${process.env.API_URL ?? 'http://localhost:4000'}/v1/:path*` }];
  },
};

export default config;

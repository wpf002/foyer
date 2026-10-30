import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@foyer/ui'],
  experimental: { typedRoutes: false },
};

export default config;

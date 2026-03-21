import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.ibb.co',
      },
      {
        protocol: 'https',
        hostname: 'pub-e9f7db97630d40fe816c341284149436.r2.dev',
      },
      {
        protocol: 'https',
        hostname: 'pub-e15b9a4e15fd45f5924e2cc60a925b1e.r2.dev',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '15mb',
    },
  },
};

export default nextConfig;

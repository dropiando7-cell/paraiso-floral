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
    ],
  },
};

export default nextConfig;

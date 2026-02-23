/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allows this module to be embedded inside a larger Next.js SaaS project
  // If integrating as a sub-path (e.g. /checkin), set basePath here:
  // basePath: '/checkin',

  experimental: {
    // Required for App Router server actions
    serverActions: {
      allowedOrigins: ['localhost:3000'],
    },
  },
}

module.exports = nextConfig

import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@care-connekt/shared', '@care-connekt/db'],
  serverExternalPackages: ['@prisma/client', '@prisma/adapter-pg', 'pg', 'bcryptjs'],
  images: {
    remotePatterns: [],
  },
}

export default nextConfig

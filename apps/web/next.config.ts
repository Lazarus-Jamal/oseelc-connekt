import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@care-connekt/shared'],
  serverExternalPackages: ['@prisma/client', '@prisma/adapter-pg', '@care-connekt/db', 'pg', 'bcryptjs'],
  images: {
    remotePatterns: [],
  },
}

export default nextConfig

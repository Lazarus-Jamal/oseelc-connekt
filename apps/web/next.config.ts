import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@care-connekt/shared'],
  serverExternalPackages: ['@care-connekt/db', '@prisma/client', '@prisma/adapter-pg', 'pg', 'bcryptjs'],
  images: {
    remotePatterns: [],
  },
}

export default nextConfig

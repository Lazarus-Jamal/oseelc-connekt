'use strict'

Object.defineProperty(exports, '__esModule', { value: true })
exports.prisma = void 0

const { PrismaPg } = require('@prisma/adapter-pg')
const { Pool } = require('pg')
const { PrismaClient } = require('../generated/client')

const globalForPrisma = globalThis

function createPrismaClient() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const adapter = new PrismaPg(pool)
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })
}

exports.prisma = globalForPrisma.prisma || createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = exports.prisma
}

const prismaClientExports = require('../generated/client')
for (const key of Object.keys(prismaClientExports)) {
  if (!(key in exports)) {
    Object.defineProperty(exports, key, {
      enumerable: true,
      get: function () { return prismaClientExports[key] },
    })
  }
}

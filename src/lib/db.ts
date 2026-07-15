import { config } from 'dotenv'
config()

import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl || (!databaseUrl.startsWith('postgresql://') && !databaseUrl.startsWith('postgres://'))) {
  console.error('[DB] Invalid DATABASE_URL - must start with postgresql:// or postgres://')
  console.error('[DB] Got:', databaseUrl?.substring(0, 50) + '...')
}

export const db = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
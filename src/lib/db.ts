import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

let prismaClient: PrismaClient | null = null

try {
  prismaClient =
    globalForPrisma.prisma ??
    new PrismaClient({
      log: process.env.NODE_ENV === 'production' ? ['error'] : ['query', 'error', 'warn'],
    })
  if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prismaClient
} catch (err) {
  console.error('[db] Prisma init failed (likely serverless/no SQLite):', err)
  prismaClient = null
}

// Export either prisma or null (callers should check and fall back to memoryDB)
export const db = prismaClient
export const isPrismaAvailable = !!prismaClient

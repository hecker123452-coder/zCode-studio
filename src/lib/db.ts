import { PrismaClient, type DeployedProject } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Singleton Prisma client with safe initialization.
 *
 * If the database file is missing or unreachable, queries will throw — callers
 * should wrap their DB queries in try/catch and return a friendly error message
 * to the user. The AI/Deploy route handlers all do this.
 *
 * Database is used for:
 *   - DeployedProject persistence (replaces the old in-memory Map store)
 *   - Future: AI rate-limit + session-memory persistence (planned)
 */
let prismaClient: PrismaClient
try {
  prismaClient =
    globalForPrisma.prisma ??
    new PrismaClient({
      log: process.env.NODE_ENV === 'production' ? ['error'] : ['query', 'error', 'warn'],
    })
  if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prismaClient
} catch (err) {
  console.error('[db] Gagal menginisialisasi PrismaClient:', err)
  // Re-throw so callers can detect initialization failure
  throw err
}

export const db = prismaClient
export type { DeployedProject }

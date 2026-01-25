import { PrismaClient } from "@/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  pool: Pool | undefined
}

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set")
  }

  // Use standard pg driver with connection pool
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }, // Required for Neon
    max: 10,
  })

  globalForPrisma.pool = pool
  const adapter = new PrismaPg(pool)

  return new PrismaClient({ adapter })
}

// Get or create the Prisma client
export function getPrisma(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient()
  }
  return globalForPrisma.prisma
}

// Make all PrismaClient methods available via proxy
const handler: ProxyHandler<object> = {
  get(_, prop) {
    return getPrisma()[prop as keyof PrismaClient]
  }
}

// Named export for compatibility - uses proxy for lazy initialization
export const prisma = new Proxy({}, handler) as PrismaClient

// Default export (same proxy)
export default prisma

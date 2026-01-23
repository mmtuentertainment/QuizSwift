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

// For backward compatibility - lazy getter
export const prisma = {
  get client() {
    return getPrisma()
  }
} as unknown as PrismaClient

// Make all PrismaClient methods available on the export
const handler: ProxyHandler<object> = {
  get(_, prop) {
    return getPrisma()[prop as keyof PrismaClient]
  }
}

export default new Proxy({}, handler) as PrismaClient

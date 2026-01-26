import { PrismaClient } from "@/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool, PoolClient } from "pg"

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

/**
 * Audit context for database triggers
 * Sets session variables that audit triggers read to populate actor info
 */
export interface AuditContext {
  userId: string
  ip?: string
  userAgent?: string
}

/**
 * Execute a function with audit context set
 * This sets PostgreSQL session variables that the audit trigger reads
 */
export async function withAuditContext<T>(
  context: AuditContext,
  fn: () => Promise<T>
): Promise<T> {
  const pool = globalForPrisma.pool
  if (!pool) {
    // Pool not initialized, just execute without context
    return fn()
  }

  const client: PoolClient = await pool.connect()
  try {
    // Set session variables for audit trigger
    await client.query(`SELECT set_config('app.current_user_id', $1, true)`, [context.userId])
    if (context.ip) {
      await client.query(`SELECT set_config('app.current_ip', $1, true)`, [context.ip])
    }
    if (context.userAgent) {
      await client.query(`SELECT set_config('app.current_user_agent', $1, true)`, [context.userAgent])
    }

    // Execute the function
    return await fn()
  } finally {
    client.release()
  }
}

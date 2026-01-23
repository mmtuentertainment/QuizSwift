# Phase 1: Foundation & Compliance - Research

**Researched:** 2026-01-23
**Domain:** Authentication, Database Schema, Compliance Infrastructure (COPPA/FERPA)
**Confidence:** HIGH

## Summary

Phase 1 establishes the security and compliance foundation that all future features build upon. The research confirms that the decided stack (Next.js 16 + Auth.js v5 + Prisma 7 + PostgreSQL 16) is well-suited for this phase, with Auth.js v5 providing native Google OAuth support and Prisma 7 enabling robust audit logging through client extensions.

The critical insight is that **compliance infrastructure must be database-native, not application-bolted**. Audit trails implemented via PostgreSQL triggers ensure every data access is logged regardless of application path. COPPA school consent model and FERPA-ready architecture require specific schema patterns established before any student data enters the system.

**Primary recommendation:** Build compliance infrastructure (audit logging, soft delete with anonymization, DPA template) as database schema and triggers in Phase 1. Authentication uses Auth.js v5 with Prisma adapter and database sessions for persistent login.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Auth.js (NextAuth v5) | 5.x beta | Authentication framework | Native Next.js integration, 50+ OAuth providers, Prisma adapter included, database session support |
| @auth/prisma-adapter | latest | Database adapter for Auth.js | Official Prisma integration, handles User/Account/Session/VerificationToken models |
| Prisma ORM | 7.2.x | Database ORM | Pure TypeScript, Prisma 7 uses driver adapters, client extensions for audit logging |
| @prisma/adapter-pg | 7.2.x | PostgreSQL driver adapter | Required for Prisma 7, replaces built-in PostgreSQL connection |
| PostgreSQL | 16.x | Primary database | ACID compliance, row-level security, trigger support for audit trails |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| pg | 8.x | PostgreSQL driver | Required by @prisma/adapter-pg |
| zod | 3.x | Schema validation | Validating user input, environment variables |
| bcryptjs | 3.x | Password hashing | If credentials auth needed (not for OAuth-only) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Auth.js v5 (beta) | Clerk | Hosted solution, faster setup, but vendor lock-in and less control over compliance |
| Auth.js v5 (beta) | Better Auth | Full control, type-safe, but newer and less ecosystem support |
| Database sessions | JWT sessions | JWT is stateless/faster, but cannot revoke sessions server-side (security tradeoff) |
| PostgreSQL triggers | Prisma middleware | Middleware is application-level only, triggers catch all access paths |

**Installation:**
```bash
npm install next-auth@beta @auth/prisma-adapter
npm install @prisma/client @prisma/adapter-pg pg
npm install -D prisma
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── api/
│   │   └── auth/
│   │       └── [...nextauth]/
│   │           └── route.ts        # Auth.js route handlers
│   ├── (auth)/                     # Auth pages (login)
│   │   └── login/
│   │       └── page.tsx
│   └── (dashboard)/                # Protected routes
│       └── page.tsx
├── lib/
│   ├── auth.ts                     # Auth.js config with adapter
│   ├── auth.config.ts              # Edge-compatible auth config
│   └── prisma.ts                   # Prisma client singleton
└── prisma/
    ├── schema.prisma               # Database schema
    ├── migrations/                 # Migration history
    └── prisma.config.ts            # Prisma 7 config file
```

### Pattern 1: Auth.js v5 Split Configuration (Edge Compatibility)
**What:** Separate auth configuration into `auth.config.ts` (edge-compatible) and `auth.ts` (includes database adapter).
**When to use:** When using middleware for route protection with database sessions.
**Example:**
```typescript
// src/lib/auth.config.ts - Edge compatible, no database imports
import type { NextAuthConfig } from "next-auth"
import Google from "next-auth/providers/google"

export const authConfig = {
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isOnDashboard = nextUrl.pathname.startsWith("/dashboard")
      if (isOnDashboard) {
        if (isLoggedIn) return true
        return false // Redirect to login
      }
      return true
    },
  },
} satisfies NextAuthConfig

// src/lib/auth.ts - Full config with database adapter
import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import prisma from "@/lib/prisma"
import { authConfig } from "./auth.config"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" }, // Database sessions for persistence
  ...authConfig,
})

// middleware.ts - Uses edge-compatible config only
import NextAuth from "next-auth"
import { authConfig } from "@/lib/auth.config"

export default NextAuth(authConfig).auth

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\.png$).*)"],
}
```
**Source:** [Auth.js v5 Migration Guide](https://authjs.dev/getting-started/migrating-to-v5)

### Pattern 2: Prisma 7 with PostgreSQL Adapter
**What:** Prisma 7 requires explicit driver adapters instead of built-in database connections.
**When to use:** All Prisma 7 projects (mandatory).
**Example:**
```typescript
// prisma.config.ts - Required in Prisma 7
import "dotenv/config"
import { defineConfig, env } from "prisma/config"

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
})

// src/lib/prisma.ts - Singleton with driver adapter
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const globalForPrisma = global as unknown as { prisma: PrismaClient }

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
})

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
  })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma

export default prisma
```
**Source:** [Prisma 7 Migration Guide](https://www.buildwithmatija.com/blog/migrate-prisma-v7-nextjs-16-turbopack-fix)

### Pattern 3: PostgreSQL Audit Logging with Triggers
**What:** Database-level audit logging via triggers that capture all operations regardless of application path.
**When to use:** FERPA compliance requires audit trail for all data access.
**Example:**
```sql
-- Create audit log table
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name VARCHAR(100) NOT NULL,
  record_id VARCHAR(100) NOT NULL,
  action VARCHAR(10) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE', 'SELECT')),
  actor_id VARCHAR(100), -- User ID who performed action
  actor_type VARCHAR(50), -- 'teacher', 'admin', 'system'
  old_data JSONB,
  new_data JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for querying by date and user
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);
CREATE INDEX idx_audit_log_actor_id ON audit_log(actor_id);
CREATE INDEX idx_audit_log_table_name ON audit_log(table_name);

-- Generic audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
  actor_id TEXT;
  actor_type TEXT;
BEGIN
  -- Get actor context from session variable (set by application)
  actor_id := current_setting('app.current_user_id', true);
  actor_type := current_setting('app.current_user_type', true);

  IF (TG_OP = 'DELETE') THEN
    INSERT INTO audit_log (table_name, record_id, action, actor_id, actor_type, old_data)
    VALUES (TG_TABLE_NAME, OLD.id::text, 'DELETE', actor_id, actor_type, row_to_json(OLD));
    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO audit_log (table_name, record_id, action, actor_id, actor_type, old_data, new_data)
    VALUES (TG_TABLE_NAME, NEW.id::text, 'UPDATE', actor_id, actor_type, row_to_json(OLD), row_to_json(NEW));
    RETURN NEW;
  ELSIF (TG_OP = 'INSERT') THEN
    INSERT INTO audit_log (table_name, record_id, action, actor_id, actor_type, new_data)
    VALUES (TG_TABLE_NAME, NEW.id::text, 'INSERT', actor_id, actor_type, row_to_json(NEW));
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to users table (repeat for other sensitive tables)
CREATE TRIGGER audit_users_trigger
AFTER INSERT OR UPDATE OR DELETE ON users
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
```
**Source:** [Yarsa Labs - Audit Trail in PostgreSQL](https://blog.yarsalabs.com/audit-trail-in-postgresql-using-prisma/)

### Pattern 4: Application Context for Audit Logging
**What:** Pass user context from application to PostgreSQL session for audit trails.
**When to use:** Every database operation that should log the acting user.
**Example:**
```typescript
// src/lib/db-context.ts
import prisma from "@/lib/prisma"

export async function withAuditContext<T>(
  userId: string,
  userType: string,
  operation: () => Promise<T>
): Promise<T> {
  // Set session variables for PostgreSQL triggers
  await prisma.$executeRaw`SELECT set_config('app.current_user_id', ${userId}, true)`
  await prisma.$executeRaw`SELECT set_config('app.current_user_type', ${userType}, true)`

  return operation()
}

// Usage in API route
import { auth } from "@/lib/auth"
import { withAuditContext } from "@/lib/db-context"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const users = await withAuditContext(
    session.user.id,
    session.user.role,
    () => prisma.user.findMany()
  )

  return Response.json(users)
}
```

### Anti-Patterns to Avoid
- **Application-only audit logging:** Logging in middleware/services misses direct database access, admin tools, migrations. Use database triggers.
- **JWT sessions for compliance:** Cannot revoke sessions server-side, cannot audit active sessions. Use database sessions.
- **Hardcoded user context:** Passing user ID as function parameter loses context in nested calls. Use PostgreSQL session variables.
- **Soft delete without anonymization:** Soft delete alone doesn't satisfy GDPR/COPPA "right to erasure." Must anonymize PII.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| OAuth flow | Custom OAuth implementation | Auth.js providers | Token refresh, state management, PKCE handled automatically |
| Session management | Custom cookie/JWT handling | Auth.js sessions | CSRF protection, secure cookie settings, rotation built-in |
| Database migrations | Manual SQL scripts | Prisma Migrate | Version control, rollback, type generation integrated |
| Password hashing | Manual bcrypt calls | bcryptjs with Auth.js credentials | Timing attack protection, salt generation handled |
| DPA templates | Custom legal documents | SDPC National DPA template | Vetted by 100+ districts, legally reviewed |

**Key insight:** Authentication and compliance are "iceberg problems" - visible complexity is 10%, edge cases and security implications are 90%. Use established solutions.

## Common Pitfalls

### Pitfall 1: Claiming "FERPA Compliant" Instead of "FERPA Ready"
**What goes wrong:** EdTech vendors claim FERPA compliance, but FERPA applies to schools receiving federal funds, not vendors. Incorrect claims create legal liability.
**Why it happens:** Misunderstanding that FERPA governs schools, not vendors directly. Vendors enable school compliance.
**How to avoid:** Use language "FERPA-ready" or "supports schools' FERPA compliance." Build audit logging, data deletion, and DPAs as enablers.
**Warning signs:** Marketing claims "FERPA certified" (no such certification exists), no audit logging, no DPA template.
**Source:** [UpGuard FERPA Compliance Guide](https://www.upguard.com/blog/ferpa-compliance-guide)

### Pitfall 2: COPPA School Consent Without Documentation
**What goes wrong:** Relying on "schools handle consent" without proper contracts. FTC can still hold vendors liable.
**Why it happens:** COPPA school consent exception is guidance, not codified law. FTC declined to codify in 2025 rule.
**How to avoid:**
1. DPA must explicitly state school provides consent for under-13 users
2. Data used only for educational purposes (no marketing, no behavioral ads)
3. Clear retention and deletion policies in contract
4. Document that school, not vendor, determines appropriateness
**Warning signs:** No DPA template, collecting data beyond educational purpose, no parental notification mechanism.
**Source:** [Public Interest Privacy Center - COPPA Update](https://publicinterestprivacy.org/new-coppa-update/)

### Pitfall 3: Auth.js v5 Edge Incompatibility
**What goes wrong:** Using database adapter in middleware causes "adapter not supported on edge runtime" errors.
**Why it happens:** Middleware runs on edge runtime; Prisma adapter requires Node.js runtime.
**How to avoid:** Split configuration pattern - `auth.config.ts` for edge (providers only), `auth.ts` for server (includes adapter).
**Warning signs:** "PrismaClient is unable to run in the edge runtime" errors in middleware.
**Source:** [Auth.js Migration Guide](https://authjs.dev/getting-started/migrating-to-v5)

### Pitfall 4: Prisma 7 Migration Breaking Changes
**What goes wrong:** Upgrading to Prisma 7 breaks existing code due to mandatory driver adapters.
**Why it happens:** Prisma 7 removes built-in database drivers; requires explicit `@prisma/adapter-pg`.
**How to avoid:**
1. Install `@prisma/adapter-pg` and `pg`
2. Create `prisma.config.ts` with `datasource.url`
3. Remove `url = env("DATABASE_URL")` from schema.prisma datasource block
4. Pass adapter to `new PrismaClient({ adapter })`
**Warning signs:** "Cannot find module '@prisma/client'" or connection errors after upgrade.
**Source:** [Prisma v7 Migration Guide](https://medium.com/@gauravkmaurya09/guide-to-prisma-7-with-next-js-16-javascript-edition-99c8c4ca10be)

### Pitfall 5: Audit Log Retention Too Short
**What goes wrong:** 90-day audit log retention insufficient for FERPA investigations, which can span years.
**Why it happens:** Default logging configurations prioritize storage over compliance.
**How to avoid:** Minimum 1-3 year retention for audit logs. Partition audit_log table by date for performance. Consider archival to cold storage after 90 days.
**Warning signs:** No retention policy documented, audit table growing without bounds, no archival strategy.
**Source:** [FERPA Compliance Checklist](https://www.brightdefense.com/blog/ferpa-compliance-checklist/)

## Code Examples

Verified patterns from official sources:

### Auth.js v5 Complete Route Handler
```typescript
// src/app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/lib/auth"

export const { GET, POST } = handlers
```
**Source:** [Auth.js Documentation](https://authjs.dev/getting-started/migrating-to-v5)

### Auth.js Prisma Schema (Required Models)
```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client"
}

datasource db {
  provider = "postgresql"
}

model User {
  id            String    @id @default(cuid())
  name          String?
  email         String?   @unique
  emailVerified DateTime?
  image         String?
  role          String    @default("teacher")
  accounts      Account[]
  sessions      Session[]

  // Soft delete support
  deletedAt     DateTime?

  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String
  expires    DateTime

  @@unique([identifier, token])
}

// Audit logging table
model AuditLog {
  id         String   @id @default(cuid())
  tableName  String   @map("table_name")
  recordId   String   @map("record_id")
  action     String   // INSERT, UPDATE, DELETE
  actorId    String?  @map("actor_id")
  actorType  String?  @map("actor_type")
  oldData    Json?    @map("old_data")
  newData    Json?    @map("new_data")
  ipAddress  String?  @map("ip_address")
  userAgent  String?  @map("user_agent")
  createdAt  DateTime @default(now()) @map("created_at")

  @@index([createdAt])
  @@index([actorId])
  @@index([tableName])
  @@map("audit_log")
}
```
**Source:** [Auth.js Prisma Adapter](https://authjs.dev/getting-started/adapters/prisma)

### Data Deletion with Anonymization (COPPA/GDPR Compliant)
```typescript
// src/lib/user-deletion.ts
import prisma from "@/lib/prisma"
import { withAuditContext } from "@/lib/db-context"

export async function deleteUserData(
  userId: string,
  requestedBy: string,
  requestorRole: string
) {
  return withAuditContext(requestedBy, requestorRole, async () => {
    // Anonymize user data instead of hard delete
    // This preserves referential integrity while removing PII
    await prisma.user.update({
      where: { id: userId },
      data: {
        email: `deleted_${userId}@anonymized.local`,
        name: "Deleted User",
        image: null,
        deletedAt: new Date(),
      },
    })

    // Delete OAuth tokens (these can be hard deleted)
    await prisma.account.deleteMany({
      where: { userId },
    })

    // Invalidate all sessions
    await prisma.session.deleteMany({
      where: { userId },
    })

    // Log deletion request for compliance
    await prisma.auditLog.create({
      data: {
        tableName: "users",
        recordId: userId,
        action: "ANONYMIZE",
        actorId: requestedBy,
        actorType: requestorRole,
        newData: { reason: "User deletion request" },
      },
    })
  })
}
```

### Environment Variables Configuration
```bash
# .env.local

# Auth.js v5 uses AUTH_ prefix
AUTH_SECRET="your-secret-key-at-least-32-characters"
AUTH_GOOGLE_ID="your-google-client-id.apps.googleusercontent.com"
AUTH_GOOGLE_SECRET="your-google-client-secret"

# Prisma 7 database URL
DATABASE_URL="postgresql://user:password@localhost:5432/quizswift?schema=public"

# App URL for callbacks
AUTH_URL="http://localhost:3000"
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| NEXTAUTH_ env prefix | AUTH_ env prefix | Auth.js v5 | All env vars must be renamed |
| @next-auth/prisma-adapter | @auth/prisma-adapter | Auth.js v5 | Package name changed |
| prisma-client-js generator | prisma-client generator | Prisma 7 | Generator provider changed |
| Built-in DB drivers | @prisma/adapter-pg required | Prisma 7 | Must install and configure driver adapter |
| OAuth 1.0 support | OAuth 2.0 only | Auth.js v5 | Legacy OAuth 1.0 providers removed |
| url in schema.prisma | url in prisma.config.ts | Prisma 7 | Database URL moved to config file |
| COPPA self-certification | FTC-overseen safe harbor | COPPA 2025 | Stronger enforcement starting April 2026 |

**Deprecated/outdated:**
- NextAuth v4: Still works but v5 is recommended for new projects
- Prisma middleware for logging: Replaced by Prisma Client Extensions
- JWT sessions for sensitive apps: Database sessions preferred for auditability

## Open Questions

Things that couldn't be fully resolved:

1. **Prisma 7 Turbopack Compatibility**
   - What we know: Some reports of module resolution errors with Turbopack and Prisma 7's new generator
   - What's unclear: Whether this is fixed in latest versions
   - Recommendation: Test early, have fallback to Webpack if needed. Check [Prisma GitHub issues](https://github.com/prisma/prisma/issues) before development starts.

2. **Google Workspace Admin Approval Timeline**
   - What we know: OAuth apps accessing Google Classroom require domain admin approval
   - What's unclear: Exact timeline for approval (reports vary from days to weeks)
   - Recommendation: Start OAuth app registration and verification process immediately. May need test Google Workspace environment.

3. **COPPA Safe Harbor Program Changes**
   - What we know: FTC amendments take effect April 22, 2026 with new safe harbor requirements
   - What's unclear: Whether existing guidance on school consent will change
   - Recommendation: Design for strictest interpretation; monitor FTC announcements. Build DPA with explicit school consent language.

## Sources

### Primary (HIGH confidence)
- [Auth.js v5 Migration Guide](https://authjs.dev/getting-started/migrating-to-v5) - Configuration patterns, breaking changes
- [Auth.js Prisma Adapter](https://authjs.dev/getting-started/adapters/prisma) - Schema requirements, setup
- [Prisma 7 with Next.js Guide](https://www.prisma.io/docs/guides/nextjs) - Driver adapter setup
- [Prisma v7 Migration](https://medium.com/@gauravkmaurya09/guide-to-prisma-7-with-next-js-16-javascript-edition-99c8c4ca10be) - Breaking changes

### Secondary (MEDIUM confidence)
- [SDPC National DPA](https://privacy.a4l.org/national-dpa/) - Data Processing Agreement template
- [1EdTech DPSA Template](https://www.1edtech.org/resource/dpsa) - Alternative DPA template
- [UpGuard FERPA Guide](https://www.upguard.com/blog/ferpa-compliance-guide) - Compliance requirements
- [Yarsa Labs Audit Trail](https://blog.yarsalabs.com/audit-trail-in-postgresql-using-prisma/) - PostgreSQL trigger patterns

### Tertiary (LOW confidence - validate before use)
- [Public Interest Privacy - COPPA Update](https://publicinterestprivacy.org/new-coppa-update/) - Regulatory analysis (advocacy organization)
- [K-12 Dive COPPA Article](https://www.k12dive.com/news/new-coppa-rule-effective-date-2025-ftc/746406/) - News coverage

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official documentation, stable releases, verified patterns
- Architecture patterns: HIGH - Auth.js and Prisma patterns from official docs
- Compliance (COPPA/FERPA): MEDIUM - Regulatory guidance exists but interpretation varies; consult legal
- Audit logging: MEDIUM - PostgreSQL trigger pattern is standard but application context passing varies

**Research date:** 2026-01-23
**Valid until:** 2026-02-23 (30 days - stable domain, but monitor COPPA enforcement updates)

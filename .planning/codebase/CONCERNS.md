# Technical Concerns

## Critical Security Issues

### 1. Dangerous Email Linking (HIGH)

**Location:** NextAuth configuration
**Risk:** Account takeover via OAuth email conflicts

NextAuth's `allowDangerousEmailAccountLinking` flag allows accounts to be linked by email across different OAuth providers. An attacker could:
1. Create an account with OAuth provider A
2. Create a different account on OAuth provider B with same email
3. Gain access to both accounts

**Recommendation:** Disable this flag or implement explicit user consent for account linking.

### 2. In-Memory Rate Limiting (HIGH)

**Location:** API middleware
**Risk:** Rate limit bypass in distributed deployments

Current rate limiter stores state in memory:
- Not shared across server instances
- Resets on server restart
- Bypassed by attacking different instances

**Recommendation:** Use Redis or database-backed rate limiting.

### 3. bcryptjs Maintenance Status (MEDIUM)

**Package:** `bcryptjs` ^3.0.3
**Risk:** Potential future security vulnerabilities

bcryptjs is less actively maintained than `bcrypt`. Consider:
- Migrating to `bcrypt` (native bindings)
- Or `argon2` (modern algorithm)

## Security Gaps

### 4. No Audit Logging

**Risk:** Cannot trace security incidents

Missing:
- Login attempt logging
- Permission change tracking
- Data access logging
- API request logging

**Recommendation:** Implement audit trail for security-relevant events.

### 5. No CSRF Protection Verification

**Risk:** Potential cross-site request forgery

While Next.js provides some built-in protections, explicit CSRF token validation should be verified on state-changing operations.

### 6. Content Scraping Without Validation

**Location:** `services/content/web.ts`
**Risk:** SSRF (Server-Side Request Forgery)

Web scraping accepts user-provided URLs without sufficient validation:
- Could be used to access internal services
- Could expose internal network topology

**Recommendation:** Implement URL allowlisting or strict validation.

## Technical Debt

### 7. next-auth Beta Version (MEDIUM)

**Package:** `next-auth` ^5.0.0-beta.30
**Risk:** Breaking changes, instability

Using beta version in production:
- API may change
- Bugs may exist
- Limited community support for issues

**Recommendation:** Monitor for stable release and plan migration.

### 8. Synchronous AI Processing

**Location:** Quiz generation endpoints
**Risk:** Request timeouts, poor UX

AI generation happens synchronously:
- Long response times (10-30s)
- No progress feedback
- Timeout risks

**Recommendation:** Implement async processing with status polling or webhooks.

### 9. No Database Connection Pooling Config

**Location:** Prisma configuration
**Risk:** Connection exhaustion under load

Default Prisma connection settings:
- May not handle concurrent requests well
- Connection limits not explicitly configured

**Recommendation:** Configure connection pool size based on expected load.

## Test Coverage Gaps

### 10. AI Service Untested

**Location:** `services/ai/`
**Gap:** No unit tests for AI provider logic

Missing tests for:
- Provider fallback logic
- Error handling
- Response parsing
- Rate limit handling

### 11. Authentication Flow Untested

**Location:** `app/api/auth/`
**Gap:** No integration tests for auth flows

Missing tests for:
- Login/logout flows
- Session management
- OAuth callbacks
- Password reset

### 12. Export Functionality Untested

**Location:** PDF/ZIP generation
**Gap:** No tests for export features

Missing tests for:
- PDF generation accuracy
- ZIP file structure
- Large quiz handling
- Error cases

## Performance Concerns

### 13. No Caching Strategy

**Location:** API responses, AI results
**Impact:** Unnecessary API calls, slow responses

Missing:
- Response caching
- AI result caching
- Static asset caching headers

### 14. Large Bundle Size Risk

**Packages:** @react-pdf/renderer, jszip
**Impact:** Slow initial page load

Heavy libraries included in main bundle:
- Consider dynamic imports
- Code splitting for export features

### 15. No Database Query Optimization

**Location:** Prisma queries
**Impact:** N+1 queries, slow list pages

Potential issues:
- Missing indexes
- Unoptimized includes
- No pagination on large lists

## Operational Concerns

### 16. No Health Check Endpoint

**Impact:** Deployment verification, monitoring

Missing `/api/health` endpoint for:
- Load balancer health checks
- Uptime monitoring
- Database connectivity verification

### 17. No Structured Logging

**Impact:** Debugging, monitoring

Current state:
- console.log statements
- No log levels
- No correlation IDs
- No structured format

**Recommendation:** Implement pino or winston with structured logging.

### 18. No Error Tracking

**Impact:** Production issue visibility

Missing:
- Error aggregation (Sentry, etc.)
- Error alerting
- Stack trace collection

## Dependency Risks

### 19. youtube-transcript Reliability

**Package:** `youtube-transcript` ^1.2.1
**Risk:** YouTube API changes breaking functionality

Unofficial library that scrapes YouTube:
- No guaranteed stability
- May break without notice
- Rate limiting concerns

### 20. React 19 Compatibility

**Package:** `react` 19.2.3
**Risk:** Library compatibility issues

Cutting-edge React version:
- Some libraries may not support it yet
- Potential breaking changes in minor versions

## Priority Matrix

| Concern | Severity | Effort | Priority |
|---------|----------|--------|----------|
| Dangerous Email Linking | High | Low | P0 |
| In-Memory Rate Limiting | High | Medium | P0 |
| No Audit Logging | High | Medium | P1 |
| Synchronous AI Processing | Medium | High | P1 |
| Test Coverage Gaps | Medium | High | P1 |
| next-auth Beta | Medium | Medium | P2 |
| bcryptjs Maintenance | Medium | Low | P2 |
| No Caching | Medium | Medium | P2 |
| SSRF Risk | Medium | Low | P2 |
| Logging/Monitoring | Low | Medium | P3 |

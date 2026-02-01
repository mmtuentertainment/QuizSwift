# Security Review: PR #6

**PR Title:** feat: Phase 3 Tech Debt (3.1 + 3.2) and Quick Fixes
**Scope:** 91 files changed, 13,378 additions, 367 deletions
**Review Date:** 2026-02-01
**Reviewer:** Claude Opus 4.5 (Security Audit)

---

## Summary

The PR demonstrates **solid security practices** across authentication, authorization, input validation, and file upload handling. The codebase follows defense-in-depth principles with multiple validation layers. While no critical vulnerabilities were found, there are several medium-priority hardening opportunities that should be addressed before production deployment.

**Overall Security Grade: B+**

---

## Critical Issues (Must Fix)

**None identified.** The code demonstrates proper security patterns throughout.

---

## High Priority Issues

### 1. Rate Limiting Not Applied to Image Upload Presigned URL Endpoint

**Location:** `src/app/api/upload/image/route.ts`
**Severity:** HIGH
**OWASP:** A04:2021 - Insecure Design

**Issue:** The image upload endpoint at `/api/upload/image` lacks rate limiting, while the PDF upload endpoint (`/api/upload/route.ts`) properly implements it. This inconsistency could allow attackers to:
- Generate unlimited presigned URLs
- Exhaust R2 storage quotas
- Perform denial-of-service attacks

**Current Code (line 24-31):**
```typescript
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // No rate limiting before proceeding
```

**Recommendation:** Add rate limiting consistent with the PDF upload endpoint:
```typescript
import { checkRateLimit, rateLimitHeaders, RATE_LIMITS } from '@/lib/rate-limit';

// After authentication check
const rateLimitResult = checkRateLimit(`image-upload:${session.user.id}`, RATE_LIMITS.upload);
if (!rateLimitResult.allowed) {
  return NextResponse.json(
    { error: 'Too many upload requests. Please try again later.' },
    { status: 429, headers: rateLimitHeaders(rateLimitResult) }
  );
}
```

---

### 2. Error Messages May Leak Implementation Details in PDF Upload

**Location:** `src/app/api/upload/route.ts` (lines 99-101)
**Severity:** HIGH
**OWASP:** A09:2021 - Security Logging and Monitoring Failures

**Issue:** When errors occur during upload, the full error message is returned to the client:
```typescript
if (error instanceof Error) {
  return NextResponse.json({ error: error.message }, { status: 400 });
}
```

This could leak:
- Internal path information from file operations
- Database error details from Prisma
- R2 storage configuration details

**Recommendation:** Sanitize error messages for client responses while preserving detailed logging:
```typescript
if (error instanceof Error) {
  console.error('[Upload Error]:', error);
  // Return sanitized message based on known error types
  const safeErrors = ['Invalid file type', 'File too large', 'Maximum is'];
  const isSafeError = safeErrors.some(msg => error.message.includes(msg));
  return NextResponse.json(
    { error: isSafeError ? error.message : 'Upload failed. Please try again.' },
    { status: 400 }
  );
}
```

---

## Medium Priority Issues

### 3. No CSRF Protection Verification for Server Actions

**Location:** All files in `src/actions/`
**Severity:** MEDIUM
**OWASP:** A01:2021 - Broken Access Control

**Issue:** Server actions rely on Next.js's built-in CSRF protection, but there's no explicit verification that this protection is enabled and configured correctly. Next.js 16+ should handle this automatically, but this should be verified.

**Recommendation:**
1. Verify that `next.config.js` does not disable CSRF protection
2. Add a comment documenting the reliance on Next.js CSRF protection:
```typescript
// Note: CSRF protection is handled by Next.js Server Actions automatically
// See: https://nextjs.org/blog/security-nextjs-server-components-actions
```

---

### 4. Missing Input Length Validation in API Route JSON Parsing

**Location:** `src/app/api/documents/[id]/curate/route.ts` (line 80)
**Severity:** MEDIUM
**OWASP:** A03:2021 - Injection

**Issue:** The PATCH endpoint parses JSON without size limits:
```typescript
const body = (await request.json()) as UpdateSelectionRequest;
```

An attacker could send an extremely large JSON payload to exhaust server memory.

**Recommendation:** Add request body size validation or rely on middleware:
```typescript
// Option 1: Check Content-Length header
const contentLength = parseInt(request.headers.get('content-length') || '0');
if (contentLength > 100 * 1024) { // 100KB max for selection updates
  return NextResponse.json({ error: 'Request body too large' }, { status: 413 });
}

// Option 2: Configure in next.config.js (preferred)
// api: { bodyParser: { sizeLimit: '100kb' } }
```

---

### 5. Question IDs in Error Messages Could Enable Enumeration

**Location:** `src/app/api/documents/[id]/curate/route.ts` (lines 116-119)
**Severity:** MEDIUM
**OWASP:** A01:2021 - Broken Access Control

**Issue:** Invalid question IDs are returned in error messages:
```typescript
if (invalidIds.length > 0) {
  return NextResponse.json(
    { error: `Invalid question IDs: ${invalidIds.join(', ')}` },
    { status: 400 }
  );
}
```

While the endpoint already validates document ownership, exposing which IDs are invalid vs. non-existent could help attackers understand the ID format and enumerate valid patterns.

**Recommendation:** Use generic error message:
```typescript
if (invalidIds.length > 0) {
  return NextResponse.json(
    { error: 'One or more question IDs are invalid or do not belong to this document' },
    { status: 400 }
  );
}
```

---

### 6. In-Memory Rate Limiting Limitations

**Location:** `src/lib/rate-limit.ts`
**Severity:** MEDIUM
**OWASP:** A04:2021 - Insecure Design

**Issue:** The rate limiter uses in-memory storage which doesn't persist across serverless function instances. This is documented in the code comments (lines 1-13), but the limitation means:
- Different function instances have separate counters
- Rate limits reset when functions cold-start
- Distributed attacks may bypass limits

**Current mitigation:** The code acknowledges this limitation.

**Recommendation for production:** Implement Redis-based rate limiting as noted in the code comments:
```typescript
// Consider: @upstash/ratelimit or Vercel KV for production
```

---

### 7. Missing Audit Logging for Sensitive Operations

**Location:** All server actions and API routes
**Severity:** MEDIUM
**OWASP:** A09:2021 - Security Logging and Monitoring Failures

**Issue:** While errors are logged, successful sensitive operations lack audit trails:
- Quiz publication/unpublication
- Question modifications
- Document ownership changes (if implemented)

**Recommendation:** Add audit logging for key operations:
```typescript
// Example in publishQuiz
console.log('[Audit] Quiz published', {
  quizId,
  userId: session.user.id,
  timestamp: new Date().toISOString(),
});
```

Or integrate with a proper audit logging service.

---

## Low Priority/Recommendations

### 8. Consider Adding Request ID for Error Correlation

**Location:** All API routes and server actions
**Severity:** LOW

**Issue:** When errors occur, there's no request ID to correlate client-reported issues with server logs.

**Recommendation:** Add request IDs to error responses:
```typescript
const requestId = crypto.randomUUID();
console.error(`[${requestId}] Upload error:`, error);
return NextResponse.json(
  { error: 'Upload failed', requestId },
  { status: 500 }
);
```

---

### 9. Consider Content-Security-Policy Headers

**Location:** Next.js configuration
**Severity:** LOW
**OWASP:** A05:2021 - Security Misconfiguration

**Issue:** No explicit CSP headers observed in the reviewed code. While this may be configured elsewhere, CSP is important for XSS prevention.

**Recommendation:** Add CSP headers in `next.config.js` or middleware.

---

### 10. Presigned URL Expiry Could Be Shorter

**Location:** `src/lib/storage/images.ts` (lines 21-22)
**Severity:** LOW

**Current configuration:**
- Upload URL: 5 minutes (appropriate)
- Download URL: 24 hours (could be shorter for sensitive content)

**Recommendation:** Consider shorter expiry for download URLs based on use case requirements.

---

## Verified Security Practices (Done Well)

### Authentication & Authorization

1. **Consistent Auth Checks:** Every server action and API route properly validates authentication via `auth()` before processing.

2. **Ownership Verification:** All data access includes ownership checks:
   ```typescript
   // Example from attempts.ts
   if (quiz.document.uploadedById !== session.user.id) {
     return { error: 'Access denied' };
   }
   ```

3. **Compound Authorization:** Routes check both authentication AND resource ownership separately with clear error messages.

### Input Validation

4. **CUID Validation:** All ID parameters are validated using Zod schemas:
   ```typescript
   const idCheck = cuidSchema.safeParse(quizId);
   if (!idCheck.success) return { error: 'Invalid quiz ID format' };
   ```

5. **Comprehensive Zod Schemas:** Server actions use well-defined Zod schemas with appropriate constraints:
   - String length limits (`max(5000)`, `max(200)`, etc.)
   - Numeric bounds (`min(1)`, `max(300)`)
   - Enum validation (`z.nativeEnum(ShowResultsOption)`)
   - Discriminated unions for type-safe validation

6. **FormData Parsing:** JSON parsing from FormData includes error handling:
   ```typescript
   try {
     parsedIds = rawQuestionIds ? JSON.parse(rawQuestionIds as string) : [];
   } catch {
     return { error: 'Invalid question IDs format: malformed JSON' };
   }
   ```

### File Upload Security

7. **File Type Validation:** Both PDF and image uploads validate MIME types against allowlists:
   ```typescript
   const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
   if (!ALLOWED_IMAGE_TYPES.includes(contentType)) { /* reject */ }
   ```

8. **File Size Limits:** Clear size limits enforced:
   - PDF: 50MB max
   - Images: 5MB max

9. **Filename Sanitization:** Path traversal attacks prevented:
   ```typescript
   function sanitizeFileName(fileName: string): string {
     const baseName = fileName.split(/[/\\]/).pop() || 'file';
     const noDotDot = baseName.replace(/\.\./g, '');
     const safeName = noDotDot.replace(/[^a-zA-Z0-9._-]/g, '_');
     // ...
   }
   ```

10. **Extension Validation:** File extensions validated in addition to MIME types:
    ```typescript
    if (!isValidImageExtension(fileName)) {
      return NextResponse.json({ error: 'Invalid file extension...' }, { status: 400 });
    }
    ```

### Data Access Security

11. **Scoped Queries:** Database queries are always scoped to the authenticated user:
    ```typescript
    where: {
      document: { uploadedById: session.user.id },
      teacherSelected: true,
    }
    ```

12. **No SQL Injection Risk:** Prisma ORM used throughout with parameterized queries.

13. **No Direct User Input in Queries:** IDs are validated before use in database operations.

### Error Handling

14. **Error Sanitization for Prisma:** Database errors are mapped to user-friendly messages:
    ```typescript
    if (error.code === 'P2002') return 'A record with this information already exists.';
    if (error.code === 'P2025') return 'Record not found.';
    ```

15. **Server-Side Logging:** Errors are logged with context for debugging while returning safe messages.

### Other Security Measures

16. **Rate Limiting on Upload:** PDF upload endpoint has proper rate limiting (10/hour/user).

17. **Atomic Transactions:** Database operations use transactions where needed for consistency.

18. **Cleanup on Failure:** Orphaned blobs are cleaned up when database operations fail:
    ```typescript
    } catch (dbError) {
      console.error('Database insert failed, cleaning up blob:', dbError);
      await deletePdf(uploadResult.storageKey);
      throw dbError;
    }
    ```

19. **JWT-Based Sessions:** Using JWT strategy for Edge compatibility with proper token handling.

20. **Pagination Bounds:** Query pagination is bounded to prevent abuse:
    ```typescript
    const limit = Math.min(100, Math.max(1, Math.floor(filters.limit ?? 20)));
    ```

---

## Conclusion

**Assessment: CONDITIONAL PASS**

The PR demonstrates mature security practices with proper authentication, authorization, input validation, and file upload handling. The codebase follows OWASP best practices for most common vulnerabilities.

**To achieve FULL PASS, address:**
1. **[HIGH]** Add rate limiting to image upload endpoint (quick fix)
2. **[HIGH]** Sanitize error messages in PDF upload route (quick fix)
3. **[MEDIUM]** Consider request body size limits for JSON endpoints

**Production Readiness:**
- The code is production-ready with the high-priority fixes above
- Medium-priority items should be addressed before scaling
- Low-priority items are hardening recommendations for future iterations

**OWASP Top 10 2021 Coverage:**
| Category | Status |
|----------|--------|
| A01: Broken Access Control | PASS - Proper auth & ownership checks |
| A02: Cryptographic Failures | N/A - No custom crypto observed |
| A03: Injection | PASS - Parameterized queries, input validation |
| A04: Insecure Design | CONDITIONAL - Rate limiting gap |
| A05: Security Misconfiguration | PARTIAL - CSP not verified |
| A06: Vulnerable Components | N/A - Not in scope |
| A07: Auth Failures | PASS - Proper session handling |
| A08: Software Integrity | N/A - Not in scope |
| A09: Logging Failures | PARTIAL - Audit logging recommended |
| A10: SSRF | PASS - No external URL fetching observed |

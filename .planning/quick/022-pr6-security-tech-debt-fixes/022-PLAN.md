---
id: quick-022
type: quick
title: PR #6 Security & Tech Debt Fixes
status: planned
created: 2026-02-01
context: PR #6 final review - security issues and tech debt from quick-021 security/debt review
---

# Quick-022: PR #6 Security & Tech Debt Fixes

## Objective

Fix HIGH PRIORITY security issues and tech debt identified in quick-021 review:
1. Add rate limiting to image upload endpoint (missing while PDF upload has it)
2. Sanitize error messages in PDF upload to prevent internal path leakage
3. Add proper return types to `getExtractionModel()` and `getEmbeddingModel()` functions

## Context

```
@src/app/api/upload/image/route.ts  # Missing rate limiting
@src/app/api/upload/route.ts        # Error message leakage (line 100)
@src/lib/ai/providers.ts            # any return types (lines 61, 75)
@src/lib/rate-limit.ts              # Rate limit implementation (reuse)
```

## Tasks

<task type="auto">
  <name>Task 1: Add rate limiting to image upload endpoint</name>
  <files>src/app/api/upload/image/route.ts</files>
  <action>
    Import and apply rate limiting to the image upload endpoint, matching the pattern used in PDF upload:

    1. Add imports: `import { checkRateLimit, rateLimitHeaders, RATE_LIMITS } from '@/lib/rate-limit';`

    2. Add rate limit check after auth check (before JSON parsing):
       ```typescript
       // Rate limiting: use same limit as PDF upload
       const rateLimitResult = checkRateLimit(`upload:${session.user.id}`, RATE_LIMITS.upload);

       if (!rateLimitResult.allowed) {
         return NextResponse.json(
           {
             error: 'Too many uploads. Please try again later.',
             retryAfter: rateLimitResult.resetAt - Math.floor(Date.now() / 1000),
           },
           {
             status: 429,
             headers: rateLimitHeaders(rateLimitResult),
           }
         );
       }
       ```

    Note: Both PDF and image uploads share the same `upload:{userId}` key, so they count toward
    the same 10 uploads/hour limit. This is intentional - total upload rate is what matters.
  </action>
  <verify>
    - File compiles: `npx tsc --noEmit src/app/api/upload/image/route.ts`
    - Rate limit imports present
    - 429 response with retryAfter and headers returned when limit exceeded
  </verify>
  <done>Image upload endpoint has rate limiting matching PDF upload pattern</done>
</task>

<task type="auto">
  <name>Task 2: Sanitize error messages in PDF upload endpoint</name>
  <files>src/app/api/upload/route.ts</files>
  <action>
    The catch block at line 96-104 returns raw error.message which could expose internal paths
    (e.g., "ENOENT: no such file or directory, open 'C:\\Users\\...\\file.pdf'").

    Replace the error handling with sanitized messages:

    ```typescript
    } catch (error) {
      console.error('Upload error:', error);

      // Sanitize error messages - never expose internal paths or stack traces
      const safeErrorMessages: Record<string, string> = {
        'File too large': 'File too large. Maximum size is 10MB.',
        'Invalid file type': 'Invalid file type. Only PDF files are allowed.',
        'No file provided': 'No file provided',
        'Question count must be': 'Question count must be between 5 and 50',
      };

      if (error instanceof Error) {
        // Check for known safe error patterns
        for (const [pattern, message] of Object.entries(safeErrorMessages)) {
          if (error.message.includes(pattern)) {
            return NextResponse.json({ error: message }, { status: 400 });
          }
        }
      }

      // Generic error for anything else - don't leak internal details
      return NextResponse.json(
        { error: 'Upload failed. Please try again.' },
        { status: 500 }
      );
    }
    ```

    This ensures:
    - Known validation errors get user-friendly messages
    - Unknown errors get generic message (no path/stack leakage)
    - All errors are still logged server-side for debugging
  </action>
  <verify>
    - File compiles: `npx tsc --noEmit src/app/api/upload/route.ts`
    - No raw error.message returned to client for unknown errors
    - Known validation errors still return helpful messages
  </verify>
  <done>PDF upload error messages sanitized - no internal path leakage possible</done>
</task>

<task type="auto">
  <name>Task 3: Add proper return types to AI model functions</name>
  <files>src/lib/ai/providers.ts</files>
  <action>
    The `getExtractionModel()` and `getEmbeddingModel()` functions return `any` which defeats
    type safety. While full typing is blocked by Ollama V1 vs OpenAI V3 incompatibility
    (see STATE.md decision), we can at least document the actual return types better.

    Update the function signatures to use branded types that preserve intent:

    ```typescript
    // Add these type aliases near the top of the file (after imports):

    /**
     * Branded type for Ollama language model.
     * Actual type is LanguageModelV1 but incompatible across providers.
     * @see STATE.md decision: "Any type for AI models"
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    export type OllamaLanguageModel = any;

    /**
     * Branded type for Ollama embedding model.
     * Actual type is EmbeddingModelV1 but incompatible across providers.
     * @see STATE.md decision: "Any type for AI models"
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    export type OllamaEmbeddingModel = any;
    ```

    Then update the function signatures:

    ```typescript
    export function getExtractionModel(): OllamaLanguageModel {
      return ollamaProvider('hermes2pro-32k');
    }

    export function getEmbeddingModel(): OllamaEmbeddingModel {
      return ollamaProvider.embedding('mxbai-embed-large');
    }
    ```

    Also update the safe variants:

    ```typescript
    export async function getExtractionModelSafe(): Promise<OllamaLanguageModel> {
      await ensureOllamaAvailable();
      return getExtractionModel();
    }

    export async function getEmbeddingModelSafe(): Promise<OllamaEmbeddingModel> {
      await ensureOllamaAvailable();
      return getEmbeddingModel();
    }
    ```

    This approach:
    - Documents WHY we use any (with @see reference)
    - Provides semantic meaning via type aliases
    - Keeps eslint-disable on the type definition, not every function
    - Maintains backward compatibility
  </action>
  <verify>
    - File compiles: `npx tsc --noEmit src/lib/ai/providers.ts`
    - Type aliases exported and used in function signatures
    - JSDoc comments reference STATE.md decision
    - No new eslint-disable comments on functions themselves
  </verify>
  <done>AI model functions have documented branded types instead of raw any</done>
</task>

## Verification

```bash
# All files compile
npx tsc --noEmit

# Lint passes
npm run lint

# Tests pass
npm test
```

## Success Criteria

- [ ] Image upload has rate limiting (429 on exceeded)
- [ ] PDF upload returns sanitized error messages
- [ ] AI model functions use documented type aliases instead of raw any
- [ ] All linting passes
- [ ] All tests pass

## Out of Scope (Deferred)

The following items require infrastructure changes and are NOT addressed in this task:

- **Distributed rate limiting** - Needs Redis/Vercel KV (documented in rate-limit.ts)
- **CSRF verification** - Already handled by NextAuth session cookies
- **JSON body size limits** - Would require middleware changes
- **Question ID enumeration** - Low risk, CUIDs are non-sequential
- **Audit logging** - Phase 4+ feature, needs logging infrastructure
- **Legacy type cleanup** - Tracked in PENDING-TODOS, needs usage audit first

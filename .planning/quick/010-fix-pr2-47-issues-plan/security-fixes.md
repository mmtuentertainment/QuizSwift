# Security Fixes Plan - PR #2 Review

**Category:** Security Issues (4 items)
**Priority:** CRITICAL (2) + HIGH (2)
**Estimated Time:** 30-45 minutes

---

## Issue 1: Missing Filename Extension Validation (CRITICAL)

**File:** `src/lib/storage/images.ts`
**Lines:** 49-77 (inside `getImageUploadUrl`)

### Problem

The `getImageUploadUrl` function validates content type but does NOT validate that the filename extension matches an allowed image extension. The `isValidImageExtension()` helper exists (lines 145-149) but is never called during upload.

**Attack Vector:** An attacker could upload `malware.exe` with content-type `image/png`, bypassing client-side checks.

### Current Code (lines 54-77)

```typescript
export async function getImageUploadUrl(
  userId: string,
  fileName: string,
  contentType: string,
  fileSize: number
): Promise<ImageUploadResult> {
  // Validate content type
  if (!isAllowedImageType(contentType)) {
    throw new Error(
      `Invalid image type: ${contentType}. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}`
    );
  }

  // Validate file size
  if (fileSize > MAX_IMAGE_SIZE) {
    // ... size validation
  }

  // Validate file size is positive
  if (fileSize <= 0) {
    throw new Error('File size must be greater than 0');
  }

  // Create unique path - NO EXTENSION VALIDATION HERE
  const timestamp = Date.now();
  const safeName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  const storageKey = `questions/images/${userId}/${timestamp}-${safeName}`;
```

### Fixed Code

Add extension validation after content type validation (around line 60):

```typescript
export async function getImageUploadUrl(
  userId: string,
  fileName: string,
  contentType: string,
  fileSize: number
): Promise<ImageUploadResult> {
  // Validate content type
  if (!isAllowedImageType(contentType)) {
    throw new Error(
      `Invalid image type: ${contentType}. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}`
    );
  }

  // Validate file extension matches allowed image types
  if (!isValidImageExtension(fileName)) {
    throw new Error(
      'Invalid file extension. Allowed: .jpg, .jpeg, .png, .gif, .webp'
    );
  }

  // ... rest of validation and upload logic
```

### Also Add Validation in Route Handler

**File:** `src/app/api/upload/image/route.ts`
**Lines:** 44-49 (add after required fields validation)

```typescript
// After line 49, add:
import { isValidImageExtension } from '@/lib/storage/images';

// ... in POST handler, after required fields check:

// Validate file extension
if (!isValidImageExtension(fileName)) {
  return NextResponse.json(
    { error: 'Invalid file extension. Allowed: .jpg, .jpeg, .png, .gif, .webp' },
    { status: 400 }
  );
}
```

### Verification

```bash
# Test with invalid extension
curl -X POST http://localhost:3000/api/upload/image \
  -H "Content-Type: application/json" \
  -H "Cookie: <auth-cookie>" \
  -d '{"fileName":"test.exe","contentType":"image/png","fileSize":1000}'
# Expected: 400 with "Invalid file extension" error

# Test with valid extension
curl -X POST http://localhost:3000/api/upload/image \
  -H "Content-Type: application/json" \
  -H "Cookie: <auth-cookie>" \
  -d '{"fileName":"test.png","contentType":"image/png","fileSize":1000}'
# Expected: 200 with uploadUrl
```

---

## Issue 2: Path Traversal Vulnerability (CRITICAL)

**File:** `src/lib/storage/images.ts`
**Line:** 76

### Problem

The filename sanitization regex `/[^a-zA-Z0-9.-]/g` allows `.` and `-` characters, which means `..` patterns pass through. An attacker could craft a filename like `../../../etc/passwd.png` to attempt path traversal.

### Current Code (line 76)

```typescript
const safeName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
```

**Attack Vector:** `../../malicious.png` becomes `../../malicious.png` (unchanged).

### Fixed Code

Replace with a robust sanitization function:

```typescript
/**
 * Sanitize filename to prevent path traversal attacks
 * - Removes all path separators (/, \)
 * - Removes .. patterns
 * - Keeps only alphanumeric, single dots, hyphens, underscores
 * - Preserves file extension
 */
function sanitizeFileName(fileName: string): string {
  // Extract just the filename (remove any path components)
  const baseName = fileName.split(/[/\\]/).pop() || 'file';

  // Remove any .. patterns (path traversal attempts)
  const noDotDot = baseName.replace(/\.\./g, '');

  // Keep only safe characters, but preserve single dots for extension
  // Replace unsafe chars with underscore
  const safeName = noDotDot.replace(/[^a-zA-Z0-9._-]/g, '_');

  // Collapse multiple consecutive dots/underscores (prevents ..__ bypasses)
  const collapsed = safeName.replace(/\.{2,}/g, '.').replace(/_{2,}/g, '_');

  // Ensure we have a valid filename
  return collapsed || 'file';
}
```

Then update line 76:

```typescript
// OLD:
const safeName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');

// NEW:
const safeName = sanitizeFileName(fileName);
```

### Complete Function Placement

Add the `sanitizeFileName` helper function above `getImageUploadUrl` (around line 38-50):

```typescript
// After isAllowedImageType function, before getImageUploadUrl

/**
 * Sanitize filename to prevent path traversal attacks
 */
function sanitizeFileName(fileName: string): string {
  // Extract just the filename (remove any path components)
  const baseName = fileName.split(/[/\\]/).pop() || 'file';

  // Remove any .. patterns (path traversal attempts)
  const noDotDot = baseName.replace(/\.\./g, '');

  // Keep only safe characters, but preserve single dots for extension
  const safeName = noDotDot.replace(/[^a-zA-Z0-9._-]/g, '_');

  // Collapse multiple consecutive dots/underscores
  const collapsed = safeName.replace(/\.{2,}/g, '.').replace(/_{2,}/g, '_');

  return collapsed || 'file';
}
```

### Verification

```typescript
// Unit test cases to add
describe('sanitizeFileName', () => {
  it('removes path traversal patterns', () => {
    expect(sanitizeFileName('../../../etc/passwd.png')).toBe('etc_passwd.png');
    expect(sanitizeFileName('..\\..\\windows\\system32.png')).toBe('system32.png');
  });

  it('handles normal filenames', () => {
    expect(sanitizeFileName('my-image.png')).toBe('my-image.png');
    expect(sanitizeFileName('photo_2024.jpg')).toBe('photo_2024.jpg');
  });

  it('removes unsafe characters', () => {
    expect(sanitizeFileName('file<script>.png')).toBe('file_script_.png');
  });

  it('handles edge cases', () => {
    expect(sanitizeFileName('')).toBe('file');
    expect(sanitizeFileName('....')).toBe('.');
  });
});
```

---

## Issue 3: Missing Rate Limiting on Image Upload (HIGH)

**File:** `src/app/api/upload/image/route.ts`
**Lines:** 22-30 (add after auth check)

### Problem

The image upload endpoint has no rate limiting. The PDF upload endpoint (`src/app/api/upload/route.ts`) correctly uses rate limiting, but the image endpoint does not.

### Current Code (lines 22-30)

```typescript
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body - NO RATE LIMITING
```

### Fixed Code

Add rate limiting after authentication (following the same pattern as `src/app/api/upload/route.ts`):

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getImageUploadUrl,
  isValidImageExtension,  // Add this import
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_SIZE,
} from '@/lib/storage/images';
import { checkRateLimit, rateLimitHeaders, RATE_LIMITS } from '@/lib/rate-limit';

// Add image-specific rate limit to RATE_LIMITS in rate-limit.ts:
// imageUpload: { limit: 20, windowSeconds: 3600 }, // 20 images per hour

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting: 20 image uploads per hour per user
    const rateLimitResult = checkRateLimit(
      `image-upload:${session.user.id}`,
      { limit: 20, windowSeconds: 3600 }
    );

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: 'Too many image uploads. Please try again later.',
          retryAfter: rateLimitResult.resetAt - Math.floor(Date.now() / 1000),
        },
        {
          status: 429,
          headers: rateLimitHeaders(rateLimitResult),
        }
      );
    }

    // ... rest of handler
```

### Update rate-limit.ts

**File:** `src/lib/rate-limit.ts`
**Lines:** 125-132

Add image upload rate limit to the `RATE_LIMITS` object:

```typescript
export const RATE_LIMITS = {
  /** Upload: 10 files per hour per user */
  upload: { limit: 10, windowSeconds: 3600 },
  /** Image upload: 20 images per hour per user (more lenient for question images) */
  imageUpload: { limit: 20, windowSeconds: 3600 },
  /** API general: 100 requests per minute */
  apiGeneral: { limit: 100, windowSeconds: 60 },
  /** Auth attempts: 5 per 15 minutes */
  auth: { limit: 5, windowSeconds: 900 },
} as const;
```

### Verification

```bash
# Test rate limiting (run 21+ times rapidly)
for i in {1..25}; do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -X POST http://localhost:3000/api/upload/image \
    -H "Content-Type: application/json" \
    -H "Cookie: <auth-cookie>" \
    -d '{"fileName":"test.png","contentType":"image/png","fileSize":1000}'
done
# Expected: First 20 return 200, then 429 for remaining
```

---

## Issue 4: IDOR Risk in Quiz Attempt Access (HIGH)

**File:** `src/actions/attempts.ts`
**Lines:** 45-48, 102-104, 183-185, 240-242

### Problem

The current access control only allows the document owner (teacher) to access attempts. When students are added in the future, the current check `quiz.document.uploadedById !== session.user.id` will be insufficient and could lead to IDOR (Insecure Direct Object Reference) vulnerabilities.

**Current state:** Safe for teachers-only workflow
**Future risk:** When students join, need role-based access control

### Current Code Pattern (repeated in multiple functions)

```typescript
// startAttempt (line 45-48)
if (quiz.document.uploadedById !== session.user.id) {
  return { error: 'Access denied' };
}

// submitAnswer (line 102-104)
if (!attempt || attempt.userId !== session.user.id) {
  return { error: 'Attempt not found' };
}
```

### Fixed Code - Add Role-Based Access Helper

Add a helper function at the top of the file (after imports, around line 20):

```typescript
/**
 * Check if user has access to a quiz
 *
 * Access rules:
 * - Quiz creator (teacher) always has access
 * - Document owner always has access
 * - Future: Students enrolled in the quiz's class will have access
 *
 * @returns true if user has access, false otherwise
 */
async function canAccessQuiz(
  userId: string,
  quizId: string
): Promise<{ allowed: boolean; quiz: Awaited<ReturnType<typeof prisma.quiz.findUnique>> | null }> {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      document: {
        select: { uploadedById: true },
      },
      // Future: include enrollments or class membership
    },
  });

  if (!quiz) {
    return { allowed: false, quiz: null };
  }

  // Teacher/owner access
  const isOwner = quiz.document.uploadedById === userId;
  const isCreator = quiz.createdById === userId;

  // Future: Add student enrollment check here
  // const isEnrolledStudent = quiz.enrollments?.some(e => e.userId === userId);

  const allowed = isOwner || isCreator; // || isEnrolledStudent

  return { allowed, quiz };
}

/**
 * Check if user owns an attempt (for answer submission)
 */
function ownsAttempt(attempt: { userId: string } | null, userId: string): boolean {
  return attempt !== null && attempt.userId === userId;
}
```

### Update startAttempt Function

```typescript
export async function startAttempt(quizId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Unauthorized' };
  }

  // Use centralized access check
  const { allowed, quiz } = await canAccessQuiz(session.user.id, quizId);

  if (!quiz) {
    return { error: 'Quiz not found' };
  }

  if (!allowed) {
    return { error: 'Access denied' };
  }

  // ... rest of function unchanged
```

### Add TODO Comments for Future Implementation

In places where student access will need to be added:

```typescript
// In canAccessQuiz:
// TODO(IDOR-FUTURE): When implementing student features, add enrollment check:
// - Check if user is enrolled in the class/course associated with this quiz
// - Check if quiz is published and within access window
// - Consider time-based access (quiz open/close dates)
```

### Verification

```typescript
// Test cases
describe('canAccessQuiz', () => {
  it('allows quiz creator access', async () => {
    const { allowed } = await canAccessQuiz(creatorUserId, quizId);
    expect(allowed).toBe(true);
  });

  it('allows document owner access', async () => {
    const { allowed } = await canAccessQuiz(documentOwnerId, quizId);
    expect(allowed).toBe(true);
  });

  it('denies random user access', async () => {
    const { allowed } = await canAccessQuiz(randomUserId, quizId);
    expect(allowed).toBe(false);
  });

  it('returns null quiz for non-existent quiz', async () => {
    const { quiz } = await canAccessQuiz(anyUserId, 'non-existent');
    expect(quiz).toBeNull();
  });
});
```

---

## Implementation Order

1. **Issue 2 (Path Traversal)** - Fix first, most critical
2. **Issue 1 (Extension Validation)** - Fix second, complements Issue 2
3. **Issue 3 (Rate Limiting)** - Add after validation fixes
4. **Issue 4 (IDOR)** - Refactor last, lower immediate risk

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/storage/images.ts` | Add `sanitizeFileName()`, call `isValidImageExtension()` |
| `src/app/api/upload/image/route.ts` | Add rate limiting, add extension validation |
| `src/lib/rate-limit.ts` | Add `imageUpload` to `RATE_LIMITS` |
| `src/actions/attempts.ts` | Add `canAccessQuiz()` helper, refactor access checks |

## Testing Checklist

- [ ] Path traversal: `../` patterns rejected
- [ ] Extension validation: `.exe`, `.php` rejected; `.png`, `.jpg` accepted
- [ ] Rate limiting: 429 after 20 image uploads
- [ ] Access control: Non-owner cannot access quiz attempts
- [ ] Existing functionality: Normal uploads still work

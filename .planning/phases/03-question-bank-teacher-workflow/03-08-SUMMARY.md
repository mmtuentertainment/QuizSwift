---
phase: 03-question-bank-teacher-workflow
plan: 08
title: "Image Upload Support"
subsystem: storage
tags: [r2, images, upload, presigned-url]

# Dependency tracking
dependency-graph:
  requires:
    - "03-01" # Question type system
  provides:
    - "ImageUpload component"
    - "Image presigned URL generation"
    - "CuratedQuestion.imageUrl field"
  affects:
    - "Future question editing forms"
    - "Quiz rendering with images"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Direct client-to-R2 upload via presigned URLs"
    - "Client-side validation before upload"
    - "Drag-and-drop file handling"

# File tracking
key-files:
  created:
    - src/lib/storage/images.ts
    - src/app/api/upload/image/route.ts
    - src/components/questions/image-upload.tsx
  modified:
    - prisma/schema.prisma
    - src/components/questions/index.ts

# Decisions
decisions:
  - id: "03-08-01"
    description: "Presigned PUT for direct upload"
    rationale: "Avoids server as middleman, reduces bandwidth costs"
  - id: "03-08-02"
    description: "5MB max image size"
    rationale: "Balance between quality and storage costs"
  - id: "03-08-03"
    description: "Local constants in client component"
    rationale: "Avoid server imports in 'use client' components"

# Metrics
metrics:
  duration: "4 min"
  completed: "2026-01-26"
---

# Phase 3 Plan 08: Image Upload Support Summary

**One-liner:** R2 image uploads for questions via presigned URLs with client validation and preview

## What Was Built

### Schema Extension
Added image support fields to CuratedQuestion:
- `imageUrl`: R2 storage key for question image
- `imageAltText`: Accessibility alt text

### Image Upload Utilities (`src/lib/storage/images.ts`)
- `getImageUploadUrl()`: Generate presigned PUT URL for uploads
- `getImageDownloadUrl()`: Generate presigned GET URL for viewing
- `getImagePublicUrl()`: Get public URL if R2 bucket is public
- Validation for JPEG, PNG, GIF, WebP types
- 5MB max file size enforcement
- Storage path: `questions/images/{userId}/{timestamp}-{filename}`

### Image Upload API (`src/app/api/upload/image/route.ts`)
- POST endpoint returns presigned URL and storage key
- Server-side validation (duplicate of client for security)
- Authentication required (uses session.user.id)

### ImageUpload Component (`src/components/questions/image-upload.tsx`)
- File input with drag-and-drop support
- Instant preview using FileReader
- Upload progress indication
- Remove button with confirmation
- Error display for validation failures
- Disabled state support

## Commits

| Commit | Description | Files |
|--------|-------------|-------|
| 4d5d8eb | Add imageUrl field to CuratedQuestion | prisma/schema.prisma |
| 4ec9754 | Create image upload utilities | src/lib/storage/images.ts |
| e0086df | Create image upload API and component | src/app/api/upload/image/route.ts, image-upload.tsx, index.ts |

## Verification Results

| Check | Status |
|-------|--------|
| `npx prisma db push` | PASSED |
| `npx tsc --noEmit` | PASSED (pre-existing error in quiz-taker.tsx unrelated) |
| Image endpoint validates type | PASSED |
| Image endpoint validates size | PASSED |
| ImageUpload shows preview | PASSED |
| ImageUpload exported from barrel | PASSED |

## Deviations from Plan

None - plan executed exactly as written.

## Usage Example

```tsx
import { ImageUpload } from '@/components/questions';

function QuestionForm() {
  const [imageKey, setImageKey] = useState<string | null>(null);

  return (
    <ImageUpload
      currentImageUrl={imageKey}
      onUpload={(key) => setImageKey(key)}
      onRemove={() => setImageKey(null)}
    />
  );
}
```

## Next Phase Readiness

**Dependencies satisfied:**
- Image upload infrastructure complete
- Ready for question editing forms to use ImageUpload
- R2 storage path established for question images

**Integration points:**
- Question edit forms should include ImageUpload
- Question display should fetch presigned URLs for images
- Consider lazy loading for images in quiz view

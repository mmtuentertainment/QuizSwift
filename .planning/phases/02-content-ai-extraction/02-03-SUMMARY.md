---
phase: 02-content-ai-extraction
plan: 03
subsystem: background-processing
tags: [inngest, openai, embeddings, ai-sdk, pdf-pipeline, vector-search]

# Dependency graph
requires:
  - phase: 02-content-ai-extraction/02-01
    provides: Document model, SourceChunk model with embedding field, upload API
  - phase: 02-content-ai-extraction/02-02
    provides: PDF extraction, OCR, chunking utilities
provides:
  - Inngest client configuration with typed events
  - Multi-step PDF processing pipeline function
  - Embedding generation utilities (embedText, embedBatch, toVectorString)
  - Inngest webhook handler at /api/inngest
  - Document status transitions (pending -> processing -> extracting)
  - SourceChunk records with embeddings for vector search
affects: [02-04, 03-question-extraction, vector-similarity-search]

# Tech tracking
tech-stack:
  added: [inngest@3.49.3, ai@6.0.49, @ai-sdk/openai@3.0.18]
  patterns: [inngest-multi-step-functions, dynamic-imports-for-heavy-modules, batch-embeddings]

key-files:
  created:
    - src/inngest/client.ts
    - src/inngest/functions/process-pdf.ts
    - src/inngest/functions/index.ts
    - src/inngest/types.ts
    - src/app/api/inngest/route.ts
    - src/lib/ai/embed.ts
  modified:
    - .env.local.example

key-decisions:
  - "Dynamic imports for PDF modules to avoid DOMMatrix error at build time"
  - "text-embedding-3-small model (1536 dimensions) for chunk embeddings"
  - "Raw SQL for inserting embeddings due to Prisma vector type limitations"
  - "Inngest onFailure handler extracts documentId from nested event structure"

patterns-established:
  - "Dynamic import for modules using browser-only APIs (pdfjs-dist)"
  - "Inngest step functions for long-running processes"
  - "Batch embedding generation with AI SDK"

# Metrics
duration: 8min
completed: 2026-01-23
---

# Phase 2 Plan 03: Inngest Background Processing Summary

**Inngest multi-step PDF processing pipeline with text extraction, OCR, chunking, and OpenAI embeddings for vector similarity search**

## Performance

- **Duration:** 8 min
- **Started:** 2026-01-23T23:00:00Z
- **Completed:** 2026-01-23T23:08:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Full Inngest client configuration replacing the stub from 02-01
- Multi-step PDF processing pipeline with 9 steps for reliable background processing
- Embedding utilities using OpenAI text-embedding-3-small (1536 dimensions)
- Document status transitions through processing stages
- SourceChunk records populated with embeddings for vector similarity search

## Task Commits

Each task was committed atomically:

1. **Task 1: Set up Inngest client, webhook handler, and embedding utilities** - `8bde356` (feat)
2. **Task 2: Implement multi-step PDF processing pipeline with OCR and embeddings** - `25a43c0` (feat)

## Files Created/Modified

- `src/inngest/client.ts` - Full Inngest client with typed event definitions (PdfUploadedEvent, PdfProcessingCompleteEvent, PdfProcessingFailedEvent)
- `src/inngest/functions/process-pdf.ts` - 9-step pipeline: status update, text extraction, OCR analysis, OCR processing, page count, chunking, embedding generation, chunk storage, final status
- `src/inngest/functions/index.ts` - Re-export of processPdf function
- `src/inngest/types.ts` - Type re-exports for external use
- `src/app/api/inngest/route.ts` - Inngest webhook handler with GET/POST/PUT exports
- `src/lib/ai/embed.ts` - embedText, embedBatch, cosineSimilarity, toVectorString utilities
- `.env.local.example` - Added INNGEST_EVENT_KEY, INNGEST_SIGNING_KEY, OPENAI_API_KEY

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Dynamic imports for PDF modules | pdfjs-dist references DOMMatrix (browser API) causing build errors; dynamic import defers evaluation to runtime |
| text-embedding-3-small (1536 dims) | Matches pgvector column size from 02-01; good balance of quality and cost |
| Raw SQL for vector inserts | Prisma doesn't natively support vector type in createMany; raw SQL allows direct ::vector cast |
| onFailure nested event access | Inngest v3 wraps original event in failure handler; access via event.data.event |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] DOMMatrix build error from pdfjs-dist**
- **Found during:** Task 2 (Build verification)
- **Issue:** pdfjs-dist imports reference DOMMatrix which doesn't exist in Node.js, causing build failure
- **Fix:** Changed static imports to dynamic imports for all PDF processing modules
- **Files modified:** src/inngest/functions/process-pdf.ts
- **Verification:** Build passes
- **Committed in:** 25a43c0

**2. [Rule 3 - Blocking] Inngest onFailure event type mismatch**
- **Found during:** Task 2 (Build verification)
- **Issue:** onFailure handler receives wrapped event, not original event type
- **Fix:** Cast event.data.event to access original event data with documentId
- **Files modified:** src/inngest/functions/process-pdf.ts
- **Verification:** Build passes
- **Committed in:** 25a43c0

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both fixes necessary for TypeScript compilation. No scope creep.

## Issues Encountered

None beyond the auto-fixed blocking issues.

## User Setup Required

**External services require manual configuration:**

1. **Inngest Configuration:**
   - Sign up at https://inngest.com
   - Create new app or use existing
   - Get Event Key from Dashboard -> API Keys -> Create Event Key
   - Get Signing Key from Dashboard -> API Keys -> Signing Key
   - Add to `.env.local`:
     ```
     INNGEST_EVENT_KEY=your-event-key
     INNGEST_SIGNING_KEY=your-signing-key
     ```

2. **OpenAI API Key:**
   - Get API key from https://platform.openai.com/api-keys
   - Add to `.env.local`:
     ```
     OPENAI_API_KEY=sk-...
     ```

3. **Verification:**
   - Start dev server: `npm run dev`
   - Visit http://localhost:3000/api/inngest to see Inngest dashboard
   - Upload a PDF to trigger the pipeline

## Next Phase Readiness

- Inngest pipeline complete for PDF -> chunks -> embeddings
- Ready for Plan 02-04 (AI question extraction) to listen for pdf/processing.complete events
- SourceChunks with embeddings available for RAG retrieval
- Document status properly tracks pipeline progress

---
*Phase: 02-content-ai-extraction*
*Completed: 2026-01-23*

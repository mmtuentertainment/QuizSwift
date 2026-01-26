---
phase: 02-content-ai-extraction
plan: 04
subsystem: ai
tags: [ai, openai, ollama, extraction, grounding, verification, inngest, zod]

# Dependency graph
requires:
  - phase: 02-03
    provides: Inngest pipeline, chunk embeddings, PDF processing infrastructure
provides:
  - Dual-tier AI provider configuration (Ollama/OpenAI)
  - Structured question extraction with Zod schema
  - Grounding verification using vector similarity
  - Complete extraction pipeline with flag-not-reject behavior
affects: [03-question-bank, 06-grading, 08-dual-tier]

# Tech tracking
tech-stack:
  added: [ollama-ai-provider@1.2.0, zod@3.25.76]
  patterns: [dual-tier-providers, structured-output, vector-similarity-grounding, flag-not-reject]

key-files:
  created:
    - src/lib/ai/providers.ts
    - src/lib/ai/extract-questions.ts
    - src/lib/ai/verify-grounding.ts
    - src/lib/ai/index.ts
    - src/inngest/functions/extract-questions.ts
  modified:
    - src/lib/ai/embed.ts
    - src/inngest/functions/index.ts
    - src/app/api/inngest/route.ts
    - .env.local.example
    - package.json

key-decisions:
  - "Use any type for AI models due to Ollama V1 and OpenAI V3 provider version incompatibility"
  - "GROUNDING_THRESHOLD = 0.85, WARNING_THRESHOLD = 0.75 for verification tiers"
  - "Flag-not-reject: ALL questions stored, flagged ones have flagReason for teacher review"
  - "Refactor embed.ts to use centralized providers.ts for consistency"

patterns-established:
  - "Dual-tier AI: getExtractionModel(tier) returns Ollama for free, OpenAI for paid"
  - "Structured extraction: Zod schema with generateObject for type-safe LLM output"
  - "Grounding verification: Vector similarity search with text-based fallback"
  - "Flag-not-reject: Never delete extracted content, always flag for human review"

# Metrics
duration: 25min
completed: 2026-01-23
---

# Phase 2 Plan 4: AI Question Extraction Summary

**Dual-tier AI extraction pipeline with Zod structured output, pgvector grounding verification, and flag-not-reject question storage**

## Performance

- **Duration:** 25 min
- **Started:** 2026-01-23T10:00:00Z
- **Completed:** 2026-01-23T10:25:00Z
- **Tasks:** 3
- **Files modified:** 9

## Accomplishments
- Dual-tier AI provider configuration supporting free (Ollama) and paid (OpenAI) tiers
- Structured question extraction using Zod schema with generateObject for type-safe LLM responses
- Grounding verification using pgvector similarity search against pre-computed chunk embeddings
- Complete Inngest extraction pipeline triggered by pdf/processing.complete event
- Flag-not-reject behavior: ALL questions stored, flagged ones have flagReason for teacher review

## Task Commits

Each task was committed atomically:

1. **Task 1: Set up AI providers and question extraction** - `b8b6086` (feat)
2. **Task 2: Implement grounding verification using chunk embeddings** - `951e320` (feat)
3. **Task 3: Create Inngest function for AI extraction** - `679013a` (feat)

## Files Created/Modified
- `src/lib/ai/providers.ts` - Dual-tier AI provider configuration with getExtractionModel and getEmbeddingModel
- `src/lib/ai/extract-questions.ts` - Question extraction with Zod schema and extraction-only prompt
- `src/lib/ai/verify-grounding.ts` - Grounding verification with vector similarity and text fallback
- `src/lib/ai/index.ts` - Consolidated AI exports
- `src/lib/ai/embed.ts` - Refactored to use centralized providers
- `src/inngest/functions/extract-questions.ts` - Full extraction pipeline with flag-not-reject
- `src/inngest/functions/index.ts` - Added extractQuestionsJob export
- `src/app/api/inngest/route.ts` - Registered extractQuestionsJob function
- `.env.local.example` - Added Ollama configuration comments

## Decisions Made
- **Any type for AI models:** Ollama provider uses @ai-sdk/provider@1.x (V1 types) while OpenAI uses @ai-sdk/provider@3.x (V3 types). Used any return type for compatibility - both work at runtime.
- **Grounding thresholds:** GROUNDING_THRESHOLD = 0.85 (verified), WARNING_THRESHOLD = 0.75 (weak/flagged)
- **Flag-not-reject pattern:** Per CONT-05 clarification, "reject" means flagged=true not deleted. Teachers see all questions with warnings on flagged ones.
- **Centralized providers:** Refactored embed.ts to use providers.ts for consistent tier handling

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed AI provider type incompatibility**
- **Found during:** Task 1 (AI providers setup)
- **Issue:** ollama-ai-provider returns LanguageModelV1, @ai-sdk/openai returns LanguageModelV3 - type mismatch
- **Fix:** Used `any` return type with eslint-disable comment, both compatible at runtime
- **Files modified:** src/lib/ai/providers.ts
- **Verification:** Build passes, model works with generateObject
- **Committed in:** b8b6086 (Task 1 commit)

**2. [Rule 3 - Blocking] Fixed Tier type duplication**
- **Found during:** Task 1 (AI index exports)
- **Issue:** Both providers.ts and embed.ts exported Tier type causing conflict
- **Fix:** Refactored embed.ts to import Tier and getEmbeddingModel from providers.ts
- **Files modified:** src/lib/ai/embed.ts
- **Verification:** No duplicate export errors, build passes
- **Committed in:** b8b6086 (Task 1 commit)

**3. [Rule 3 - Blocking] Fixed Ollama embeddingModel method name**
- **Found during:** Task 1 (build verification)
- **Issue:** Ollama provider uses textEmbeddingModel not embeddingModel
- **Fix:** Changed ollama.embeddingModel to ollama.textEmbeddingModel
- **Files modified:** src/lib/ai/providers.ts
- **Verification:** Build passes
- **Committed in:** b8b6086 (Task 1 commit)

**4. [Rule 1 - Bug] Fixed Prisma Json null handling**
- **Found during:** Task 3 (extraction function)
- **Issue:** Prisma Json type rejects null for nullable fields, requires undefined
- **Fix:** Used nullish coalescing (question.options ?? undefined)
- **Files modified:** src/inngest/functions/extract-questions.ts
- **Verification:** Build passes, options stored correctly
- **Committed in:** 679013a (Task 3 commit)

---

**Total deviations:** 4 auto-fixed (3 blocking, 1 bug)
**Impact on plan:** All auto-fixes were necessary for correct operation. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviations above.

## User Setup Required

**External services require manual configuration:**

**OpenAI (required for paid tier and embeddings):**
- Get API key from OpenAI Dashboard -> API Keys -> Create new secret key
- Add to .env.local: `OPENAI_API_KEY=sk-...`

**Ollama (optional for free tier local AI):**
- Install from https://ollama.ai/download
- Run: `ollama pull llama3.1`
- Run: `ollama pull nomic-embed-text` (for embeddings)
- Ollama runs on localhost:11434 by default

## Next Phase Readiness
- AI extraction pipeline complete: upload -> process -> extract -> complete
- Questions stored with verification scores and flags
- Ready for Phase 3: Question Bank & Teacher Workflow
- Teachers can review flagged questions and approve/edit/delete

---
*Phase: 02-content-ai-extraction*
*Completed: 2026-01-23*

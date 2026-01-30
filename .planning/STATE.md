# Project State: QuizSwift

**Last Updated:** 2026-01-30
**Session:** Quick Task 005 Complete - Fix 13 HIGH Priority CodeRabbit Issues

## Project Reference

**Core Value:** 100% factual accuracy - every question extracted from source material, never generated

**Current Focus:** Phase 3 - Question Bank & Teacher Workflow (Plan 06 of 9 complete)

## Current Position

**Phase:** 3 of 8 - Question Bank & Teacher Workflow
**Plan:** 8 of 9 complete (01, 02, 03, 04, 05, 06, 07, 08)
**Status:** In progress
**Last activity:** 2026-01-30 - Completed quick-005: Fix 13 HIGH Priority CodeRabbit Issues (PR #4)

**Progress:**
Phase 1: 100% (5/5 plans)   [========================================]
Phase 2: 100% (4/4 plans)   [========================================]
Phase 2.1: 100% (6/6 plans) [========================================]
Phase 3: 89% (8/9 plans)    [====================================    ]
Overall: 64%                [==================================      ]

**Phases Overview:**
| Phase | Name | Status | Plans |
|-------|------|--------|-------|
| 1 | Foundation & Compliance | COMPLETE | 5/5 |
| 2 | Content & AI Extraction | COMPLETE | 4/4 |
| 2.1 | Intelligent Question Curation | COMPLETE | 6/6 |
| 3 | Question Bank & Teacher Workflow | In Progress | 8/9 |
| 4 | Quiz Delivery & Student Experience | Pending | - |
| 5 | Anti-Cheating & Randomization | Pending | - |
| 6 | Grading & Analytics | Pending | - |
| 7 | Google Classroom Integration | Pending | - |
| 8 | Dual-Tier AI & Polish | Pending | - |

## Performance Metrics

**Session Stats:**
- Plans completed: 1 (03-06)
- Tasks completed: 3
- Duration: 10 min

**Cumulative Stats:**
- Total phases: 8 (+ 2.1 sub-phase)
- Plans completed: 23/36+ (approximate)

## Accumulated Context

### Key Decisions

| Decision | Rationale | Phase |
|----------|-----------|-------|
| Compliance-first architecture | COPPA/FERPA not retrofittable, privacy-by-design required | 1 |
| Extraction-only AI (no generation) | Core differentiator, eliminates hallucination risk | 2 |
| Any type for AI models | Ollama V1 and OpenAI V3 provider versions incompatible | 2-04 |
| Grounding thresholds 0.85/0.75 | Balances accuracy vs recall for verification | 2-04 |
| Flag-not-reject pattern | ALL questions stored, flagged ones have flagReason | 2-04 |
| 5-pass sequential AI pipeline | Each pass builds on previous for holistic understanding | 2.1-03 |
| 2x question generation | Generate double for selection flexibility | 2.1-03 |
| Separate CuratedQuestion model | Parallel systems during transition without data migration | 2.1-04 |
| Event-based routing | pdf/curation.ready vs pdf/processing.complete for clean separation | 2.1-04 |
| Discriminated unions with type field | Runtime type checking for 6 question types | 03-01 |
| Legacy type aliases | Backward compatibility during refactor to new types | 03-01 |
| Component-local option types | Avoid circular dependencies with lib types in question components | 03-02 |
| Position-based matching | left[i] matches right[i] - simple alignment after reorder | 03-03 |
| Shuffle on initial render | Fair quiz-taking by randomizing right column | 03-03 |
| URL-based filter state | Bookmarkable, shareable, browser back button works | 03-07 |
| teacherSelected filter in bank | Question bank shows curated picks, not full 2x pool | 03-07 |
| Presigned PUT for direct upload | Avoids server as middleman, reduces bandwidth costs | 03-08 |
| 5MB max image size | Balance between quality and storage costs | 03-08 |
| Local constants in client component | Avoid server imports in use client components | 03-08 |
| Answer format conversion functions | Bridge QuestionRenderer and grading library formats | 03-05 |
| Partial credit = (correct/total) * max | Simple proportional scoring for fill-in-blank and matching | 03-05 |
| Teacher preview via real QuizAttempt | Reuses quiz-taking flow for realistic experience | 03-05 |
| CONT-06 enforcement via server action | publishQuiz checks teacherPreviewedAt before allowing publish | 03-06 |
| Modal pattern for question editing | QuestionEditor as overlay maintains quiz context | 03-06 |
| Discriminated union Zod schemas | Type-safe validation matching TypeScript types for QuestionOptions | quick-003 |
| Upsert pattern for race conditions | Prevents duplicate quiz attempts with compound unique keys | quick-003 |
| Pagination input clamping | page >= 1, limit 1-100, offset >= 0 prevents performance issues | quick-003 |
| pdf-storage.ts naming | Renamed from blob.ts to eliminate Vercel Blob confusion | quick-003 |

### Roadmap Evolution

| Phase | Type | Description | Date |
|-------|------|-------------|------|
| 3.1 | INSERTED | Convert Prisma Status Fields to Enums - address tech debt identified in PR review | 2026-01-27 |
| 3.2 | INSERTED | Centralize QuestionType Definition - single source of truth for type safety | 2026-01-27 |

### Technical Stack

- **Framework:** Next.js 16.1.4 + TypeScript 5 + React 19.2.3
- **Database:** PostgreSQL + Prisma 7.3.0 with PrismaPg adapter + pgvector
- **AI:** OpenAI via Vercel AI SDK + ollama-ai-provider@1.2.0
- **Background Jobs:** Inngest 3.49.3
- **Structured Output:** Zod 3.25.76 for AI schema validation
- **Drag-and-Drop:** @dnd-kit/core@6.3.1, @dnd-kit/sortable@10.0.0, @dnd-kit/utilities@3.2.2
- **Storage:** Cloudflare R2 via @aws-sdk/client-s3 + @aws-sdk/s3-request-presigner

### Patterns Established (03-02, 03-03, 03-05, 03-06, 03-07, 03-08)

- QuestionRenderer switch pattern for dispatching to type-specific components
- Consistent props interface: options, answer/value, onChange, readOnly, showCorrect
- LaTeX support via MathText in all question types
- SortableItem pattern with useSortable hook for accessible drag-and-drop
- Server actions pattern for authenticated data fetching (src/actions/)
- URL searchParams for filter state management
- Direct client-to-R2 upload via presigned URLs pattern
- Answer format conversion between renderer and library types
- Auto-grading with partial credit for objective question types
- Modal editor pattern: QuestionEditor with isOpen/onClose/onSave props
- Quiz status workflow: draft -> preview_required -> published

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 001 | Phase 3 tech debt audit | 2026-01-26 | dfc96e2 | [001-audit-phase-3-tech-debt](./quick/001-audit-phase-3-tech-debt/) |
| 002 | Fix CodeRabbit AI configuration | 2026-01-26 | dba0688 | [002-fix-coderabbit-config](./quick/002-fix-coderabbit-config/) |
| 003 | Fix CodeRabbit PR #2 review issues (26 fixes) | 2026-01-27 | bdde6e2 | [003-fix-pr2-coderabbit-review](./quick/003-fix-pr2-coderabbit-review/) |
| 004 | Fix 5 silent failure issues in server actions | 2026-01-27 | 0b26ddd | [004-fix-pr2-silent-failures](./quick/004-fix-pr2-silent-failures/) |
| 005 | Fix 13 HIGH priority CodeRabbit issues (PR #4) | 2026-01-30 | a05c4f7 | [005-fix-high-priority-coderabbit-issues](./quick/005-fix-high-priority-coderabbit-issues/) |

### Lessons Learned

- AI provider version incompatibility: ollama uses V1, @ai-sdk/openai uses V3 - use any type
- Ollama provider uses textEmbeddingModel not embeddingModel method
- Prisma Json type requires undefined not null for nullable fields
- Prisma schema validation requires all related models to exist before validation passes
- dnd-kit provides excellent React 19 compatibility and keyboard accessibility out of the box
- useSearchParams + router.push pattern enables URL-based filter state
- Client components cannot import server-only modules - duplicate constants locally
- ShowYourWorkData includes Blob which cannot be JSON serialized - use null when restoring

## Session Continuity

### What Just Happened

Completed Quick Task 005 - Fix 13 HIGH Priority CodeRabbit Issues (PR #4):

**Issues fixed:**
1. `.claude/settings.json` - Fixed npm permission patterns (colon-wildcards → suffix wildcards)
2. `package.json` - Added @vitest/coverage-v8 devDependency
3. `vitest.config.ts` - Fixed Windows path with fileURLToPath
4. `src/actions/questions.ts` - Imported centralized schema from validation.ts
5. `src/actions/questions.ts` - Added options.type mismatch validation guard
6. `src/components/question-bank/question-editor.tsx` - Added useEffect to sync form state
7. `src/components/question-bank/question-editor.tsx` - Added ARIA dialog semantics + ESC key
8. `src/components/questions/image-upload.tsx` - Added useEffect to sync preview state
9. `src/components/questions/types/matching.tsx` - Added useEffect to sync rightOrder
10. `src/components/quiz/quiz-taker.tsx` - Return empty arrays instead of null
11. `src/lib/questions/grading.ts` - Fixed duplicate match scoring with canonical Map
12. `src/lib/questions/types.ts` - Added CANONICAL_QUESTION_TYPES + normalizeQuestionType
13. `src/lib/questions/validation.ts` - Added short_answer to discriminated union

**Commits:**
- d74f86c: fix(quick-005): fix config and tooling issues
- ec00cb0: fix(quick-005): fix 12 HIGH priority CodeRabbit issues
- a494aff: docs(quick-005): add planning files for CodeRabbit HIGH issues fix

### What Happens Next

Quick task 005 is COMPLETE.

Next steps:
- Complete Phase 3 Plan 09 (final plan)
- Or proceed to Phase 4: Quiz Delivery & Student Experience

---

*State captured: 2026-01-30*
*Next command: /gsd:execute-phase 3 plan 09 or /gsd:progress*

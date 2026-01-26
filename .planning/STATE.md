# Project State: QuizSwift

**Last Updated:** 2026-01-26
**Session:** Phase 3 Plan 01 Complete - Quiz Workflow Models

## Project Reference

**Core Value:** 100% factual accuracy - every question extracted from source material, never generated

**Current Focus:** Phase 3 - Question Bank & Teacher Workflow (Plan 01 of 9 complete)

## Current Position

**Phase:** 3 of 8 - Question Bank & Teacher Workflow
**Plan:** 1 of 9 complete
**Status:** In progress
**Last activity:** 2026-01-26 - Completed 03-01-PLAN.md (Quiz workflow models)

**Progress:**
Phase 1: 100% (5/5 plans)   [========================================]
Phase 2: 100% (4/4 plans)   [========================================]
Phase 2.1: 100% (6/6 plans) [========================================]
Phase 3: 11% (1/9 plans)    [====                                    ]
Overall: 45%                [============================            ]

**Phases Overview:**
| Phase | Name | Status | Plans |
|-------|------|--------|-------|
| 1 | Foundation & Compliance | COMPLETE | 5/5 |
| 2 | Content & AI Extraction | COMPLETE | 4/4 |
| 2.1 | Intelligent Question Curation | COMPLETE | 6/6 |
| 3 | Question Bank & Teacher Workflow | In Progress | 1/9 |
| 4 | Quiz Delivery & Student Experience | Pending | - |
| 5 | Anti-Cheating & Randomization | Pending | - |
| 6 | Grading & Analytics | Pending | - |
| 7 | Google Classroom Integration | Pending | - |
| 8 | Dual-Tier AI & Polish | Pending | - |

## Performance Metrics

**Session Stats:**
- Plans completed: 1 (03-01)
- Tasks completed: 3 (combined into 2 commits)
- Duration: 8 min

**Cumulative Stats:**
- Total phases: 8 (+ 2.1 sub-phase)
- Plans completed: 16/36+ (approximate)

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

### Technical Stack

- **Framework:** Next.js 16.1.4 + TypeScript 5 + React 19.2.3
- **Database:** PostgreSQL + Prisma 7.3.0 with PrismaPg adapter + pgvector
- **AI:** OpenAI via Vercel AI SDK + ollama-ai-provider@1.2.0
- **Background Jobs:** Inngest 3.49.3
- **Structured Output:** Zod 3.25.76 for AI schema validation

### Lessons Learned

- AI provider version incompatibility: ollama uses V1, @ai-sdk/openai uses V3 - use any type
- Ollama provider uses textEmbeddingModel not embeddingModel method
- Prisma Json type requires undefined not null for nullable fields
- Prisma schema validation requires all related models to exist before validation passes (forward references fail)

## Session Continuity

### What Just Happened

Completed Phase 3 Plan 01 (Quiz Workflow Models):
- Quiz, QuizQuestion, QuizAttempt, QuestionAnswer Prisma models
- TypeScript discriminated union types for 6 question types
- Zod validation schemas for question options and answers
- Teacher workflow fields (status, teacherPreviewedAt for CONT-06)

### What Happens Next

Phase 3 Plan 02: Quiz Creation API
- CRUD endpoints for quiz creation
- Question selection and ordering
- Quiz settings (time limit, shuffle, etc.)

Remaining Phase 3 Plans:
- 03-02: Quiz Creation API
- 03-03: Teacher Preview/Take Quiz
- 03-04: Question Editing
- 03-05: Question Bank/Reuse
- 03-06 through 03-09: Additional workflow features

---

*State captured: 2026-01-26*
*Next command: /gsd:execute-phase 03 plan 02*

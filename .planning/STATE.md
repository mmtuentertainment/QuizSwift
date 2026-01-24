# Project State: QuizSwift

**Last Updated:** 2026-01-23
**Session:** Phase 2 COMPLETE - AI question extraction pipeline

## Project Reference

**Core Value:** 100% factual accuracy - every question extracted from source material, never generated

**Current Focus:** Phase 2 - Content & AI Extraction (COMPLETE)

## Current Position

**Phase:** 2 of 8 - Content & AI Extraction (COMPLETE)
**Plan:** 4 of 4 complete
**Status:** Phase complete
**Last activity:** 2026-01-23 - Completed 02-04-PLAN.md (AI question extraction)

**Progress:**
Phase 1: 100% (5/5 plans) [========================================]
Phase 2: 100% (4/4 plans) [========================================]
Overall: 28%              [==================                      ]

**Phases Overview:**
| Phase | Name | Status | Requirements |
|-------|------|--------|--------------|
| 1 | Foundation & Compliance | COMPLETE | 6 |
| 2 | Content & AI Extraction | COMPLETE | 5 |
| 3 | Question Bank & Teacher Workflow | Pending | 10 |
| 4 | Quiz Delivery & Student Experience | Pending | 5 |
| 5 | Anti-Cheating & Randomization | Pending | 2 |
| 6 | Grading & Analytics | Pending | 7 |
| 7 | Google Classroom Integration | Pending | 7 |
| 8 | Dual-Tier AI & Polish | Pending | 5 |

## Performance Metrics

**Session Stats:**
- Plans completed: 4 (02-01, 02-02, 02-03, 02-04)
- Tasks completed: 10
- Blockers resolved: 6

**Cumulative Stats:**
- Total phases: 8
- Total requirements: 47
- Requirements completed: 6 (AUTH-01, AUTH-04, PLAT-01, PLAT-02, PLAT-03, PLAT-04)

## Accumulated Context

### Key Decisions

| Decision | Rationale | Phase |
|----------|-----------|-------|
| Compliance-first architecture | COPPA/FERPA not retrofittable, privacy-by-design required | 1 |
| Extraction-only AI (no generation) | Core differentiator, eliminates hallucination risk | 2 |
| Any type for AI models | Ollama V1 and OpenAI V3 provider versions incompatible | 2-04 |
| Grounding thresholds 0.85/0.75 | Balances accuracy vs recall for verification | 2-04 |
| Flag-not-reject pattern | ALL questions stored, flagged ones have flagReason | 2-04 |

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

## Session Continuity

### What Just Happened

Completed Phase 2 Plan 4 (02-04-PLAN.md):
- Installed ollama-ai-provider and zod packages
- Created dual-tier AI provider configuration
- Built structured question extraction with Zod schema
- Implemented grounding verification using vector similarity
- Created Inngest extraction pipeline with flag-not-reject behavior

### What Happens Next

1. Begin Phase 3 (Question Bank & Teacher Workflow)
2. Build teacher review UI for extracted questions

---

*State captured: 2026-01-23*
*Next command: Begin Phase 3 research or planning*

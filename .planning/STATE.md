# Project State: QuizSwift

**Last Updated:** 2026-01-25
**Session:** Phase 2.1 Complete - Ready for Phase 3

## Project Reference

**Core Value:** 100% factual accuracy - every question extracted from source material, never generated

**Current Focus:** Phase 3 - Question Bank & Teacher Workflow (NEXT)

## Current Position

**Phase:** 2.1 of 8 - Intelligent Question Curation
**Plan:** 6 of 6 complete
**Status:** COMPLETE
**Last activity:** 2026-01-25 - Completed 02.1-06-PLAN.md (Teacher curation UI)

**Progress:**
Phase 1: 100% (5/5 plans)   [========================================]
Phase 2: 100% (4/4 plans)   [========================================]
Phase 2.1: 100% (6/6 plans) [========================================]
Overall: 42%                [==========================              ]

**Phases Overview:**
| Phase | Name | Status | Requirements |
|-------|------|--------|--------------|
| 1 | Foundation & Compliance | COMPLETE | 6 |
| 2 | Content & AI Extraction | COMPLETE | 5 |
| 2.1 | Intelligent Question Curation | COMPLETE | 5 |
| 3 | Question Bank & Teacher Workflow | Pending | 10 |
| 4 | Quiz Delivery & Student Experience | Pending | 5 |
| 5 | Anti-Cheating & Randomization | Pending | 2 |
| 6 | Grading & Analytics | Pending | 7 |
| 7 | Google Classroom Integration | Pending | 7 |
| 8 | Dual-Tier AI & Polish | Pending | 5 |

## Performance Metrics

**Session Stats:**
- Plans completed: 6 (02.1-01 through 02.1-06)
- Tasks completed: 18+
- Blockers resolved: 3 (document page display, star rating, preview UX)

**Cumulative Stats:**
- Total phases: 8 (+ 2.1 sub-phase)
- Total requirements: 52
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
| 5-pass sequential AI pipeline | Each pass builds on previous for holistic understanding | 2.1-03 |
| 2x question generation | Generate double for selection flexibility | 2.1-03 |
| Separate CuratedQuestion model | Parallel systems during transition without data migration | 2.1-04 |
| Event-based routing | pdf/curation.ready vs pdf/processing.complete for clean separation | 2.1-04 |

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

Completed Phase 2.1 (all 6 plans):
- 02.1-01: Schema updates and question count input
- 02.1-02: Zod schemas for 5-pass reasoning pipeline
- 02.1-03: 5-pass reasoning pipeline implementation
- 02.1-04: Inngest curation job with event routing
- 02.1-05: Show-your-work canvas with tldraw + KaTeX
- 02.1-06: Teacher curation UI with selection persistence

Bug fixes applied:
- Document page now displays curated questions correctly
- Star rating calculation fixed (0-5 scale)
- Removed dead-end preview, clean stats + CTA approach

### What Happens Next

Phase 3: Question Bank & Teacher Workflow
- Quiz creation from selected questions
- Teacher preview/take quiz workflow
- Question editing before publish
- Question bank for reuse

---

*State captured: 2026-01-25*
*Next command: /gsd:plan-phase 3 or /gsd:discuss-phase 3*
